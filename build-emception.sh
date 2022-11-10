#!/bin/bash

SRC=$(dirname $0)
BUILD="$1"

if [ "$BUILD" == "" ]; then
    BUILD=$(pwd)/build
fi

SRC=$(realpath "$SRC")
BUILD=$(realpath "$BUILD")

if [ ! -d $BUILD/emception/ ]; then
    mkdir -p $BUILD/emception/
fi

cp $SRC/src/* $BUILD/emception/
cp $SRC/src/* $BUILD/emception/

mkdir -p $BUILD/emception/llvm/
cp $BUILD/llvm/bin/llvm-box.mjs $BUILD/emception/llvm/

mkdir -p $BUILD/emception/binaryen/
cp $BUILD/binaryen/bin/binaryen-box.mjs $BUILD/emception/binaryen/

mkdir -p $BUILD/emception/pyodide/
cp $BUILD/pyodide/{pyodide.asm.mjs,pyodide.mjs} $BUILD/emception/pyodide/

mkdir -p $BUILD/emception/cpython/
cp $BUILD/cpython/python.mjs $BUILD/emception/cpython/

mkdir -p $BUILD/emception/brotli/
cp $BUILD/brotli/brotli.{mjs,wasm} $BUILD/emception/brotli/

mkdir -p $BUILD/emception/wasm-package/
cp $BUILD/wasm-package/wasm-package.{mjs,wasm} $BUILD/emception/wasm-package/

$SRC/build-packs.sh $BUILD

MD5="$(md5sum "$BUILD/packs/root.pack")"
MD5="${MD5%% *}"

#brotli --best --keep $BUILD/packs/root.pack

SIZE="$(stat --printf="%s" "$BUILD/packs/root.pack")"

{
    echo "import root_pack_url from \"./root.pack\";"
    echo -n 'export default ['
    echo -n "$SIZE"
    echo -n ','
    echo -n "$MD5" | jq -sR | tr -d '\n'
    echo -n ','
    echo -n "root_pack_url"
    echo '];'
} > "$BUILD/packs/root_pack.mjs"

cp -f "$BUILD/packs/root.pack" "$BUILD/emception/"
#cp -f "$BUILD/packs/root.pack.br" "$BUILD/emception/"
cp -f "$BUILD/packs/root_pack.mjs" "$BUILD/emception/"

cp -f -R "$BUILD/packs/emscripten/emscripten/lazy-cache" "$BUILD/emception/"

{
    echo 'import lazy_cache from "./lazy-cache/index.mjs";'
    echo 'export default lazy_cache;'
} > "$BUILD/emception/lazy-cache.mjs"
