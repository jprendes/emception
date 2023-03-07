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
        this._brotli = await new BrotliProcess({ FS: this.FS, ...opts});
        while (cache.endsWith("/")) {
            cache = cache.slice(0, -1);
        }
        this._cache = cache;
        if (!this.exists(cache)) {
            this.persist(cache);
        }
        await this.pull();
    }

    unpack(...paths) {
        paths.flat().map((path) => {
            if (path.endsWith(".br")) {
                // it's a brotli file, decompress it first
                this._brotli.exec(["brotli", "--decompress", "-o", "/tmp/archive.pack", path], { cwd: "/tmp/" });
                this.exec(["wasm-package", "unpack", "/tmp/archive.pack"], { cwd: "/" });
                this.FS.unlink("/tmp/archive.pack");
            } else {
                this.exec(["wasm-package", "unpack", path], { cwd: "/" });
            }
        });
    }

    cachedLazyFile(path, size, md5, url) {
        const cache = this._cache;

        if (this.exists(path)) {
            this.unlink(path);
        }
        if (this.exists(`${cache}/${md5}`)) {
            const data = this.readFile(`${cache}/${md5}`, {encoding: "binary"});
            this.writeFile(path, data);
        } else {
            const [, dirname = "", basename] = /(.*\/)?([^\/]*)/.exec(path);
            createLazyFile(this.FS, dirname, basename, size, url, true, false, (data) => {
                this.writeFile(`${cache}/${md5}`, data);
                this.push();
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
