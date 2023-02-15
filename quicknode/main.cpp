#include "quickjs/quickjs-libc.h"
#include "quickjs/quickjs.h"
#include "quickjspp.hpp"

#include <cstdlib>
#include <unistd.h>

#include <filesystem>
#include <string>
#include <iostream>
#include <map>
#include <vector>

namespace fs = std::filesystem;

template <class T>
inline constexpr bool always_false_v = false;

class QuickNode {
  private:
    std::string m_version;
    qjs::Runtime m_runtime;
    qjs::Context m_context;
    std::map<fs::path, qjs::Value> m_require_cache;

  public:
    QuickNode(std::string version)
      : m_version{std::move(version)}
      , m_runtime{}
      , m_context{m_runtime}
      , m_require_cache{}
    {
        m_context.onUnhandledPromiseRejection = [this](qjs::Value exc){
            std::cerr << "Unhandled promise rejection: ";
            dump_exception();
        };
        add_global();
        add_require();
        add_console();
        add_process();
        add_assert();
        add_fs();
        add_path();
    }

    bool execute_jobs() {
        bool success = true;
        while (m_runtime.isJobPending()) {
            try {
                m_runtime.executePendingJob();
            } catch(qjs::exception const & exc) {
                success = false;
                std::cerr << "Unhandled exception: ";
                dump_exception();
            } catch(std::exception const & e) {
                success = false;
                std::cerr << "Unhandled native exception: ";
                std::cerr << e.what() << "\n";
            }
        }
        return success;
    }

    std::string_view version() const {
        return m_version;
    }

    bool eval(const char * code) {
        try {
            m_context.eval(code, "<eval>", JS_EVAL_TYPE_GLOBAL);
            return true;
        } catch(qjs::exception const & exc) {
            std::cerr << "Unhandled exception: ";
            dump_exception();
        } catch(std::exception const & e) {
            std::cerr << "Unhandled native exception: ";
            std::cerr << e.what() << "\n";
        }
        return false;
    }

    bool evalFile(const char * filename) {
        try {
            auto code = readFile(filename);
            m_context.eval(code, filename, JS_EVAL_TYPE_GLOBAL);
            return true;
        } catch(qjs::exception const & exc) {
            std::cerr << "Unhandled exception: ";
            dump_exception();
        } catch(std::exception const & e) {
            std::cerr << "Unhandled native exception: ";
            std::cerr << e.what() << "\n";
        }
        return false;
    }

    qjs::Value global() {
        return m_context.global();
    }

  private:
    void dump_exception() {
        auto exc = m_context.getException();
        std::cerr << (exc.isError() ? "" : "Throw: ") << (std::string)exc << std::endl;
        if((bool)exc["stack"]) {
            std::cerr << (std::string)exc["stack"] << std::endl;
        }
    }

    auto print(std::ostream & o, qjs::rest<std::string> const & args) {
        auto it = args.begin(), end = args.end();
        if (it != end) o << *it;
        while (++it != end) o << " " << *it;
        o << "\n";
        return m_context.newValue(JS_UNDEFINED);
    };

    void add_global() {
        m_context.global()["global"] = m_context.global();
    }

    void add_path() {
        auto path = m_context.newObject();

        path.add("join", [this](qjs::rest<std::string> parts) -> std::string {
            fs::path joined;
            for (auto const & part : parts) {
                joined /= part;
            }
            if (joined.empty()) {
                return ".";
            }
            return fs::weakly_canonical(joined).string();
        });

        path.add("normalize", [this](std::string path) {
            return fs::weakly_canonical(path).string();
        });

        path.add("isAbsolute", [this](std::string path) {
            return fs::path{path}.is_absolute();
        });

        m_require_cache.insert({"path", path});
    }

    void add_fs() {
        auto fs = m_context.newObject();

        fs.add("existsSync", [this](std::string path) {
            return fs::exists(path);
        });
        fs.add("readFileSync", [this](std::string path) {
            auto buf = qjs::detail::readFile(path);
            if (!buf)
                throw std::runtime_error{std::string{"Can't read from file: "} + path};
            return *buf;
        });
        fs.add("writeFileSync", [this](std::string path, std::string content) {
            std::ofstream file{path};
            if (!file)
                throw std::runtime_error{std::string{"Can't write to file: "} + path};
            file << content;
        });

        m_require_cache.insert({"fs", fs});
    }

    void add_assert() {
        auto assert = m_context.newValue([](bool condition, qjs::rest<std::string> args) {
            if (!condition) std::runtime_error("assert failed");
        });
        m_require_cache.insert({"assert", assert});
    }

    void add_console() {
        auto console = m_context.newObject();
        m_context.global()["console"] = console;

        console.add("log", [this](qjs::rest<std::string> args) {
            return print(std::cout, args);
        });
        console.add("error", [this](qjs::rest<std::string> args) {
            return print(std::cerr, args);
        });
        console.add("warn", [this](qjs::rest<std::string> args) {
            return print(std::cerr, args);
        });

        m_require_cache.insert({"console", console});
    }

