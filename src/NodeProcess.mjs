import Process from "./Process.mjs";

import FileSystem from "./FileSystem.mjs";

function unique(arr) {
    return arr.filter((v, i) => {
        return arr.indexOf(v) === i;
    });
}

export default class NodeProcess extends Process {
    constructor(opts_) {
        const { FS, ...opts } = opts_;
        // This is not an Emscripten based process.
        // Create a simple Emscripten base process to use its FS.
        const fs = new FileSystem({ FS });
        super({ ...opts, FS: fs.then((p) => p.FS) });
    }

    async exec(args, opts = {}) {
        if ((typeof args) === "string") args = args.split(/ +/g);

        const stdout = [];
        const stderr = [];

        const print = (...args) => {
            this.onprint(...args);
            opts.print && opts.print(...args);
            stdout.push(...args);
        };
        const printErr = (...args) => {
            this.onprintErr(...args);
            opts.printErr && opts.printErr(...args);
            stderr.push(...args);
        };

        // The following code is VERY VERY hacky, I'm sorry.

        // Create a require type function. We read the input file and then kind of `eval` it using `Function`.
        const require = (file) => {
            const __filename = require.resolve(file);
            const __dirname = __filename.split("/").slice(0,-1).join("/");

            if (require.cache.has(__filename || file)) return require.cache.get(__filename || file);

            if (!__filename) throw new Error(`File not found ${JSON.stringify(file)}`);

            const module = { exports: {} };
            const exports = module.exports;

            const process = require.cache.has("process") && require("process");
            const console = require.cache.has("console") && require("console");

            // Create a Proxy for a global object. Combined with using "with" we can capture all accesses that would otherwise go to globalThis.
            const global = new Proxy({}, {
                has: () => true,
                get: (o, k) => k in o ? o[k] : globalThis[k],
                set: (o, k, v) => { o[k] = v; return true; },
            });

            // Some objects can live in the "global" scope without being explicitly part of globalThis, for example, named function.
            // Because of this, we need to very hackly go through all these objects, and assign them to the global proxy.
            // Since we don't parse the JS we run we don't know the identifier of these objects, so we try to assign everything that looks like an identifier.
            // However, we shouldn't avoid keywords since those are not runtime errors we can try catch, but rather syntax errors.
            const keywords = [
                "abstract","arguments","await","boolean","break","byte","case","catch","char","class","const","continue","debugger","default","delete",
                "do","double","else","enum","eval","export","extends","false","final","finally","float","for","function","goto","if","implements",
                "import","in","instanceof","int","interface","let","long","native","new","null","package","private","protected","public","return",
                "short","static","super","switch","synchronized","this","throw","throws","transient","true","try","typeof","var","void","volatile",
                "while","with","yield"
            ];

            // Do eval, but using "Function", and with the hacky global scope.
            const safe_eval = (code) => {
                // Eval does return a value, but the conditions on which a value is returned are tricky to identify.
                // We try to check if the code is an expression, and if it is, then we return it.
                // This is because in lots of places Emscripten does things like `x = eval("42")` to parse settings and other things.
                try {
                    let expr = code.trim();
                    if (expr.endsWith(";")) {
                        expr = expr.slice(0, -1);
                    }
                    Function(`return (
                        ${expr}
                    )`);
                    code = `return (
                        ${expr}
                    )`;
                } catch (err) {
                    // it's not a simple expression
                }

                // Get a list of all possible identifiers we will try to store in the global scope.
                let words = unique(code.match(/\b[_A-Za-z]\w*/g) || []);
                const hash = "_" + Math.random().toString(36).substr(2);
                const f = Function(`
                    return (global) => {
                        try {
                            with (global) {
                                global.__original = global.__original || {
                                    require: require,
                                };
                                global.${hash} = {
                                    restore: restore${hash},
                                    eval: global.eval,
                                    require: global.require,
                                    __dirname: __dirname,
                                };
                                var eval = (code) => {
                                    // Before evaling new code, we need to "commit" all identifiers we can to the global scope
                                    // This is because the newly eval-ed code might use some of those identifiers
                                    global.${hash}.restore();
                                    return global.${hash}.eval(code);
                                }
                                var require = (file) => {
                                    const search_path = global.__original.require.search_path;
                                    try {
                                        global.__original.require.search_path = [global.${hash}.__dirname];
                                        return global.__original.require(file);
                                    } finally {
                                        global.__original.require.search_path = search_path;
                                    }
                                }
                                ${code}
                                function restore${hash}() {
                                    // This is not pretty, I know. But it seems to work!
                                    ${words
                                        .filter(w => !keywords.includes(w))
                                        .map(w => `try { global.${w} = ${w} || global.${w}; } catch (e) {};`)
                                        .join("\n")}
                                }
                            }
                        } finally {
                            // Also "commit" all identifiers when we finish evaluating the code
                            global.${hash}.restore();
                            global.eval = global.${hash}.eval;
                            global.require = global.${hash}.require;
                        }
                    }
                `)();
                return f(global);
            }

            // We are poorly emulating a nodejs environment.
            // Some global variables are expected to exist.
            // Some other global variables are expected to NOT exist (e.g., window)
            // Some variables are supposed to exist, but Emscripten and its generated code can live without them (e.g., setTimeout)
            // In the case of setTimout, the code takes a different code path that's more suited for us.
            Object.assign(global, { __filename, __dirname, require, module, exports, process, console, global }, {
                eval: safe_eval,
                setTimeout: undefined,
                setInterval: undefined,
                window: undefined,
                importScripts: undefined,
                atob: (...args) => globalThis.atob(...args),
                Buffer: {
                    from: (str, encoding) => {
                        if (encoding !== "base64") { throw new Error("not implemented"); }
                        const data = [...atob(str)].map(c => c.charCodeAt(0));
                        const buffer = new ArrayBuffer(data.length);
                        const view = new Uint8Array(buffer);
                        view.set(data, 0);
                        return {
                            buffer,
                            byteOffset: 0,
                            byteLength: buffer.byteLength,
                        };
                    }
                }
            });

            const search_path = require.search_path;
            require.search_path = [__dirname];

            const result = safe_eval(require.read(__filename));
            
            require.search_path = search_path;

            if (module.exports == exports && Object.keys(exports).length == 0) {
                module.exports = result;
            }

            require.cache.set(__filename, module.exports);
            return require.cache.get(__filename);
        };

        require.read = (file) => {
            const content = this.FS.readFile(file, {encoding: "utf8"})
            if (content.startsWith("#!")) {
                return `//${content}`;
            }
            return content;
        }

        require.search_path = [];
        require.resolve = (file) => {
            const analyze = (p, dir = this.cwd) => {
                if (!p.startsWith("/")) p = `${dir}/${p}`;
                let res = this.FS.analyzePath(p);
                return res;
            }
            const test = (p, dir = this.cwd) => {
                const res = analyze(p, dir);
                if (res.exists && res.object.isFolder) {
                    if (analyze("package.json", res.path).exists) {
                        const pkg = JSON.parse(require.read(`${res.path}/package.json`));
                        if (pkg.main) {
                            return test_with_ext(pkg.main || "index.js", res.path);
                        }
                    } else if (analyze("index.js", res.path).exists) {
                        return test("index.js", res.path);
                    }
                }
                return res.exists && !res.object.isFolder && res.path;
            }
            const test_with_ext = (p, dir = this.cwd) => {
                return test(p, dir) || test(`${p}.js`, dir);
            }
            const test_with_node_modules = (p, dir = this.cwd) => {
                return test_with_ext(p, dir) || test_with_ext(p, `${dir}/node_modules`);
            }
            const test_recursive = (p, dir = this.cwd) => {
                let res = test_with_node_modules(p, dir);
                while (!res && dir !== "/") {
                    dir = analyze(dir).parentPath;
                    res = test_with_node_modules(p, dir);
                }
                return res;
            }
            for (let dir of [...require.search_path, this.cwd, "/node"]) {
                const result = test_recursive(file, dir);
                if (result) return result;
            }
            return "";
        };

        require.cache = new Map();

        let cwd = opts.cwd || this.FS.analyzePath(args[1]).parentPath;
        require.cache.set("process", {
            cwd() {
                return cwd;
            },
            argv: args.slice(0),
            stdout: {
                write: print,
                on: function () { return this },
                once: function () { return this },
            },
            stderr: {
                write: printErr,
                on: () => {},
                once: () => {},
            },
            env: opts.env ? (opts.env instanceof Map ? Object.fromEntries([...opts.env]) : opts.env) : {},
            on: function () { return this },
            once: function () { return this },
            exit() {},
            versions: {
                node: "14.15.5"
            },
        });
        require.cache.set("console", {
            log: (...args) => {
                print(args.join(" ") + "\n");
            },
            warn: (...args) => {
                printErr(args.join(" ") + "\n");
            },
            error: (...args) => {
                printErr(args.join(" ") + "\n");
            }
        });
        require.cache.set("assert", (value, message) => {
            if (!value) {
                throw new AssertionError(message || `${value} == true`);
            }
        });
        require.cache.set("fs", {
            existsSync: (path) => {
                return this.FS.analyzePath(path).exists;
            },
            readFileSync: (path) => {
                return this.FS.readFile(path, { encoding: "utf8" });
            },
            writeFileSync: (...args) => {
                this.FS.writeFile(...args);
            },
            createWriteStream: (path, opts = {}) => {
                if (!((("string" === typeof opts) && opts !== "w") || (opts && opts.flags && opts.flags !== "w"))) {
                    this.FS.writeFile(path, "");
                }
                return {
                    write: (str) => {
                        this.FS.writeFile(path, this.FS.readFile(path, {encoding: "utf8"}) + str);
                    },
                    on: function () { return this },
                    once: function () { return this },
                };
            }
        });
        require.cache.set("os", {
            EOL: "\n",
        });
        require.cache.set("child_process", {
            spawn: () => { throw new Error("Not implemented"); },
        });
        require.cache.set("http", {});
        require.cache.set("https", {});
        require.cache.set("url", {});

        if (args[1] === "--version") {
            return this.exec(["node", "-e", "console.log(`v${process.versions.node}`)"]);
        } else if (args[1] === "-e") {
            this.FS.writeFile("/tmp/node_tmp.js", `process.argv = [process.argv[0], ...process.argv.slice(2)]; ${args[2]}`);
            return this.exec([args[0], "/tmp/node_tmp.js", ...args.slice(3)]);
        } else {
            let curr_cwd = this.cwd;
            if (opts.cwd) this.cwd = opts.cwd;
            let returncode = 0;
            try {
                require(args[1]);

                // wait for a new task to give micro-tasks time to resolve
                await new Promise(r => setTimeout(r, 100));
            } catch (err) {
                returncode = 1;
                require("console").error(err.stack);
            } finally {
                this.cwd = curr_cwd;
            }
            return {
                returncode,
                stdout: stdout.join(""),
                stderr: stderr.join(""),
            }
        }
    }
};
