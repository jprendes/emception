#!/bin/bash

SRC=$(dirname $0)

BUILD="$1"
BINARYEN_SRC="$2"

if [ "$BINARYEN_SRC" == "" ]; then
    BINARYEN_SRC=$(pwd)/upstream/binaryen
fi

if [ "$BUILD" == "" ]; then
    BUILD=$(pwd)/build
fi

SRC=$(realpath "$SRC")
BUILD=$(realpath "$BUILD")
BINARYEN_BUILD=$BUILD/binaryen

# If we don't have a copy of binaryen, make one
if [ ! -d $BINARYEN_SRC/ ]; then
    git clone https://github.com/WebAssembly/binaryen.git "$BINARYEN_SRC/"

    pushd $BINARYEN_SRC/
    
    # This is the last tested commit of binaryen.
    # Feel free to try with a newer version
    git reset --hard ef686a4d932b9b86edc34a3b9b15926f943f6f7b

    popd
fi

if [ ! -d $BINARYEN_BUILD/ ]; then
    LDFLAGS="-s ALLOW_MEMORY_GROWTH=1 -s EXPORTED_FUNCTIONS=_main,_free,_malloc -s EXPORTED_RUNTIME_METHODS=FS,PROXYFS,allocateUTF8 -lproxyfs.js" emcmake cmake -G Ninja \
        -S $BINARYEN_SRC/ \
        -B $BINARYEN_BUILD/ \
        -DCMAKE_BUILD_TYPE=Release
    
    # Binaryen likes to build single files, but that uses base64 and is less compressible.
    # Make sure we build a separate wasm file
    sed -i -E 's/-s SINGLE_FILE(=[^ ]*)?//g' $BINARYEN_BUILD/build.ninja

    # Binaryen likes to build with -flto, which is great.
    # However, LTO generates objects file with LLVM-IR bitcode rather than WebAssembly.
    # The patching mechanism to generate binaryen-box only understands wasm object files.
    # Because of that, we need to disable LTO.
    sed -i -E 's/-flto//g' $BINARYEN_BUILD/build.ninja

    # Binaryen builds with NODERAWFS, which is not compatible with browser workflows.
    # Disable it.
    sed -i -E 's/-s NODERAWFS(\s*=\s*[^ ]*)?//g' $BINARYEN_BUILD/build.ninja

    # Make sure we build js modules (.mjs).
    # The patch-ninja.sh script assumes that.
    sed -i -E 's/\.js/.mjs/g' $BINARYEN_BUILD/build.ninja

    # The mjs patching is over zealous, and some source JS files rather than just output files.
    # Undo that.
    sed -i -E 's/\.mjs-/.js-/g' $BINARYEN_BUILD/build.ninja
    sed -i -E 's/(pre|post)\.mjs/\1.js/g' $BINARYEN_BUILD/build.ninja
    sed -i -E 's/proxyfs\.mjs/proxyfs.js/g' $BINARYEN_BUILD/build.ninja

    # Patch the build script to add the "binaryen-box" target.
    # This new target bundles many executables in one, reducing the total size.
    pushd $SRC
    TMP_FILE=$(mktemp)
    ./patch-ninja.sh \
        $BINARYEN_BUILD/build.ninja \
        binaryen-box \
        $BUILD/tooling \
        wasm-as wasm-ctor-eval wasm-emscripten-finalize wasm-metadce wasm-opt wasm-shell \
        > $TMP_FILE
    cat $TMP_FILE >> $BINARYEN_BUILD/build.ninja
    popd
fi
cmake --build $BINARYEN_BUILD/ -- binaryen-box
