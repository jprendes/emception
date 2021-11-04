import Process from "./Process.mjs";
import { loadPyodide } from "./pyodide/pyodide.mjs";
import createPyodideModule from "./pyodide/pyodide.asm.mjs";
import shareFS from "./SHAREDFS.mjs";

function unique(arr) {
    return arr.filter((v, i) => {
        return arr.indexOf(v) === i;
    });
}

function patch_python(python_process) {
    python_process._python.globals.get("warnings").warn = () => {}

    const run = async (argv, opts = {}) => {
        if (opts.env) opts.env = opts.env.toJs();
        opts.cwd = opts.cwd || python_process.FS.cwd();
        if ("undefined" === typeof opts.stdout) {
            opts.print = (...args) => python_process.onprint(...args);
            opts.printErr = (...args) => python_process.onprintErr(...args);
        }
        const result = await python_process.onrunprocess(argv, opts);
        if (opts.stdout && opts.stdout.type == "_io.TextIOWrapper" && opts.stdout.name) {
            python_process.FS.writeFile(opts.stdout.name, result.stdout);
        }
        if (opts.stderr && opts.stderr.type == "_io.TextIOWrapper" && opts.stderr.name) {
            python_process.FS.writeFile(opts.stderr.name, result.stderr);
        }
        return result;
    }

    python_process._python.globals.get("subprocess").Popen_impl = async (argv, opts = {}) => {
        if (argv.toJs) argv = argv.toJs();
        if (opts.toJs) opts = opts.toJs();
        const { stdout, stderr, returncode } = await run(argv, opts);
        const text_mode = opts.universal_newlines || opts.encoding || opts.errors;
        const outstream = text_mode ? stdout : { decode: () => stdout };
        const errstream = text_mode ? stderr : { decode: () => stderr };
        return {
            poll: () => returncode,
            communicate: (/* input */) => [outstream, errstream],
            wait: () => returncode,
            kill: () => { /* not implemented */ },
            returncode,
        }
    }
    python_process._python.globals.get("subprocess").Popen_impl.sync = true;

    python_process._python.runPython(`
        class Popen(object):
            js = None;
            returncode = 0;
            args = [];
            def __init__(self, *args, **kwargs):
                self.args = args[0];
                self.js = subprocess.Popen_impl(*args, **kwargs);
                self.returncode = self.js.returncode;
            def __enter__(self):
                return self;
            def __exit__(self ,type, value, traceback):
                pass;
            def poll(self, *args, **kwargs):
                return self.js.poll(*args, **kwargs);
            def communicate(self, *args, **kwargs):
                return self.js.communicate(*args, **kwargs);
            def wait(self, *args, **kwargs):
                return self.js.wait(*args, **kwargs);
            def kill(self, *args, **kwargs):
                pass;
        
        subprocess.Popen = Popen;
        `);
}

class Pyodide {
    _python = null;

    constructor(opts) {
        this._promise = (async () => {
            const wasm = opts.FS.readFile("/wasm/pyodide.asm.wasm");
            const Module = {
                preInit: () => {
                    shareFS(opts.FS, Module);
                },
                wasmBinary: new Uint8Array(wasm),
            };
            this._python = await loadPyodide(createPyodideModule, {
                fullStdLib: false,
                stdout: (...args) => this.onprint(...args),
                stderr: (...args) => this.onprintErr(...args),
            }, Module);
            this._python.runPython(`import sys`);
            this._python.runPython(`import os`);
            this._python.runPython(`import subprocess`);
            this._python.runPython(`import warnings`);
            patch_python(this);
            
            delete this.then;
            return this;
        })();

        this.then = (...args) => this._promise.then(...args);
    }

    onrunprocess = () => ({ returncode: 1, stdout: "", stderr: "Not implemented" });
    onprint = (...args) => console.log(...args);
    onprintErr = (...args) => console.error(...args);

