import EmProcess from "./EmProcess.mjs";
import PythonModule from "./cpython/python.mjs";

export default class Python3Process extends EmProcess {
    constructor(opts) {
        const wasmBinary = opts.FS.readFile("/wasm/python.wasm");
        super(PythonModule, { ...opts, wasmBinary });
    }

    async _callMain(argc, argv) {
        return await this._module.ccall(
            "main",
            "number",
            ["number", "number"],
            [argc, argv],
            {async: true}
        );
    }
};
