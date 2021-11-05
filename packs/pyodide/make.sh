#!/bin/bash

if [ -d lib ]; then
    # nothing to do here
    exit
fi

SRC=$(dirname $0)
PYODIDE_SRC="$1"

if [ "$PYODIDE_SRC" == "" ]; then
    echo "Usage: make.sh /path/to/source/of/pyodide/"
    exit 1
fi

SRC=$(realpath "$SRC")
PYODIDE_SRC=$(realpath "$PYODIDE_SRC")

mkdir -p ./lib
cp -r "$PYODIDE_SRC"/cpython/installs/python-*/lib/python* ./lib/
cp -r "$PYODIDE_SRC"/src/{webbrowser.py,pystone.py} ./lib/python*/
mkdir -p ./lib/python*/site-packages/
cp -r "$PYODIDE_SRC"/src/py/{pyodide,_pyodide} ./lib/python*/site-packages/

rm -Rf $(find lib -name "__pycache__")
rm -Rf $(find lib -name "*test*")
rm -Rf $(find lib -name "*distutils*")
