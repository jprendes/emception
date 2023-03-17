_Originally discussed in [jprendes/emception#15]_

> Emception now uses upstream CPython instead of Pyodide. Emception is now using
> a build of QuickJS instead of (very) hacky JS code to emulate NodeJS. It
> implements the minimum required libraries to get Emscripten running. Now, the
> high level overview.
>
> Emception is basically Emscripten runningi n the browser. Emscripten entry
> point (at least for the demo) is em++. It's a python script. This script
> invokes other programs (subprocesses). It invokes the follwing programs:
>
> other python scripts clang, lld, and a few other programs from llvm some
> NodeJS scripts wasm-opt, wasm-metadce and a few other programs from binaryen
> The interaction between all these processes is through their standard output,
> and files in the filesystem. The only process that spawn subprocesses (and
> captures their standard output) is python.
>
> To be able to run Emscripten in the browser we need:
>
> all the required llvm and binaryen programs. a python interpreter. NodeJS. Or
> a JS runtime with a subset of NodeJS's libraries. a way to allow python to
> spawn subprocesses and capture their output. a way to share a filesystem
> between all the processes. a way to populate the filesystem with the required
> files (i.e., all the python scripts, NodeJS scripts, all C++ header libraries,
> etc.) The solution to 1 is easy, "just" compile all the llvm and binaryen
> programs to WebAssembly using Emscripten. A detail is that there's a lot of
> shared code between all these programs. To reduce the binary size, it makes
> sense to compile all of them to a unique binary similar to what busybox does.
> That's what llvm-box and binaryen-box do. There are a few technical
> considerations to do that, but that's not relevant now.
>
> The solution to 2 is easy as well given all the upstream effort of Pyodide
> before, and more recently of CPython to add WebAssembly as a compilation
> target using Emscripten.
>
> The solution to 3 is wasy as well using QuickJS. The main challenge is to
> identify the minimum subset of NodeJS libraries required to run the the
> Emscripten JS scripts. That's what quicknode does.
>
> Point 4 is a bit more challenging. Emscripten doesn't try to emulate a
> multiprocess environment. This means that the system calls to start a
> subprocess (popen) is not available. In turn, that means that the python
> interpreter (which is, like everything else, compiled using Emscripten), won't
> be able to start sucpeocesses. To workaround this, Emception adds a new native
> module to CPython to execute JavaScript code. Then a sitecustomize.py script
> patches python's Popen class to execute JavaSript code to start a subprocess
> instead of using the popen system call as it would normally do. To run a new
> process, the javascript code basically checks based on the command line what
> program needs to be run, and executes the corresponding WebAssembly module. It
> also does a bit of set up, like populating argc anrd argv, and populating the
> environment variables inherited from the parent process.
>
> Point 5 is a problem because each Emscripten module (i.e., the python
> interpreter, quicknode, llvm-box, etc) will execute using it's own virtual
> file system. For all of this to work, they need to share the same file system.
> The solution is to run an initial module, to create a virtual file system. All
> other modules an Emscripten JavaScript library (emlib/fsroot.js) to mount the
> initial module's file system as their root file system.
>
> Finally, point 6 is where all the packs come in. You can think of a pack as a
> homebrew zip file (more like a tar file). That's what wasm-package does. It
> "packs" the files in the host, and then it "unpacks" them in the browser. In
> the host it creates a package containing all the files and directories need to
> run Emception, mainly:
>
> All of Emscripten's python and JS scripts All of python's standard library
> files To save time when compiling, Emception also shipt the precompiled
> standard libraries. That's the Emscripten cache you mentioned. But the cache
> takes a lot of space, and most likely you won't need every single cached
> library. To work around that problem Emception uses a lazy cache. The files
> are only downloaded when they are needed. The lazy cache code is based on
> Emscripten's own createLazyFile function.
>
> I think the working and usr_bin packages could be removed. The usr_bin package
> just links paths with argumens for the "boxed" programs, but that can be
> easily embedded in the JavaScript glue code. The only remaining package is the
> wasm package, and the reason for that is compression.
>
> There's a lot of cping around when creating the packages. That can certainly
> be improved. The currend design is that the make.sh scripts create the folder
> structure that should go in the package. The package.sh wraps make.sh, and
> also create the package using wasm-package.
>
> Emception uses brotli for compression. Brotli is a compression algorithm (like
> zip), but brotli can achieve much higher compression ratio in this case.
> Emception is hosted in github pages. Unfortunately github pages doesn't
> support brotli precompresses assets. Because of that, Emception tries to ship
> as many assets as a brotli compressed package file. This inclues the
> WebAssembly files, and that's why the wasm package exists.
>
> Finally, since the brotli comrpession doesn't come from the webserver, the
> native decompressor in your browser won't decomrpess the package. That's why
> Emception ships a brotli decompressor.
>
> All of this is brought together in the demo project.
>
> Another point is that Emception executes in a blocking manner, and the
> execution can take a little while. To avoid blocking the main browser thread,
> it runs the code in a WebWorker, and uses comlink to simplify the interaction
> with it.
>
> I hope that was helpful and answered your questions! I'll keep the issue open
> in case you have further questions.

[jprendes/emception#15]: https://github.com/jprendes/emception/issues/15
