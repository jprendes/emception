#!/bin/bash

mkdir -p wasm

cp ../../llvm/bin/llvm-box.wasm ./wasm/
cp ../../binaryen/bin/binaryen-box.wasm ./wasm/
cp ../../pyodide/pyodide.asm.wasm ./wasm/
cp ../../pyodide/pyodide.asm.data ./wasm/