    get FS() {
        return this._python.FS;
    }

    get mods() {
        return [...this._python.globals.get("sys").modules];
    }

    set mods(mods) {
        const current = this.mods;
        for (let mod of current) {
            if (!mods.includes(mod)) {
                this._python.globals.get("sys").modules.delete(mod);
            }
        }
        for (let mod of mods) {
            if (!current.includes(mod)) {
                this._python.runPython(`import ${JSON.stringify(mod)}`);
            }
        }
    }

    get path() {
        return this._python.globals.get("sys").path.toJs() || [];
    }

    set path(path = []) {
        this._python.globals.get("sys").path = this._python.toPy(unique(path));
    }

    get env() {
        return new Map([...this._python.globals.get("os").environ.items()].map(e => e.toJs()));
    }

    set env(env) {
        if (!(env instanceof Map)) {
            env = new Map(Object.entries(env));
        }
        this._python.globals.get("os").environ.clear();
        this._python.globals.get("os").environ.update(this._python.toPy(env));
    }

    get globals() {
        return this._python.globals.toJs();
    }

    set globals(globals) {
        if (!(globals instanceof Map)) {
            globals = new Map(Object.entries(globals));
        }
        this._python.globals.clear();
        this._python.globals.update(this._python.toPy(globals));
    }

    eval(code) {
        return this._python.runPython(code);
    }
}

export default class PythonProcess extends Process {
    _pyodide = null;

    constructor(opts_) {
        const { FS, ...opts } = opts_;
        const pyodide = new Pyodide({ FS });
        super({ ...opts, FS: pyodide.then((p) => p.FS) });
        this._pyodide = pyodide;
        pyodide.onrunprocess = (...args) => this.onrunprocess(...args);
    }

    async exec(args, opts) {
        if ((typeof args) === "string") args = args.split(/ +/g);

        const { onprint, onprintErr } = this._pyodide;

        const stdout = [];
        const stderr = [];

        this._pyodide.onprint = (...args) => {
            this.onprint(...args);
            opts.print && opts.print(...args);
            stdout.push(...args);
        };
        this._pyodide.onprintErr = (...args) => {
            this.onprintErr(...args);
            opts.printErr && opts.printErr(...args);
            stderr.push(...args);
        };

        const env = this._pyodide.env;
        const globals = this._pyodide.globals;
        const mods = this._pyodide.mods;
        const path = this._pyodide.path;
        const cwd = this.cwd;
        try {
            if (opts.env) this._pyodide.env = opts.env;
            if (opts.path) this._pyodide.path = [...path, ...opts.path];
            if (opts.cwd) this.cwd = opts.cwd;
            await this._pyodide.eval(`
                import sys
                exit_err = None;
                other_err = None;
                try:
                    sys.argv = ${JSON.stringify(args)};
                    __name__ = '__main__';
                    exec(open(sys.argv[0]).read());
                except SystemExit as err:
                    exit_err = err;
                except:
                    other_err = sys.exc_info()[1];
                `);
            const exit_err = this._pyodide._python.globals.get("exit_err");
            const other_err = this._pyodide._python.globals.get("other_err");
            return {
                returncode: exit_err ? exit_err.code : (other_err ? 42 : ""),
                stdout: stdout.join("\n"),
                stderr: stderr.join("\n") + (other_err ? "\n\n" + other_err.toString() : ""),
            }
        } catch (err) {
            // Exit due to an unexpected exception.
            // Should never happen!
            return {
                returncode: 42,
                stdout: stdout.join("\n"),
                stderr: stderr.join("\n") + "\n\n" + err,
            };
        } finally {
            this.cwd = cwd;
            this._pyodide.path = path;
            this._pyodide.mods = mods;
            this._pyodide.globals = globals;
            this._pyodide.env = env;
            this._pyodide.onprint = onprint;
            this._pyodide.onprintErr = onprintErr;
        }
    }
}
