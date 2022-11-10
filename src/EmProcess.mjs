import Process from "./Process.mjs";
import shareFS from "./SHAREDFS.mjs";

export default class EmProcess extends Process {
    _module = null;
    _memory = null;

    _print = (...args) => console.log(...args);
    _printErr = (...args) => console.warn(...args);

    constructor(Module, opts_ = {}) {
        const { FS, ...opts } = opts_;
        super({
            ...opts,
            FS: (async () => {
                const _mod = {
                    ...opts,
                    wasmBinary: await opts.wasmBinary,
                    noInitialRun: true,
                    noExitRuntime: true,
                    print: (...args) => this._print(...args),
                    printErr: (...args) => this._printErr(...args),
                    preInit: () => FS && shareFS(FS, _mod)
                };
                const _module = await new Module(_mod);
                this._module = _module;
                this._memory = Uint8Array.from(this._module.HEAPU8.slice(0, this._module.HEAPU8.length));
                return this._module.FS;
            })()
        });
    }

    _callMain(argc, argv) {
        return this._module._main(argc, argv);
    }

    async exec(args, opts = {}) {
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

        this._print = (...args) => {
            this.onprint(...args);
            opts.print && opts.print(...args);
            stdout.push(...args);
        };
        this._printErr = (...args) => {
            this.onprintErr(...args);
            opts.printErr && opts.printErr(...args);
            stderr.push(...args);
        };

        try {
            if (opts.cwd) this.cwd = opts.cwd;
            returncode = await this._callMain(argc, argv);
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
