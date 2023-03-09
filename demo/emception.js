import FileSystem from "emception/FileSystem.mjs";

import LlvmBoxProcess from "emception/LlvmBoxProcess.mjs";
import BinaryenBoxProcess from "emception/BinaryenBoxProcess.mjs";
import Python3Process from "emception/Python3Process.mjs";
import NodeProcess from "emception/QuickNodeProcess.mjs";

import root_pack from "emception/root_pack.mjs";
import lazy_cache from "emception/lazy-cache/index.mjs";

const tools_info = {
    "/usr/bin/clang":                    "llvm-box",
    "/usr/bin/clang++":                  "llvm-box",
    "/usr/bin/llc":                      "llvm-box",
    "/usr/bin/lld":                      "llvm-box",
    "/usr/bin/llvm-ar":                  "llvm-box",
    "/usr/bin/llvm-nm":                  "llvm-box",
    "/usr/bin/llvm-objcopy":             "llvm-box",
    "/usr/bin/wasm-ld":                  "llvm-box",
    "/usr/bin/node":                     "node",
    "/usr/bin/python":                   "python",
    "/usr/bin/wasm-as":                  "binaryen-box",
    "/usr/bin/wasm-ctor-eval":           "binaryen-box",
    "/usr/bin/wasm-emscripten-finalize": "binaryen-box",
    "/usr/bin/wasm-metadce":             "binaryen-box",
    "/usr/bin/wasm-opt":                 "binaryen-box",
    "/usr/bin/wasm-shell":               "binaryen-box",
};

class Emception {
    fileSystem = null;
    tools = {};

    async init() {
        const fileSystem = await new FileSystem();
        this.fileSystem = fileSystem;

        fileSystem.cachedLazyFolder("/emscripten", root_pack[3]);
        fileSystem.cachedLazyFolder("/usr", root_pack[3]);
        fileSystem.cachedLazyFolder("/wasm", root_pack[3]);
        fileSystem.mkdirTree("/working");

        // Populate the emscripten cache
        for (const [relpath, , , url] of lazy_cache) {
            const path = `/emscripten/${relpath.slice(2)}`;
            fileSystem.cachedLazyFile(path, url);
        }

        if (fileSystem.exists("/emscripten/cache/cache.lock")) {
            fileSystem.unlink("/emscripten/cache/cache.lock");
        }

        const processConfig = {
            FS: fileSystem.FS,
            onrunprocess: (...args) => this._run_process(...args),
        };

        const tools = {
            "llvm-box": new LlvmBoxProcess(processConfig),
            "binaryen-box": new BinaryenBoxProcess(processConfig),
            "node": new NodeProcess(processConfig),
            "python": [
                new Python3Process(processConfig),
                new Python3Process(processConfig),
                new Python3Process(processConfig),
            ],
        };
        this.tools = tools;

        for (let tool in tools) {
            tools[tool] = await Promise.all([].concat(tools[tool]));
        }
    }

    onprocessstart = () => {};
    onprocessend = () => {};
    onstdout = () => {};
    onstderr = () => {};

    run(...args) {
        if (this.fileSystem.exists("/emscripten/cache/cache.lock")) {
            this.fileSystem.unlink("/emscripten/cache/cache.lock");
        }
        if (args.length == 1) args = args[0].split(/ +/);
        return this._run_process_impl([
            `/emscripten/${args[0]}.py`,
            ...args.slice(1)
        ], {
            print: (...args) => this.onstdout(...args),
            printErr: (...args) => this.onstderr(...args),
            cwd: "/working",
            path: ["/emscripten"],
        });
    };

    _run_process(argv, opts = {}) {
        this.onprocessstart(argv);
        const result = this._run_process_impl(argv, opts);
        this.onprocessend(result);
        return result;
    }

    _run_process_impl(argv, opts = {}) {
        const emscripten_script = argv[0].match(/^(\/emscripten\/.+?)(?:\.py)?$/)?.[1]
        if (emscripten_script && this.fileSystem.exists(`${emscripten_script}.py`)) {
            argv = [
                "/usr/bin/python",
                "-E",
                `${emscripten_script}.py`,
                ...argv.slice(1)
            ];
        }
  
        const tool_name = tools_info[argv[0]];
        const tool = this.tools[tool_name]?.find(p => !p.running);
        if (!tool) {
            const result = {
                returncode: 1,
                stdout: "",
                stderr: `Emception tool not found: ${JSON.stringify(argv[0])}`,
            };
            return result;
        }
  
        const result = tool.exec(argv, {
            ...opts,
            cwd: opts.cwd || "/",
            path: ["/emscripten"]
        });

        this.fileSystem.push();
        return result;
    };
}

export default Emception;
