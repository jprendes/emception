import EmProcess from "./EmProcess.mjs";
import BinaryenBoxModule from "./binaryen/binaryen-box.mjs";

export default class BinaryenBoxProcess extends EmProcess {
    constructor() {
        super(BinaryenBoxModule, {
            wasmBinary: FS.readFile("/wasm/binaryen-box.wasm")
        });
    }
};
