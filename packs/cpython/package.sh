#!/bin/bash

SRC=$(dirname $0)
BUILD="$1"

if [ "$BUILD" == "" ]; then
    BUILD=$(pwd)/build
fi

BUILD=$(realpath "$BUILD")

mkdir -p $BUILD/packs/cpython/

cp -Rf $BUILD/cpython/usr $BUILD/packs/cpython/

CPYTHON_STDLIB_ROOT=$(echo $BUILD/packs/cpython/usr/local/lib/python3.*)
mkdir -p $CPYTHON_STDLIB_ROOT/site-packages
cp -f $SRC/sitecustomize.py $CPYTHON_STDLIB_ROOT/site-packages/

pushd $BUILD/packs/cpython
$BUILD/tooling/wasm-package pack ./cpython.pack $(find usr/)
popd
