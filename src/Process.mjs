export default class Process {
    _fs = null;

    constructor({
        FS,
        onrunprocess = () => ({ returncode: 1, stdout: "", stderr: "Not implemented" }),
        onprint = () => {},
        onprintErr = () => {},
    }) {
        Object.assign(this, { onrunprocess, onprint, onprintErr });
        this._fs = FS;
        if (FS.then) {
            const _promise = FS.then((fs_done) => {
                this._fs = fs_done;
                delete this.then;
                return this;
            });
            this.then = (...args) => _promise.then(...args);
        }
    }

    onrunprocess = () => {};
    onprint = () => {};
    onprintErr = () => {};

    get cwd() {
        return this._fs.cwd();
    }

    set cwd(cwd) {
        this._fs.chdir(cwd);
    }

    get FS() {
        return this._fs;
    }
};
