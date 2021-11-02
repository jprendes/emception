export default class Process {
    _fs = null;

    constructor(fs) {
        this._fs = fs;
        if (fs.then) {
            const _promise = fs.then((fs_done) => {
                this._fs = fs_done;
                delete this.then;
                return this;
            });
            this.then = (...args) => _promise.then(...args);
        }
    }

    get cwd() {
        return this._fs.cwd();
    }

    set cwd(cwd) {
        this._fs.chdir(cwd);
    }

    get FS() {
        return this._fs;
    }

    mount(fs, root, mount = root) {
        if (fs.then) {
            return fs.then((fs_done) => {
                return this.mount(fs_done, root, mount);
            });
        }

        if (this.then) {
            return this.then(() => {
                return this.mount(fs, root, mount);
            });
        }

        if ("FS" in fs) {
            fs = fs.FS;
        }

        if (fs === this._fs) {
            return;
        }

        root = [].concat(root);
        mount = [].concat(mount);

        if (mount.length !== root.length) {
            throw new Error("Invalid mount points");
        }

        // FS error checking checks the error's instanceof FS.ErrnoError
        // We need to make sure that FS.ErrnoError and its instances (FS.genericErrors) are the same across file systems
        this._fs.ErrnoError = fs.ErrnoError;
        this._fs.genericErrors = fs.genericErrors;

        for (let i = 0; i < root.length; i++) {
            this._fs.mkdirTree(mount[i]);
            this._fs.mount(this._fs.filesystems.PROXYFS, { root: root[i], fs }, mount[i]);
        }
    }
};
