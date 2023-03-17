#!/bin/bash

export PATH="${EMSDK}/upstream/bin:${PATH}"

emcmake cmake -G Ninja -B ./build/ -S ./emception-box/ -Wno-dev -DFETCH_CACHE_DIR=$PWD/.cache -DCMAKE_BUILD_TYPE=MinSizeRel
cmake --build ./build/ -- emception-box package-box

node --input-type=module <<EOF
import EmceptionBox from "./build/emception-box/emception-box.mjs";

for (let i = 0; i < 10; ++i) {
  for (const thisProgram of ["wasm-opt", "python", "clang", "lld", "node", "wasm-as"]) {
    console.log([i, thisProgram]);
    await EmceptionBox({
      thisProgram,
      arguments: [thisProgram === "lld" ? "wasm-ld" : thisProgram, "--version"],
    });
  }
}
process.exit(0);
EOF

node --input-type=module <<EOF
import EmceptionBox from "./build/package-box/package-box.mjs";
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