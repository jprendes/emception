#!/bin/bash

export PATH="${EMSDK}/upstream/bin:${PATH}"

emcmake cmake -G Ninja -B ./build/ -S ./emception-box/ -Wno-dev -DFETCH_CACHE_DIR=$PWD/.cache -DCMAKE_BUILD_TYPE=MinSizeRel
cmake --build ./build/ -- emception-box

node --input-type=module <<EOF
import EmceptionBox from "./build/emception-box/emception-box.mjs";

function callMain(module, args) {
    const argc = args.length;
    const argv = module._malloc((argc + 1) * 4);
    return 0;
    const allocs = [argv];
    for (let i = 0; i < argc; i++) {
        const p = module.allocateUTF8(args[i]);
        module.HEAP32[(argv >> 2) + i] = p;
        allocs.push(p);
    }
    module.HEAP32[(argv >> 2) + argc] = 0;

    try {
        return module._main(argc, argv);
    } finally {
        allocs.forEach(p => module._free(p));
    }
}

for (let i = 0; i < 10; ++i) {
    for (const thisProgram of ["wasm-opt", "python", "clang", "lld", "node", "wasm-as", "tar"]) {
        console.log([i, thisProgram]);
        const module = await EmceptionBox({
            noInitialRun: true,
            noExitRuntime: true,
            print: (line) => console.log(`    ${line}`),
            printErr: (line) => console.log(`    ${line}`),
        });
        const args = [thisProgram === "lld" ? "wasm-ld" : thisProgram === "tar" ? "minitar" : thisProgram, thisProgram === "tar" ? "-h" : "--version"];
        const ret = callMain(module, args);
        console.log(0);
    }
}
process.exit(0);
EOF

node --input-type=module <<EOF
import EmceptionBox from "./build/emception-box/emception-box.mjs";
await EmceptionBox({
  thisProgram: "tar",
  arguments: ["tar", "--help"],
});
EOF


node --input-type=module <<EOF
import EmceptionBox from "./build/emception-box.mjs";
import fs from "fs";
const emception_box = {
  thisProgram: "python",
  arguments: ["python", "-c", "import os; import _emception; _emception.eval('console.log(42)'); print(os.uname());"],
  preInit: (FS, ENV) => {
    // This assumes a manually modified emception-box.mjs so that preInit receives FS and ENV.
    FS.mkdirTree("/usr/local/lib");
    FS.writeFile("/usr/local/lib/python312.zip", fs.readFileSync("build/_deps/cpython-build/pythonstdlib.zip"));
    ENV["PYTHONHOME"]="/usr/local";
  }
};
EmceptionBox(emception_box)
EOF