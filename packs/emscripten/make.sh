#!/bin/bash

if [ -d emscripten ]; then
    # nothing to do here
    exit
fi

SRC=$(dirname $0)
SRC=$(realpath "$SRC")

# We use here 3.1.24 since that's the latest tag it's been tested with.
# Feel free to try a newer version
curl --silent --output emscripten.zip --location https://github.com/emscripten-core/emscripten/archive/refs/tags/3.1.24.zip
unzip -q emscripten.zip
rm emscripten.zip
mv emscripten-* emscripten

pushd emscripten/

cp $SRC/config ./.emscripten

# We won't support closure-compiler, remove it from the dependencies
ls -alh .
cat package.json | \
    jq '. | del(.dependencies["google-closure-compiler"])' \
    > _package.json
mv _package.json package.json

# Patch emscripten to:
# * avoid invalidating the cache
# * fix a bug with proxy_to_worker
patch -p2 < $SRC/emscripten.patch

# Install dependencies (but nor development dependencies)
npm i --only=prod

# Remove a bunch of things we won't use
rm -Rf \
    ./.circleci \
    ./.github \
    ./cmake \
    ./site \
    ./test \
    ./third_party/closure-compiler \
    ./third_party/jni \
    ./third_party/ply \
    ./third_party/websockify \
    ./tools/websocket_to_posix_proxy \
    ./*.bat

CONTAINER_ID=$(docker create emscripten/emsdk:3.1.24)
docker cp $CONTAINER_ID:/emsdk/upstream/emscripten/cache ./cache
docker rm $CONTAINER_ID

# The number of combinatios for the cached libraries is quite large
# Remove some of the less common ones
rm ./cache/sysroot/lib/wasm32-emscripten/libwasmfs-*debug*
rm ./cache/sysroot/lib/wasm32-emscripten/*-asan*
rm ./cache/sysroot/lib/wasm32-emscripten/libsanitizer*

popd