    void add_process() {
        auto process = m_context.newObject();
        m_context.global()["process"] = process;
        
        process.add("cwd", [](){
            return fs::current_path().string();
        });
        process["argv"] = std::vector<std::string>();
        process.add("exit", [](int status){
            std::exit(status);
        });

        auto env = m_context.newObject();
        process["env"] = env;
        for (char const * const * var = environ; *var; ++var) {
            std::string kv = *var;
            auto eq = kv.find('=');
            if (eq == std::string::npos) {
                env[kv.c_str()] = std::string();
            } else {
                env[kv.substr(0,eq).c_str()] = kv.substr(eq + 1);
            }
        }

        auto versions = m_context.newObject();
        process["versions"] = versions;
        versions["node"] = m_version;

        process["version"] = "v" + m_version;

        auto stdout = m_context.newObject();
        process["stdout"] = stdout;
        stdout.add("write", [this](qjs::rest<std::string> args) {
            return print(std::cout, args);
        });

        auto stderr = m_context.newObject();
        process["stderr"] = stderr;
        stderr.add("write", [this](qjs::rest<std::string> args) {
            return print(std::cerr, args);
        });

        m_require_cache.insert({"process", process});
    }

    std::string readFile(std::string const & file) {
        auto canonical = fs::weakly_canonical(file);
        auto buf = qjs::detail::readFile(canonical);
        if (!buf) throw std::runtime_error("Cannot find module '" + file + "'");
        auto code = std::move(*buf);
        if (!code.empty() && code[0] == '#') code = "//" + code;
        auto dirname = canonical.parent_path().string();
        auto filename = canonical.stem().string() + canonical.extension().string();
        return ""
        "("
            "() => {"
                "const module = { exports: {} };"
                "("
                    "(module, exports, require, __dirname, __filename) => {"
                        + code + "\n"
                    "}"
                ")(module, module.exports, (path) => require(path, \"" + dirname + "\"), \"" + dirname + "\", \"" + filename + "\");"
                "return module;"
            "}"
        ")()";
    }

    void add_require() {
        m_context.global().add("require", [this](std::string file, qjs::rest<std::string> rest){
            fs::path path;
            auto root = fs::current_path();
            if (!rest.empty()) {
                root = fs::path{rest[0]};
            }

            if (m_require_cache.count(file) > 0) {
                return m_require_cache.at(file);
            }

            if (file.substr(0, 1) == "/") {
                path = file;
            } else if (auto p = resolve_impl(file, root); p) {
                path = std::move(*p);
            } else {
                throw std::runtime_error("Cannot find module '" + file + "'");
            }
            
            auto canonical = fs::canonical(path);

            if (m_require_cache.count(canonical) == 0) {
                auto code = readFile(canonical);
                auto mod = m_context.eval(code, canonical.c_str(), JS_EVAL_TYPE_GLOBAL);
                if (!mod) mod = m_context.newObject();
                if (!mod["exports"]) mod["exports"] = m_context.newObject();
                m_require_cache.insert({ canonical, mod });
            }

            auto mod = m_require_cache.at(canonical);
            return (qjs::Value)mod["exports"];
        });
    }

    std::optional<fs::path> resolve_impl(std::string stem, fs::path const & root = fs::current_path(), bool recurse = true) {
        auto path = root / stem;
        if (fs::is_regular_file(path)) return path;
        if (auto p = fs::path{path}.concat(".js"); fs::is_regular_file(p)) return p;
        if (auto p = fs::path{path}.append("index.js"); fs::is_regular_file(p)) return p;
        if (auto p = fs::path{path}.append("package.json"); fs::is_regular_file(p)) {
            try {
                auto content = qjs::detail::readFile(p).value_or("{}");
                auto pkg = m_context.fromJSON(content);
                if ((bool)pkg["main"]) {
                    auto main = (std::string)pkg["main"];
                    if (auto p = fs::path{path}.append(main); fs::is_regular_file(p)) return p;
                    if (auto p = fs::path{path}.append(main).concat(".js"); fs::is_regular_file(p)) return p;
                }
            } catch (...) {
            }
        }
        if (root.filename() != "node_modules") {
            if (auto p = resolve_impl(stem, root / "node_modules", false); p) return p;
        }
        if (auto r = root.parent_path(); recurse && r != root) {
            if (auto p = resolve_impl(stem, r); p) return p;
        }
        return std::nullopt;
    }
};

int main(int argc, char ** argv) {
    bool success = true;
    QuickNode qn{"14.15.5"};

    std::vector<std::string> args(argc);
    for (size_t i = 0; i < args.size(); ++i) {
        args[i] = argv[i];
    }
    qn.global()["process"]["argv"] = args;

    if (argc == 3 && argv[1] == std::string_view{"-e"}) {
        success = success && qn.eval(argv[2]);
    } else if (argc >= 2 && argv[1][0] != '-') {
        success = success && qn.evalFile(argv[1]);
    } else if (argc == 2 && argv[1] == std::string_view{"--version"}) {
        std::cout << "v" << qn.version() << "\n";
        return 0;
    } else {
        std::cerr << "Welcome to QuickNode " << (std::string)qn.global()["process"]["version"] << ".\n";
        std::cerr << "Prompt is not available.\n";
        std::cerr << "\n";
        std::cerr << "Usage: quicknode --version\n";
        std::cerr << "Usage: quicknode -e <code>\n";
        std::cerr << "Usage: quicknode <script>\n";
        return 1;
    }

    success = success && qn.execute_jobs();

    return success ? 0 : 1;
}
