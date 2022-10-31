// Modified version of createLazyFile from Emscripten's FS
// https://github.com/emscripten-core/emscripten/blob/main/src/library_fs.js
export default function createLazyFile(FS, parent, name, datalength, url, canRead, canWrite, onloaded) {
    // Lazy chunked Uint8Array (implements get and length from Uint8Array). Actual getting is abstracted away for eventual reuse.
    /** @constructor */
    function LazyUint8Array() {
        this.lengthKnown = false;
        this.content = null; // Loaded content.
    }
    LazyUint8Array.prototype.cacheLength = function LazyUint8Array_cacheLength() {
        // Function to get a range from the remote URL.
        var doXHR = () => {
            // TODO: Use mozResponseArrayBuffer, responseStream, etc. if available.
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, false);

            // Some hints to the browser that we want binary data.
            xhr.responseType = 'arraybuffer';
            if (xhr.overrideMimeType) {
                xhr.overrideMimeType('text/plain; charset=x-user-defined');
            }

            xhr.send(null);
            if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
            if (xhr.response !== undefined) {
                return new Uint8Array(/** @type{Array<number>} */(xhr.response || []));
            }
            return intArrayFromString(xhr.responseText || '', true);
        };
        this.get = () => {
            if (!this.content) {
                this.content = doXHR();
                if (onloaded && this.content) {
                    onloaded(this.content);
                }
            }
            if (!this.content) throw new Error('doXHR failed!');
            return this.content;
        };

        this._length = datalength;
        this.lengthKnown = true;
    };
    if (typeof XMLHttpRequest === 'undefined') {
        throw 'Cannot do synchronous binary XHRs outside webworkers in modern browsers.';
    }

    var lazyArray = new LazyUint8Array();
    Object.defineProperties(lazyArray, {
        length: {
            get: /** @this{Object} */ function () {
                if (!this.lengthKnown) {
                    this.cacheLength();
                }
                return this._length;
            }
        },
    });

    var properties = { isDevice: false, contents: lazyArray };

    var node = FS.createFile(parent, name, properties, canRead, canWrite);
    node.contents = lazyArray;
    
    // Add a function that defers querying the file size until it is asked the first time.
    Object.defineProperties(node, {
        usedBytes: {
            get: /** @this {FSNode} */ function () { return this.contents.length; }
        }
    });

    // override each stream op with one that tries to force load the lazy file first
    var stream_ops = {};
    var keys = Object.keys(node.stream_ops);
    keys.forEach((key) => {
        var fn = node.stream_ops[key];
        stream_ops[key] = function forceLoadLazyFile() {
            FS.forceLoadFile(node);
            return fn.apply(null, arguments);
        };
    });
    function writeChunks(stream, buffer, offset, length, position) {
        var contents = stream.node.contents;
        if (position >= contents.length)
            return 0;
        var size = Math.min(contents.length - position, length);
        var data = contents.get(); // LazyUint8Array from sync binary XHR
        for (var i = 0; i < size; i++) {
            buffer[offset + i] = data[position + i];
        }
        return size;
    }
    // use a custom read function
    stream_ops.read = (stream, buffer, offset, length, position) => {
        FS.forceLoadFile(node);
        return writeChunks(stream, buffer, offset, length, position)
    };
    // use a custom mmap function
    stream_ops.mmap = (stream, length, position, prot, flags) => {
        FS.forceLoadFile(node);
        var ptr = mmapAlloc(length);
        if (!ptr) {
            const ENOMEM = 48;
            throw new FS.ErrnoError(ENOMEM);
        }
        writeChunks(stream, HEAP8, ptr, length, position);
        return { ptr: ptr, allocated: true };
    };
    node.stream_ops = stream_ops;

    lazyArray.cacheLength();

    return node;
}
