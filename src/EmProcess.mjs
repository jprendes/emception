import Process from "./Process.mjs";

export default class EmProcess extends Process {
    _module = null;
    _promise = null;
    _memory = null;

    constructor(Module, opts = {}) {
        const conf = {};
        super(conf);
        this._print = (...args) => console.log(...args);
        this._printErr = (...args) => console.warn(...args);
        this._promise = (async () => {
            this._module = await new Module({
                ...(await opts),
                noInitialRun: true,
                noExitRuntime: true,
                print: (...args) => this._print(...args),
                printErr: (...args) => this._printErr(...args),
            });
            conf.setFS(this._module.FS);
            this._memory = Uint8Array.from(this._module.HEAPU8.slice(0, this._module.HEAPU8.length));
            delete this.then;
            return this;
        })();

        this.then = (...args) => this._promise.then(...args);
    }

    exec(args, opts = {}) {
        if ((typeof args) === "string") args = args.split(/ +/g);

        // Clang's driver uses global state, and this might not be the first time we run the module.
        // Reinitialize the memory to its initial state to reset the global state.
        // TODO: Is this safe? Is this missing some other source of state? wasm globals? JS?
        this._module.HEAPU8.fill(0);
        this._module.HEAPU8.set(this._memory);

        // Allocate argv
        const argc = args.length;
        const argv = this._module._malloc((argc + 1) * 4);
        const allocs = [argv];
        for (let i = 0; i < argc; i++) {
            const p = this._module.HEAP32[(argv >> 2) + i] = this._module.allocateUTF8(args[i]);
            allocs.push(p);
        }
        this._module.HEAP32[(argv >> 2) + argc] = 0;

        let returncode = 0;
        const stdout = [];
        const stderr = [];

        this._print = opts.print || ((...args) => stdout.push(...args));
        this._printErr = opts.printErr || ((...args) => stderr.push(...args));

        try {
            if (opts.cwd) this.cwd = opts.cwd;
            returncode = this._module._main(argc, argv);
        } catch (e) {
            if ("status" in e) {
                returncode = e.status;
            } else {
                returncode = -42;
            }
        } finally {
            allocs.forEach(p => this._module._free(p));
        }

        return {
            returncode,
            stdout: stdout.join("\n"),
            stderr: stderr.join("\n"),
        }
    }
};