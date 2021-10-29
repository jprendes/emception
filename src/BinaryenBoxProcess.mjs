import EmProcess from "./EmProcess.mjs";
import BinaryenBoxModule from "./binaryen/binaryen-box.mjs";
import { fetch_buffer } from "./utils.js";

const wasm = fetch_buffer("./binaryen/binaryen-box.wasm");

export default class BinaryenBoxProcess extends EmProcess {
    constructor() {
        super(BinaryenBoxModule, wasm.then(wasm => ({
            wasmBinary: new Uint8Array(wasm)
        })));
    }
};
