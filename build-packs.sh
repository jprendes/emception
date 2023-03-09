#!/bin/bash

SRC=$(dirname $0)
BUILD="$1"

if [ "$BUILD" == "" ]; then
    BUILD=$(pwd)/build
fi

SRC=$(realpath "$SRC")
BUILD=$(realpath "$BUILD")

if [ ! -d $BUILD/packs/ ]; then
    mkdir -p $BUILD/packs/
fi

$SRC/packs/emscripten/package.sh $BUILD
$SRC/packs/cpython/package.sh $BUILD
$SRC/packs/wasm/package.sh $BUILD
