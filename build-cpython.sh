#!/bin/bash

SRC=$(dirname $0)

BUILD="$1"
CPYTHON_SRC="$2"

if [ "$CPYTHON_SRC" == "" ]; then
    CPYTHON_SRC=$(pwd)/upstream/cpython
fi

if [ "$BUILD" == "" ]; then
    BUILD=$(pwd)/build
fi

SRC=$(realpath "$SRC")
BUILD=$(realpath "$BUILD")
CPYTHON_BUILD=$BUILD/cpython
CPYTHON_NATIVE=$BUILD/cpython-native

# If we don't have a copy of pyodide, make one
if [ ! -d $CPYTHON_SRC/ ]; then
    git clone https://github.com/python/cpython.git "$CPYTHON_SRC/"

    pushd $CPYTHON_SRC/

    # This is the last tested commit of cpython.
    # Feel free to try with a newer version
    git reset --hard b8a9f13abb61bd91a368e2d3f339de736863050f

    # Patch cpython to add a module to evaluate JS code.
    git apply $SRC/patches/cpython.patch

    autoreconf -i

    popd
fi

if [ ! -d $CPYTHON_NATIVE/ ]; then
    mkdir -p $CPYTHON_NATIVE/

    pushd $CPYTHON_NATIVE/

    $CPYTHON_SRC/configure -C
    make -j$(nproc)

    popd
fi

if [ ! -d $CPYTHON_BUILD/ ]; then
    mkdir -p $CPYTHON_BUILD/

    pushd $CPYTHON_BUILD/

    # Build cpython with asyncify support.
    # Disable sqlite3, zlib and bzip2, which cpython enables by default
    CONFIG_SITE=$CPYTHON_SRC/Tools/wasm/config.site-wasm32-emscripten \
    LIBSQLITE3_CFLAGS=" " \
    BZIP2_CFLAGS=" " \
    CFLAGS="-D__EMSCRIPTEN_ASYNCIFY__" \
    LDFLAGS="-s ASYNCIFY -s EXPORTED_FUNCTIONS=_main,_free,_malloc -s EXPORTED_RUNTIME_METHODS=ccall,FS,PROXYFS,allocateUTF8 -s ASYNCIFY_STACK_SIZE=819200 -lproxyfs.js" \
    emconfigure $CPYTHON_SRC/configure -C \
        --host=wasm32-unknown-emscripten \
        --build=$($CPYTHON_SRC/config.guess) \
        --with-emscripten-target=browser \
        --disable-wasm-dynamic-linking \
        --with-suffix=".mjs" \
        --disable-wasm-preload \
        --enable-wasm-asyncify \
        --enable-wasm-js-module \
        --with-build-python=$CPYTHON_NATIVE/python \

    emmake make -j$(nproc)

    popd
fi

pushd $CPYTHON_BUILD/

emmake make -j$(nproc)

popd

exit 0;

pushd $CPYTHON_SRC
# Do a minimap build of Pyodide
./run_docker --non-interactive --port none --pre-built env PYODIDE_PACKAGES="micropip" make
popd

# Pyodide makes heavy use of globals due to the package loading mechanism.
# That makes it so that we can't have two pyodides running in the same page.
# Since we don't need to load packages, patch that so that we can run many pyodides.
# We already apply some of the patches at the source level.
# But there's a final fix that's hard to fix without touching too much.
# We do that final fix in the built file.
#
# Patch pyodide.asm.js and copy over as pyodide.asm.mjs (.mjs)
# Patch pyodide.mjs and copy over
$SRC/patch-pyodide-build.sh "$CPYTHON_SRC/build" "$CPYTHON_BUILD"

# Copy over the rest of the built files, which is basically the wasm file
cp $CPYTHON_SRC/build/pyodide.asm.wasm $CPYTHON_BUILD

$SRC/packs/pyodide/package.sh $CPYTHON_SRC $BUILD