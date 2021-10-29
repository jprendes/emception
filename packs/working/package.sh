#!/bin/bash

SRC=$(dirname $0)
BUILD="$1"

if [ "$BUILD" == "" ]; then
    BUILD=$(pwd)/build
fi

SRC=$(realpath "$SRC")
BUILD=$(realpath "$BUILD")

mkdir -p $BUILD/emception

pushd $SRC
$BUILD/tooling/wasm-package pack $BUILD/emception/working.pack.txt $(find working/)
popd
