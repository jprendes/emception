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
cp $BUILD/llvm/bin/llvm-box.{mjs,wasm} $BUILD/emception/llvm/

mkdir -p $BUILD/emception/binaryen/
cp $BUILD/binaryen/bin/binaryen-box.{mjs,wasm} $BUILD/emception/binaryen/

mkdir -p $BUILD/emception/pyodide/
cp $BUILD/pyodide/* $BUILD/emception/pyodide/

mkdir -p $BUILD/emception/brotli/
cp $BUILD/pyodide/* $BUILD/emception/brotli/

mkdir -p $BUILD/emception/wasm-package/
cp $BUILD/wasm-package/wasm-package.{mjs,wasm} $BUILD/emception/wasm-package/

$SRC/build-packs.sh $BUILD
cp $BUILD/packs/root.pack $BUILD/emception