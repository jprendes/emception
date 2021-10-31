#!/bin/bash

SRC=$(dirname $0)
BUILD="$1"

if [ "$BUILD" == "" ]; then
    BUILD=$(pwd)/build
fi

SRC=$(realpath "$SRC")
BUILD=$(realpath "$BUILD")

mkdir -p $BUILD/packs/wasm

pushd $BUILD/packs/wasm
$SRC/make.sh # builds files in the current working directory
$BUILD/tooling/wasm-package pack $BUILD/packs/wasm/wasm.pack $(find wasm/)
popd
