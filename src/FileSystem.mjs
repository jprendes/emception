import EmProcess from "./EmProcess.mjs";
import WasmPackageModule from "./wasm-package/wasm-package.mjs";
import createLazyFile from "./createLazyFile.mjs"
import BrotliProcess from "./BrotliProcess.mjs";

export default class FileSystem extends EmProcess {
    _brotli = null;
    _cache = null;

    constructor({ cache = "/cache", ...opts } = {}) {
        super(WasmPackageModule, { ...opts });
        this.init.push(this.#init.bind(this, cache, opts));
    }

    async #init(cache, opts) {
        this._brotli = new BrotliProcess({ FS: this.FS, ...opts});
        this._cache = (async () => {
            while (cache.endsWith("/")) {
                cache = cache.slice(0, -1);
            }
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

    #pull = null;
    #pullRequested = false;
    pull() {
        if (this.#pull) {
            this.#pullRequested = true;
            return this.#pull;
        }
        this.#pullRequested = false;
        this.#pull = new Promise((resolve, reject) => this.FS.syncfs(true, (err) => {
            this.#pull = null;
            if (this.#pullRequested) this.pull();
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        }));
        return this.#pull;
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
