#!/bin/bash

SRC=$(dirname $0)
BUILD="$1"

if [ "$BUILD" == "" ]; then
    BUILD=$(pwd)/build
fi

SRC=$(realpath "$SRC")
BUILD=$(realpath "$BUILD")

mkdir -p $BUILD/packs/emscripten

pushd $BUILD/packs/emscripten
$SRC/make.sh # builds files in the current working directory

for PACK in ./*; do
    if [ -d "$PACK" ]; then
        PACK=$(basename $PACK)
        pushd $PACK
            $BUILD/tooling/wasm-package pack ../../$PACK.pack $(find .)
        popd
    fi
done

popd
