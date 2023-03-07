// Modified version of createLazyFile from Emscripten's FS
// https://github.com/emscripten-core/emscripten/blob/main/src/library_fs.js

export function doXhr(url) {
    // TODO: Use mozResponseArrayBuffer, responseStream, etc. if available.
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url, false);

    // Some hints to the browser that we want binary data.
    xhr.responseType = "arraybuffer";
    xhr.overrideMimeType?.("text/plain; charset=x-user-defined");

    xhr.send(null);
    if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) {
        throw new Error(`Couldn't load ${url}. Status: ${xhr.status}`);
    }
    if (!xhr.response) {
        throw new Error(`Couldn't load ${url}. No xhr response.`);
    }
    return new Uint8Array(xhr.response);
}

if (!globalThis.XMLHttpRequest) {
    throw new Error("Cannot do synchronous binary XHRs outside webworkers in modern browsers.");
}

export default function createLazyFile(FS, path, mode, loadFnc) {
    if (FS.analyzePath(path).exists) return;

    let loaded = false;

    var node = FS.create(path, mode);
    let contents = new Uint8Array(0);
    let usedBytes = 0;

    const ensure_content = () =>  {
        if (loaded) return;
        try {
            loaded = true;
            loadFnc();
        } catch (e) {
            loaded = false;
            throw e;
        }
    };

    Object.defineProperties(node, {
        contents: {
            get: () => {
                ensure_content();
                return contents;
            },
            set: (val) => {
                ensure_content();
                contents = val;
            },
        },
        usedBytes: {
            get: () => {
                ensure_content();
                return usedBytes;
            },
            set: (val) => {
                ensure_content();
                usedBytes = val;
            },
        }
    });

    return node;
}
