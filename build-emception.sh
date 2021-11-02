#!/bin/bash

SRC=$(dirname $0)
BUILD="$1"

if [ "$BUILD" == "" ]; then
    BUILD=$(pwd)/build
fi

SRC=$(realpath "$SRC")
BUILD=$(realpath "$BUILD")

if [ ! -d $BUILD/emception/ ]; then
    mkdir -p $BUILD/emception/
fi

cp $SRC/src/* $BUILD/emception/
cp $SRC/src/* $BUILD/emception/

mkdir -p $BUILD/emception/llvm/
cp $BUILD/llvm/bin/llvm-box.mjs $BUILD/emception/llvm/

mkdir -p $BUILD/emception/binaryen/
cp $BUILD/binaryen/bin/binaryen-box.mjs $BUILD/emception/binaryen/

mkdir -p $BUILD/emception/pyodide/
cp $BUILD/pyodide/{pyodide.asm.mjs,pyodide.mjs} $BUILD/emception/pyodide/

mkdir -p $BUILD/emception/brotli/
cp $BUILD/brotli/brotli.{mjs,wasm} $BUILD/emception/brotli/

mkdir -p $BUILD/emception/wasm-package/
cp $BUILD/wasm-package/wasm-package.{mjs,wasm} $BUILD/emception/wasm-package/

$SRC/build-packs.sh $BUILD
brotli --best --keep $BUILD/packs/root.pack
cp $BUILD/packs/root.pack.br $BUILD/emception/