#!/bin/bash

SRC=$(dirname $0)
BUILD="$1"

if [ "$BUILD" == "" ]; then
    BUILD=$(pwd)/build
fi

SRC=$(realpath "$SRC")
BUILD=$(realpath "$BUILD")

$SRC/build-tooling.sh "$BUILD"

$SRC/build-binaryen.sh "$BUILD" "$BINARYEN_SRC"
$SRC/build-llvm.sh "$BUILD" "$LLVM_SRC"
$SRC/build-cpython.sh "$BUILD" "$CPYTHON_SRC"
$SRC/build-quicknode.sh "$BUILD" "$QUICKNODE_SRC"
$SRC/build-brotli.sh "$BUILD" "$BROTLI_SRC"

$SRC/build-emception.sh "$BUILD"