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

# We do not package pyodide here because that's packaged during the pyodide build
# Make sure it's been built already
if [ ! -f $BUILD/packs/pyodide/pyodide.pack ]; then
    echo "Pyodide should have build it's data file, but it's missing. Did you build pyodide already?"
    exit 1
fi

$SRC/packs/emscripten/package.sh $BUILD
$SRC/packs/node/package.sh $BUILD
$SRC/packs/usr_bin/package.sh $BUILD
$SRC/packs/wasm/package.sh $BUILD
$SRC/packs/working/package.sh $BUILD

cat $BUILD/packs/*/*.pack > $BUILD/packs/root.pack