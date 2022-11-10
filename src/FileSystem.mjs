import EmProcess from "./EmProcess.mjs";
import WasmPackageModule from "./wasm-package/wasm-package.mjs";
import { fetch_buffer_view } from "./utils.js";
import createLazyFile from "./createLazyFile.mjs"
import BrotliProcess from "./BrotliProcess.mjs";

const wasmBinary = fetch_buffer_view("./wasm-package/wasm-package.wasm");

export default class FileSystem extends EmProcess {
    _brotli = null;
    _cache = null;

    constructor({ cache = "/cache", ...opts } = {}) {
        super(WasmPackageModule, { ...opts, wasmBinary });
        this._brotli = (async () => new BrotliProcess({ FS: (await this).FS }))();
        this._cache = (async () => {
            while (cache.endsWith("/")) {
                cache = cache.slice(0, -1);
            }
            await this;
            if (this.exists(cache)) return cache;
            this.persist(cache);
            await this.pull();
            return cache;
        })();
    }

    async unpack(...paths) {
        return Promise.all(paths.flat().map(async (path) => {
            const buffer = this.FS.readFile(path, { encoding: "binary" });
            if (path.endsWith(".br")) {
                // it's a brotli file, decompress it
                const brotli = await this._brotli;
                this.FS.writeFile("/tmp/archive.pack.br", buffer);
                await brotli.exec(["brotli", "--decompress", "/tmp/archive.pack.br"], { cwd: "/tmp/" });
                this.FS.unlink("/tmp/archive.pack.br");
            } else {
                this.FS.writeFile("/tmp/archive.pack", buffer);
            }
            await this.exec(["wasm-package", "unpack", "/tmp/archive.pack"], { cwd: "/" });
            this.FS.unlink("/tmp/archive.pack");
        }));
    }

    async cachedLazyFile(path, size, md5, url) {
        const cache = await this._cache;

        if (this.exists(path)) {
            this.unlink(path);
        }
        if (this.exists(`${cache}/${md5}`)) {
            const data = this.readFile(`${cache}/${md5}`, {encoding: "binary"});
            this.writeFile(path, data);
        } else {
            const [, dirname = "", basename] = /(.*\/)?([^\/]*)/.exec(path);
            createLazyFile(this.FS, dirname, basename, size, url, true, false, async (data) => {
                this.writeFile(`${cache}/${md5}`, data);
                await this.push();
            });
        }
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
        return new Promise((resolve, reject) => this.FS.syncfs(false, function (err) {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        }));
    }
};
