#!/bin/bash

SRC=$(dirname $0)

BUILD="$1"
QUICKNODE_SRC="$2"

if [ "$QUICKNODE_SRC" == "" ]; then
    QUICKNODE_SRC="$SRC"/quicknode
fi

if [ "$BUILD" == "" ]; then
    BUILD=$(pwd)/build
fi

SRC=$(realpath "$SRC")
BUILD=$(realpath "$BUILD")
QUICKNODE_BUILD=$BUILD/quicknode

if [ ! -d $QUICKNODE_BUILD/ ]; then
    CXXFLAGS="
        -fexceptions \
        -s DISABLE_EXCEPTION_CATCHING=0 \
    " \
    LDFLAGS="\
        -fexceptions \
        -s DISABLE_EXCEPTION_CATCHING=0 \
        -s ALLOW_MEMORY_GROWTH=1 \
        -s EXPORTED_FUNCTIONS=_main,_free,_malloc \
        -s EXPORTED_RUNTIME_METHODS=FS,PROXYFS,ERRNO_CODES,allocateUTF8 \
        -lproxyfs.js \
        --js-library=$SRC/emlib/fsroot.js \
    " emcmake cmake -G Ninja \
        -S $QUICKNODE_SRC/ \
        -B $QUICKNODE_BUILD/ \
        -DCMAKE_BUILD_TYPE=Release
    
    # Make sure we build js modules (.mjs).
    # The patch-ninja.sh script assumes that.
    sed -i -E 's/\.js/.mjs/g' $QUICKNODE_BUILD/build.ninja

    # The mjs patching is over zealous, and patches some source JS files rather than just output files.
    # Undo that.
    sed -i -E 's/(pre|post|proxyfs|fsroot)\.mjs/\1.js/g' $QUICKNODE_BUILD/build.ninja
fi
cmake --build $QUICKNODE_BUILD/ -- quicknode
