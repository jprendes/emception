#!/bin/bash

SRC=$(dirname $0)

BUILD="$1"
PYODIDE_SRC="$2"

if [ "$PYODIDE_SRC" == "" ]; then
    PYODIDE_SRC=$(pwd)/upstream/pyodide
fi

if [ "$BUILD" == "" ]; then
    BUILD=$(pwd)/build
fi

SRC=$(realpath "$SRC")
BUILD=$(realpath "$BUILD")
PYODIDE_BUILD=$BUILD/pyodide

# If we don't have a copy of pyodide, make one
if [ ! -d $PYODIDE_SRC/ ]; then
    # We use a modified version of pyodide that compiles with Asyncify
    git clone https://github.com/jprendes/pyodide.git "$PYODIDE_SRC/"

    pushd $PYODIDE_SRC/

    # This is the last tested commit of jprendes/pyodide.
    # Feel free to try with a newer version
    git reset --hard 7698df5529cc37f6f538f4d841c03bb47c1cec9e

    # Pyodide makes heavy use of globals due to the package loading mechanism.
    # That makes it so that we can't have two pyodides running in the same page.
    # Since we don't need to load packages, patch that so that we can run many pyodides.
    # This is the bulk of the patches, but we still need some extra patches in the built files.
    # Pyodide also uses Emscripten's "--preload-file" to preload it's data.
    # We replace those preloads with our packed data.
    git apply $SRC/patches/pyodide.patch

    popd
fi

if [ ! -d $PYODIDE_BUILD/ ]; then
    mkdir -p $PYODIDE_BUILD
    
    # Pyodide Makefile buils in the source tree, so unfortunately there's not much we can do here.
    # We will need to copy it over once it finishes the build
fi
pushd $PYODIDE_SRC
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
$SRC/patch-pyodide-build.sh "$PYODIDE_SRC/build" "$PYODIDE_BUILD"

# Copy over the rest of the built files, which is basically the wasm file
cp $PYODIDE_SRC/build/pyodide.asm.wasm $PYODIDE_BUILD

$SRC/packs/pyodide/package.sh $PYODIDE_SRC $BUILD