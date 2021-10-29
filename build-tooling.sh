#!/bin/bash

SRC=$(dirname $0)
BUILD="$1"

if [ "$BUILD" == "" ]; then
    BUILD=$(pwd)/build
fi

SRC=$(realpath "$SRC")
BUILD=$(realpath "$BUILD")

TOOLING_BUILD=$BUILD/tooling
WASM_PACKAGE_BUILD=$BUILD/wasm-package

mkdir -p $TOOLING_BUILD
mkdir -p $WASM_PACKAGE_BUILD

$SRC/tooling/wasm-transform/compile.sh $TOOLING_BUILD
cp $SRC/tooling/wasm-transform/{codegen.sh,merge_codegen.sh,wasm-transform.sh} $TOOLING_BUILD

$SRC/tooling/wasm-package/compile.sh $TOOLING_BUILD
$SRC/tooling/wasm-package/compile_wasm.sh $WASM_PACKAGE_BUILD