import EmProcess from "./EmProcess.mjs";
import BrotliModule from "./brotli/brotli.mjs";
import { fetch_buffer_view } from "./utils.js";

const wasmBinary = fetch_buffer_view("./brotli/brotli.wasm");

export default class BrotliProcess extends EmProcess {
    constructor(opts) {
        super(BrotliModule, { ...opts, wasmBinary });
    }
};
