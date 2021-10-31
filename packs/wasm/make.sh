#!/bin/bash

mkdir -p wasm

cp ../../llvm/bin/llvm-box.wasm ./
cp ../../binaryen/bin/binaryen-box.wasm ./
cp ../../pyodide/pyodide.asm.wasm ./
cp ../../pyodide/pyodide.asm.data ./
