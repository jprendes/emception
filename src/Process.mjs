export default class Process {
    _fs = null;

    constructor(conf) {
        conf.setFS = (fs) => {
            if ("FS" in fs) {
                this._fs = fs.FS;
            } else {
                this._fs = fs;
            }
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