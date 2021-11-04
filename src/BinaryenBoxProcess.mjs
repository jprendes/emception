import EmProcess from "./EmProcess.mjs";
import BinaryenBoxModule from "./binaryen/binaryen-box.mjs";

export default class BinaryenBoxProcess extends EmProcess {
    constructor(opts) {
        const wasmBinary = opts.FS.readFile("/wasm/binaryen-box.wasm");
        super(BinaryenBoxModule, { ...opts, wasmBinary });
    }
};
