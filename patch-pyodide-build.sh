#!/bin/bash

if [ "$1" == "" ] || [ "$2" == "" ]; then
    echo "Usage: $0 path/to/src/build/ path/to/dst/build"
    exit 1
fi

SRC=$(realpath $1)
DST=$(realpath $2)

INPLACE=0
if [ "$SRC" == "$DST" ]; then
    INPLACE=1
    DST=$(mktemp -d)
fi

# Add the "unwrap()};" bit on the second `sed` so that a second attempt to patch inplace will be a no-op
cat "$SRC/pyodide.mjs" \
    | sed -E 's/^let Module=\{\};/export default function loadPyodide(_createPyodideModule, pyodideOpts, Module = {}) {/' \
    | sed -E 's/unwrap\(\)\};export\{loadPyodide\};$/unwrap()};return loadPyodide(pyodideOpts);};export{loadPyodide};/' \
    > "$DST/pyodide.mjs"

# Make pyodide.asm.js a proper JS module with an export and .mjs
cat "$SRC/pyodide.asm.js" \
    | tr '\n' '\r' \
    | sed -E 's|if\s*\(typeof exports.*|export default _createPyodideModule;\r|' \
    | tr '\r' '\n' \
    > "$DST/pyodide.asm.mjs"

if [ "$INPLACE" == "1" ]; then
    mv "$DST/pyodide.asm.mjs" "$SRC/pyodide.asm.js"
    mv "$DST/pyodide.mjs" "$SRC/pyodide.mjs"
    rmdir $DST
fi
