import EmProcess from "./EmProcess.mjs";
import BrotliModule from "./brotli/brotli.mjs";
import { fetch_buffer } from "./utils.js";

const wasm = fetch_buffer("./brotli/brotli.wasm");

export default class BrotliProcess extends EmProcess {
    constructor() {
        super(BrotliModule, wasm.then(wasm => ({
            wasmBinary: new Uint8Array(wasm)
        })));
    }
};
