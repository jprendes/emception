import EmProcess from "./EmProcess.mjs";
import LlvmBoxModule from "./llvm/llvm-box.mjs";

export default class LlvmBoxProcess extends EmProcess {
    constructor(FS) {
        super(LlvmBoxModule, {
            wasmBinary: FS.readFile("/wasm/llvm-box.wasm")
        });
    }
};
