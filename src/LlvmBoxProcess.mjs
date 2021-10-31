import EmProcess from "./EmProcess.mjs";
import LlvmBoxModule from "./llvm/llvm-box.mjs";
import { fetch_buffer } from "./utils.js";

const wasm = fetch_buffer("./llvm/llvm-box.wasm");

export default class LlvmBoxProcess extends EmProcess {
    constructor(FS) {
        super(LlvmBoxModule, {
            wasmBinary: FS.readFile("/wasm/llvm-box.wasm")
        });
    }
};
