const ERRNO_CODES = {
    "EPERM": 63, "ENOENT": 44, "ESRCH": 71, "EINTR": 27, "EIO": 29, "ENXIO": 60, "E2BIG": 1, "ENOEXEC": 45, "EBADF": 8, "ECHILD": 12, "EAGAIN": 6, "EWOULDBLOCK": 6, "ENOMEM": 48,
    "EACCES": 2, "EFAULT": 21, "ENOTBLK": 105, "EBUSY": 10, "EEXIST": 20, "EXDEV": 75, "ENODEV": 43, "ENOTDIR": 54, "EISDIR": 31, "EINVAL": 28, "ENFILE": 41, "EMFILE": 33,
    "ENOTTY": 59, "ETXTBSY": 74, "EFBIG": 22, "ENOSPC": 51, "ESPIPE": 70, "EROFS": 69, "EMLINK": 34, "EPIPE": 64, "EDOM": 18, "ERANGE": 68, "ENOMSG": 49, "EIDRM": 24,
    "ECHRNG": 106, "EL2NSYNC": 156, "EL3HLT": 107, "EL3RST": 108, "ELNRNG": 109, "EUNATCH": 110, "ENOCSI": 111, "EL2HLT": 112, "EDEADLK": 16, "ENOLCK": 46, "EBADE": 113,
    "EBADR": 114, "EXFULL": 115, "ENOANO": 104, "EBADRQC": 103, "EBADSLT": 102, "EDEADLOCK": 16, "EBFONT": 101, "ENOSTR": 100, "ENODATA": 116, "ETIME": 117, "ENOSR": 118,
    "ENONET": 119, "ENOPKG": 120, "EREMOTE": 121, "ENOLINK": 47, "EADV": 122, "ESRMNT": 123, "ECOMM": 124, "EPROTO": 65, "EMULTIHOP": 36, "EDOTDOT": 125, "EBADMSG": 9,
    "ENOTUNIQ": 126, "EBADFD": 127, "EREMCHG": 128, "ELIBACC": 129, "ELIBBAD": 130, "ELIBSCN": 131, "ELIBMAX": 132, "ELIBEXEC": 133, "ENOSYS": 52, "ENOTEMPTY": 55,
    "ENAMETOOLONG": 37, "ELOOP": 32, "EOPNOTSUPP": 138, "EPFNOSUPPORT": 139, "ECONNRESET": 15, "ENOBUFS": 42, "EAFNOSUPPORT": 5, "EPROTOTYPE": 67, "ENOTSOCK": 57,
    "ENOPROTOOPT": 50, "ESHUTDOWN": 140, "ECONNREFUSED": 14, "EADDRINUSE": 3, "ECONNABORTED": 13, "ENETUNREACH": 40, "ENETDOWN": 38, "ETIMEDOUT": 73, "EHOSTDOWN": 142,
    "EHOSTUNREACH": 23, "EINPROGRESS": 26, "EALREADY": 7, "EDESTADDRREQ": 17, "EMSGSIZE": 35, "EPROTONOSUPPORT": 66, "ESOCKTNOSUPPORT": 137, "EADDRNOTAVAIL": 4, "ENETRESET": 39,
    "EISCONN": 30, "ENOTCONN": 53, "ETOOMANYREFS": 141, "EUSERS": 136, "EDQUOT": 19, "ESTALE": 72, "ENOTSUP": 138, "ENOMEDIUM": 148, "EILSEQ": 25, "EOVERFLOW": 61,
    "ECANCELED": 11, "ENOTRECOVERABLE": 56, "EOWNERDEAD": 62, "ESTRPIPE": 135
};

const PATH = {
    // Taken from https://github.com/emscripten-core/emscripten/blob/main/src/library_path.js
    normalizeArray: function (parts, allowAboveRoot) {
        // if the path tries to go above the root, `up` ends up > 0
        var up = 0;
        for (var i = parts.length - 1; i >= 0; i--) {
            var last = parts[i];
            if (last === '.') {
                parts.splice(i, 1);
            } else if (last === '..') {
                parts.splice(i, 1);
                up++;
            } else if (up) {
                parts.splice(i, 1);
                up--;
            }
        }
        // if the path is allowed to go above the root, restore leading ..s
        if (allowAboveRoot) {
            for (; up; up--) {
                parts.unshift('..');
            }
        }
        return parts;
    },
    normalize: function (path) {
        var isAbsolute = path.charAt(0) === '/',
            trailingSlash = path.substr(-1) === '/';
        // Normalize the path
        path = PATH.normalizeArray(path.split('/').filter(function (p) {
            return !!p;
        }), !isAbsolute).join('/');
        if (!path && !isAbsolute) {
            path = '.';
        }
        if (path && trailingSlash) {
            path += '/';
        }
        return (isAbsolute ? '/' : '') + path;
    }
};

