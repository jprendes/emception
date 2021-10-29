#!/bin/bash

SRC=$(dirname $0)
BUILD="$1"

if [ "$BUILD" == "" ]; then
    BUILD=$(pwd)/build
fi

SRC=$(realpath "$SRC")
BUILD=$(realpath "$BUILD")

mkdir -p $BUILD/emception
mkdir -p $BUILD/packs/emscripten

pushd $BUILD/packs/emscripten
$SRC/make.sh # builds files in the current working directory
$BUILD/tooling/wasm-package pack $BUILD/emception/emscripten.pack.txt $(find emscripten/ | grep -v "__pycache__")
popd
