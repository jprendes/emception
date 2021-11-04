import EmProcess from "./EmProcess.mjs";
import WasmPackageModule from "./wasm-package/wasm-package.mjs";
import { fetch_buffer, fetch_buffer_view } from "./utils.js";
import BrotliProcess from "./BrotliProcess.mjs";

const wasmBinary = fetch_buffer_view("./wasm-package/wasm-package.wasm");

export default class FileSystem extends EmProcess {
    _brotli = null;
    constructor(opts) {
        super(WasmPackageModule, { ...opts, wasmBinary });
        this._brotli = (async () => new BrotliProcess({ FS: (await this).FS }))();
    }

    async unpack(...urls) {
        return Promise.all(urls.flat().map(async (url) => {
            const buffer = new Uint8Array(await fetch_buffer(url));
            if (url.endsWith(".br")) {
                // it's a brotli file, decompress it
                const brotli = await this._brotli;
                this.FS.writeFile("/tmp/archive.pack.br", buffer);
                brotli.exec(["brotli", "--decompress", "/tmp/archive.pack.br"], { cwd: "/tmp/" });
                this.FS.unlink("/tmp/archive.pack.br");
            } else {
                this.FS.writeFile("/tmp/archive.pack", buffer);
            }
            this.exec(["wasm-package", "unpack", "/tmp/archive.pack"], { cwd: "/" });
            this.FS.unlink("/tmp/archive.pack");
        }));
    }

    persist(path) {
        this.FS.mkdirTree(path);
        this.FS.mount(this.FS.filesystems.IDBFS, {}, path);
    }

    exists(path) {
        return this.analyzePath(path).exists;
    }
    analyzePath(...args) {
        return this.FS.analyzePath(...args)
    }
    mkdirTree(...args) {
        return this.FS.mkdirTree(...args)
    }
    mkdir(...args) {
        return this.FS.mkdir(...args)
    }
    unlink(...args) {
        return this.FS.unlink(...args)
    }
    readFile(...args) {
        return this.FS.readFile(...args)
    }
    writeFile(...args) {
        return this.FS.writeFile(...args)
    }

    pull() {
        return new Promise((resolve, reject) => this.FS.syncfs(true, function (err) {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        }));
    }

    push() {
        new Promise((resolve, reject) => this.FS.syncfs(false, function (err) {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        }));
    }
};
