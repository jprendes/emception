#!/bin/bash

SRC=$(dirname $0)
BUILD="$1"

if [ "$BUILD" == "" ]; then
    BUILD=$(pwd)/build
fi

SRC=$(realpath "$SRC")
BUILD=$(realpath "$BUILD")

mkdir -p $BUILD/emception
mkdir -p $BUILD/packs/working

pushd $SRC
$BUILD/tooling/wasm-package pack $BUILD/packs/working/working.pack $(find working/)
popd
