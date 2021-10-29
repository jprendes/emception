#!/bin/bash

if [ "$1" == "" ]; then
    echo "Usage: $0 path/to/pyodide.mjs"
    exit 1
fi

sed -i -E 's/^let Module=\{\};/export default function loadPyodide(pyodideOpts, Module = {}) {/' "$1"

# Add the "unwrap()};" bit so that a second attempt to patch will be a no-op
sed -i -E 's/unwrap\(\)\};export\{loadPyodide\};$/unwrap()};return loadPyodide(pyodideOpts);};export{loadPyodide};/' "$1"