function getNodePath(node) {
    if (node.parent == node) {
        return node.mount ? node.mount.mountpoint : node.name;
    }
    return getNodePath(node.parent) + "/" + node.name;
};

export default (MAINFS, Module) => {
    const { FS } = Module;

    // Taken from https://github.com/emscripten-core/emscripten/blob/main/src/library.js
    function zeroMemory(address, size) {
        Module.HEAPU8.fill(0, address, address + size)
    }
    function alignMemory(size, alignment) {
        return Math.ceil(size / alignment) * alignment
    }
    function mmapAlloc(size) {
        if (!Module._memalign) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOMEM);
        }
        size = alignMemory(size, 65536);
        var ptr = Module._memalign(65536, size);
        if (!ptr)
            return 0;
        zeroMemory(ptr, size);
        return ptr
    }

    const absolutePath = (path) => {
        if (path.startsWith("/")) {
            path = PATH.normalize(path);
        } else {
            path = PATH.normalize(`${FS.cwd()}/${path}`);
        }
        return path;
    };

    const shouldShare = (path) => {
        path = absolutePath(path);
        return path !== "/proc" && !path.startsWith("/proc/") &&
            path !== "/dev" && !path.startsWith("/dev/");
    };

    // Inspired by https://github.com/emscripten-core/emscripten/blob/main/src/library_noderawfs.js
    let VFS = {
        ...FS
    };

    const SHAREDFS = {
        lookup: function (parent, name) {
            const path = getNodePath(parent) + "/" + name;
            if (!shouldShare(path)) {
                return VFS.lookup(parent, name);
            } else {
                return FS.lookupPath(path);
            }
        },
        lookupPath: function (path, opts) {
            if (!shouldShare(path)) {
                return VFS.lookupPath(path, opts);
            } else {
                return MAINFS.lookupPath(path, opts);
            }
            // let st = MAINFS.lstat(path);
            // var mode = st.mode;
            // return { path: path, id: st.ino, mode: mode, node: { mode: mode } };
        },
        // generic function for all node creation
        mknod: function (path, mode, dev) {
            if (!shouldShare(path)) {
                VFS.mknod(path, mode, dev);
            } else {
                MAINFS.mknod(path, mode, dev);
            }
        },
        mkdir: function (path, mode) {
            if (!shouldShare(path)) {
                VFS.mkdir(path, mode);
            } else {
                MAINFS.mkdir(path, mode);
            }
        },
        symlink: function (oldpath, newpath) {
            if (!shouldShare(newpath)) {
                VFS.symlink(oldpath, newpath);
            } else {
                MAINFS.symlink(oldpath, newpath);
            }
        },
        rename: function (oldpath, newpath) {
            if (shouldShare(oldpath) !== shouldShare(newpath)) {
                throw new FS.ErrnoError(ERRNO_CODES.EXDEV);
            }
            if (!shouldShare(oldpath)) {
                VFS.rename(oldpath, newpath);
            } else {
                MAINFS.rename(oldpath, newpath);
            }
        },
        rmdir: function (path) {
            if (!shouldShare(path)) {
                VFS.rmdir(path);
            } else {
                MAINFS.rmdir(path);
            }
        },
        readdir: function (path) {
            if (!shouldShare(path)) {
                return VFS.readdir(path);
            } else {
                return MAINFS.readdir(path);
            }
        },
        unlink: function (path) {
            if (!shouldShare(path)) {
                VFS.unlink(path);
            } else {
                MAINFS.unlink(path);
            }
        },
        readlink: function (path) {
            if (!shouldShare(path)) {
                return VFS.readlink(path);
            } else {
                return MAINFS.readlink(path);
            }
        },
        stat: function (path, dontFollow) {
            if (!shouldShare(path)) {
                return VFS.stat(path, dontFollow);
            } else {
                return MAINFS.stat(path, dontFollow);
            }
        },
        lstat: function (path) {
            if (!shouldShare(path)) {
                return VFS.lstat(path);
            } else {
                return MAINFS.lstat(path);
            }
        },
        chmod: function (path, mode, dontFollow) {
            if (!shouldShare(path)) {
                VFS.chmod(path, mode, dontFollow);
            } else {
                MAINFS.chmod(path, mode, dontFollow);
            }
        },
        fchmod: function (fd, mode) {
            FS.chmod(FS.getStream(fd).path, mode);
        },
        chown: function (path, uid, gid, dontFollow) {
            if (!shouldShare(path)) {
                VFS.chown(path, uid, gid, dontFollow);
            } else {
                MAINFS.chown(path, uid, gid, dontFollow);
            }
        },
        fchown: function (fd, uid, gid) {
            FS.chown(FS.getStream(fd).path, uid, gid);
        },
        truncate: function (path, len) {
            if (!shouldShare(path)) {
                VFS.truncate(path, len);
            } else {
                MAINFS.truncate(path, len);
            }
        },
        ftruncate: function (fd, len) {
            FS.truncate(FS.getStream(fd).path, len);
        },
        utime: function (path, atime, mtime) {
            if (!shouldShare(path)) {
                VFS.utime(path, atime, mtime);
            } else {
                MAINFS.utime(path, atime, mtime);
            }
        },
        open: function (path, flags, mode, fd_start, fd_end) {
            if (!shouldShare(path)) {
                const stream = VFS.open(path, flags, mode, fd_start, fd_end);
                return stream;
            }
            const mainStream = MAINFS.open(path, flags, mode);
            const fd = FS.nextfd(fd_start, fd_end);
            const stream = {
                fd: fd,
                mainStream: mainStream,
                get position() { return this.mainStream.position; },
                set position(p) { this.mainStream.position = p; },
                get path() { return this.mainStream.path; },
                set path(p) { this.mainStream.path = p; },
                get id() { return this.mainStream.id; },
                set id(p) { this.mainStream.id = p; },
                get flags() { return this.mainStream.flags; },
                set flags(p) { this.mainStream.flags = p; },
                get mode() { return this.mainStream.mode; },
                set mode(p) { this.mainStream.mode = p; },
                get seekable() { return this.mainStream.seekable; },
                set seekable(p) { this.mainStream.seekable = p; },
                node: {
                    ...FS.lookupPath(mainStream.path).node,
                    node_ops: SHAREDFS,
                },
                node_ops: SHAREDFS,
            };
            FS.streams[fd] = stream;
            return stream;
        },
        close: function (stream) {
            if (stream.mainStream) {
                MAINFS.close(stream.mainStream);
                FS.closeStream(stream.fd);
            } else {
                VFS.close(stream);
            }
        },
        llseek: function (stream, offset, whence) {
            if (stream.mainStream) {
                return MAINFS.llseek(stream.mainStream, offset, whence);
            } else {
                return VFS.llseek(stream, offset, whence);
            }
        },
        read: function (stream, buffer, offset, length, position) {
            if (stream.mainStream) {
                return MAINFS.read(stream.mainStream, buffer, offset, length, position);
            } else {
                return VFS.read(stream, buffer, offset, length, position);
            }
        },
        write: function (stream, buffer, offset, length, position) {
            if (stream.mainStream) {
                return MAINFS.write(stream.mainStream, buffer, offset, length, position);
            } else {
                return VFS.write(stream, buffer, offset, length, position);
            }
        },
        allocate: function (stream, offset, length) {
            if (stream.mainStream) {
                return MAINFS.allocate(stream.mainStream, offset, length);
            } else {
                return VFS.allocate(stream, offset, length);
            }
        },
        mmap: function (stream, address, length, position, prot, flags) {
            if (!stream.mainStream) {
                return VFS.mmap(stream, address, length, position, prot, flags);
            }
            if (address !== 0) {
                // We don't currently support location hints for the address of the mapping
                throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
            }
            const ptr = mmapAlloc(length);
            MAINFS.read(stream.mainStream, Module.HEAP8, ptr, length, position);
            return { ptr: ptr, allocated: true };
        },
        msync: function (stream, buffer, offset, length, mmapFlags) {
            if (!stream.mainStream) {
                return VFS.msync(stream, buffer, offset, length, mmapFlags);
            }
            if (mmapFlags & 2/*cDefine['MAP_PRIVATE']*/) {
                // MAP_PRIVATE calls need not to be synced back to underlying fs
                return 0;
            }
            MAINFS.write(stream.mainStream, buffer, 0, length, offset);
            return 0;
        },
        munmap: function (stream) {
            if (stream.mainStream) {
                return MAINFS.munmap(stream.mainStream);
            } else {
                return VFS.munmap(stream);
            }
        },
        ioctl: function (stream, cmd, arg) {
            if (stream.mainStream) {
                return MAINFS.ioctl(stream.mainStream, cmd, arg);
            } else {
                return VFS.ioctl(stream, cmd, arg);
            }
        }
    };

    function _wrapFSError(func) {
        return function () {
            const old_cwd = MAINFS.currentPath;
            try {
                MAINFS.chdir(FS.cwd());
                return func.apply(this, arguments)
            } catch (e) {
                if (!e.errno && !e.code) {
                    throw e;
                }
                throw new FS.ErrnoError(e.errno || ERRNO_CODES[e.code]);
            } finally {
                // Use currentPath rather than chdir to avoid chdir's checks.
                // Thouse checks wouldn't have happened anyway.
                MAINFS.currentPath = old_cwd;
            }
        }
    };

    for (let _key in SHAREDFS) {
        FS[_key] = _wrapFSError(SHAREDFS[_key]);
    }
}
