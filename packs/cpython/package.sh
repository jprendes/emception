#!/bin/bash

SRC=$(dirname $0)
BUILD="$1"

if [ "$BUILD" == "" ]; then
    BUILD=$(pwd)/build
fi

BUILD=$(realpath "$BUILD")

mkdir -p $BUILD/packs/cpython/

UPSTREAM_CPYTHON_STDLIB_ZIP=$(echo $BUILD/cpython/usr/local/lib/python3*.zip)
UPSTREAM_CPYTHON_STDLIB_ROOT=$(echo $BUILD/cpython/usr/local/lib/python3.*)

cp -Rf $UPSTREAM_CPYTHON_STDLIB_ROOT $BUILD/packs/cpython/

CPYTHON_STDLIB_ROOT=$(echo $BUILD/packs/cpython/python3.*)
mkdir -p $CPYTHON_STDLIB_ROOT/site-packages
cp -f $SRC/sitecustomize.py $CPYTHON_STDLIB_ROOT/site-packages/

unzip -q "$UPSTREAM_CPYTHON_STDLIB_ZIP" -d "$CPYTHON_STDLIB_ROOT"

pushd $BUILD/packs/cpython
$BUILD/tooling/wasm-package pack ../cpython.pack $(find ./python3.*/)
popd
