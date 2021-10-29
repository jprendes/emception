#!/bin/bash

SRC=$(dirname $0)
BUILD="$1"

if [ "$BUILD" == "" ]; then
    BUILD=$(pwd)/build
fi

SRC=$(realpath "$SRC")
BUILD=$(realpath "$BUILD")

mkdir -p $BUILD/emception
mkdir -p $BUILD/packs/node

pushd $BUILD/packs/node
$SRC/make.sh # builds files in the current working directory
$BUILD/tooling/wasm-package pack $BUILD/emception/node.pack.txt $(find node/)
popd
