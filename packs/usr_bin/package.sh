#!/bin/bash

SRC=$(dirname $0)
BUILD="$1"

if [ "$BUILD" == "" ]; then
    BUILD=$(pwd)/build
fi

SRC=$(realpath "$SRC")
BUILD=$(realpath "$BUILD")

mkdir -p $BUILD/emception
mkdir -p $BUILD/packs/usr_bin

pushd $BUILD/packs/usr_bin
$SRC/make.sh # builds files in the current working directory
$BUILD/tooling/wasm-package pack $BUILD/emception/usr_bin.pack.txt $(find usr/)
popd
