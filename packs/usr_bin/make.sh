#!/bin/bash

mkdir -p usr/bin

# llvm-box binaries
echo -n "llvm-box;clang-15"                     > usr/bin/clang++
echo -n "llvm-box;clang-15"                     > usr/bin/clang
echo -n "llvm-box;llvm-nm"                      > usr/bin/llvm-nm
echo -n "llvm-box;llvm-ar"                      > usr/bin/llvm-ar
echo -n "llvm-box;llvm-objcopy"                 > usr/bin/llvm-objcopy
echo -n "llvm-box;lld"                          > usr/bin/lld
echo -n "llvm-box;lld"                          > usr/bin/wasm-ld
echo -n "llvm-box;llc"                          > usr/bin/llc

# binaryen-box binaries
echo -n "binaryen-box;wasm-as"                  > usr/bin/wasm-as
echo -n "binaryen-box;wasm-ctor-eval"           > usr/bin/wasm-ctor-eval
echo -n "binaryen-box;wasm-emscripten-finalize" > usr/bin/wasm-emscripten-finalize
echo -n "binaryen-box;wasm-metadce"             > usr/bin/wasm-metadce
echo -n "binaryen-box;wasm-opt"                 > usr/bin/wasm-opt
echo -n "binaryen-box;wasm-shell"               > usr/bin/wasm-shell

# other binaries
echo -n "node"                                  > usr/bin/node
echo -n "python"                                > usr/bin/python
