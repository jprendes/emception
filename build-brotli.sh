#!/bin/bash

SRC=$(dirname $0)

BUILD="$1"
BROTLI_SRC="$2"

if [ "$BROTLI_SRC" == "" ]; then
    BROTLI_SRC=$(pwd)/upstream/brotli
fi

if [ "$BUILD" == "" ]; then
    BUILD=$(pwd)/build
fi

SRC=$(realpath "$SRC")
BUILD=$(realpath "$BUILD")
BROTLI_BUILD=$BUILD/brotli

# If we don't have a copy of binaryen, make one
if [ ! -d $BROTLI_SRC/ ]; then
    git clone https://github.com/google/brotli.git "$BROTLI_SRC/"

    pushd $BROTLI_SRC/
    
    # This is the last tested commit of brotli.
    # Feel free to try with a newer version
    git reset --hard 62662f87cdd96deda90ac817de94e3c4af75226a

    popd
fi

if [ ! -d $BROTLI_BUILD/ ]; then
    CFLAGS="-flto" LDFLAGS="-s ALLOW_MEMORY_GROWTH=1 -flto -s EXPORTED_FUNCTIONS=_main,_free,_malloc -s EXPORTED_RUNTIME_METHODS=FS,PROXYFS,allocateUTF8 -lproxyfs.js" emcmake cmake -G Ninja \
        -S $BROTLI_SRC/ \
        -B $BROTLI_BUILD/ \
        -DCMAKE_BUILD_TYPE=Release
    
    # Make sure we build js modules (.mjs).
    sed -i -E 's/\.js/.mjs/g' $BROTLI_BUILD/build.ninja

    # The mjs patching is over zealous, and patches some JS library files rather than just output files.
    # Undo that.
    sed -i -E 's/proxyfs\.mjs/proxyfs.js/g' $BROTLI_BUILD/build.ninja
fi
cmake --build $BROTLI_BUILD/ -- brotli.mjs

# the build script for brotli doesn't create a `bin` folder like binaryen or llvm
# so lets create and populate one
mkdir -p $BROTLI_BUILD/bin
cp $BROTLI_BUILD/brotli.{mjs,wasm} $BROTLI_BUILD/bin
