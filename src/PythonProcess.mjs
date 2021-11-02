import Process from "./Process.mjs";
import { loadPyodide } from "./pyodide/pyodide.mjs";
import createPyodideModule from "./pyodide/pyodide.asm.mjs";

function unique(arr) {
    return arr.filter((v, i) => {
        return arr.indexOf(v) === i;
    });
}

function patch_process_run(python_process) {
    const run = async (...args) => {
        const [argv, opts = {}] = args.map(a => a.toJs ? a.toJs() : a);
        if (opts.env) opts.env = opts.env.toJs();
        opts.cwd = opts.cwd || python_process.FS.cwd();
        const result = await python_process.onrunprocess(argv, opts);
        if (opts.stdout && opts.stdout.type == "_io.TextIOWrapper" && opts.stdout.name) {
            python_process.FS.writeFile(opts.stdout.name, result.stdout);
        }
        if (opts.stderr && opts.stderr.type == "_io.TextIOWrapper" && opts.stderr.name) {
            python_process.FS.writeFile(opts.stderr.name, result.stderr);
        }
        return result;
    }
    python_process._python.globals.get("subprocess").run = (...args) => run(...args);
    python_process._python.globals.get("subprocess").run.sync = true;

    python_process._python.globals.get("subprocess").Popen_impl = async (...args) => {
        const { stdout, stderr, returncode } = await run(...args);
        return {
            poll: () => true,
            communicate: () => [{decode: () => stdout}, {decode: () => stderr}],
            wait: () => returncode,
            returncode,
        }
    }
    python_process._python.globals.get("subprocess").Popen_impl.sync = true;

    python_process._python.runPython(`
        class Popen(object):
            js = None;
            returncode = 0;
            def __init__(self, *args, **kwargs):
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

    constructor(FS, pyodideOpts) {
        this._promise = (async () => {
            const wasm = FS.readFile("/wasm/pyodide.asm.wasm");
            const indexURL = (new URL("./pyodide/", import.meta.url)).pathname;
            const Module = {
                preInit: () => {
                    console.log(Module.FS);
                    Module.FS.ErrnoError = FS.FS.ErrnoError;
                    Module.FS.genericErrors = FS.FS.genericErrors;
                    Module.FS.mkdirTree("/lib");
                    // Use FS's PROXYFS rather than Module.FS's since Pyodide uses an older version
                    // of Emscripten, with a bug in PROXYFS. See:
                    // https://github.com/emscripten-core/emscripten/issues/12367
                    Module.FS.mount(FS.FS.filesystems.PROXYFS, { root: "/lib", fs: FS.FS }, "/lib");
                },
                wasmBinary: new Uint8Array(wasm),
            };
            this._python = await loadPyodide(createPyodideModule, {
                fullStdLib: false,
                ...pyodideOpts,
                indexURL,
                stdout: (...args) => this.onprint(...args),
                stderr: (...args) => this.onprintErr(...args),
            }, {
                preInit: (...args) => {
                    console.log(args);
                },
                noInitialRun: true,
                wasmBinary: new Uint8Array(wasm),
            });
            this._python.runPython(`import sys`);
            this._python.runPython(`import os`);
            this._python.runPython(`import subprocess`);
            patch_process_run(this);
            
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

    constructor(FS, pyodideOpts = {}) {
        const conf = {};
        super(conf);
        this._promise = (async () => {
            this._pyodide = await new Pyodide(FS, pyodideOpts);
            this._pyodide.onrunprocess = (...args) => this.onrunprocess(...args);
            conf.setFS(this._pyodide.FS);
            
            delete this.then;
            return this;
        })();

        this.then = (...args) => this._promise.then(...args);
    }

    onrunprocess = () => ({ returncode: 1, stdout: "", stderr: "Not implemented" });

    async exec(args, opts) {
        if ((typeof args) === "string") args = args.split(/ +/g);

        const { onprint, onprintErr } = this._pyodide;

        const stdout = [];
        const stderr = [];

        this._pyodide.onprint = opts.print || ((...args) => stdout.push(...args));
        this._pyodide.onprintErr = opts.printErr || ((...args) => stderr.push(...args));

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
                try:
                    sys.argv = ${JSON.stringify(args)};
                    __name__ = '__main__';
                    exec(open(sys.argv[0]).read());
                except SystemExit as err:
                    if err.code == 0:
                        pass;
                    else:
                        raise;
                `);
            return {
                returncode: 0,
                stdout: stdout.join(""),
                stderr: stderr.join(""),
            }
        } catch (err) {
            return {
                returncode: 1,
                stdout: stdout.join(""),
                stderr: stderr.join("") + "\n\n" + err,
            }
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