#!/bin/bash

SRC=$(dirname $0)
BUILD="$2"
PYODIDE_SRC="$1"

if [ "$PYODIDE_SRC" == "" ]; then
    echo "Usage: package.sh /path/to/source/of/pyodide/ /path/to/build"
fi

if [ "$BUILD" == "" ]; then
    BUILD=$(pwd)/build
fi

SRC=$(realpath "$SRC")
BUILD=$(realpath "$BUILD")
PYODIDE_SRC=$(realpath "$PYODIDE_SRC")

mkdir -p $BUILD/packs/pyodide

pushd $BUILD/packs/pyodide
$SRC/make.sh "$PYODIDE_SRC" # builds files in the current working directory
$BUILD/tooling/wasm-package pack $BUILD/packs/pyodide/pyodide.pack $(find lib/)
popd
