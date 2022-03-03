#!/bin/bash

if [ -d emscripten ]; then
    # nothing to do here
    exit
fi

SRC=$(dirname $0)
SRC=$(realpath "$SRC")

# We use here 3.1.6 since that's the latest tag it's been tested with.
# Feel free to try a newer version
curl --silent --output emscripten.zip --location https://github.com/emscripten-core/emscripten/archive/refs/tags/3.1.6.zip
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

# Install dependencies (but nor development dependencies)
npm i --only=prod

# Remove a bunch of things we won't use
rm -Rf \
    ./.circleci \
    ./.github \
    ./cmake \
    ./site \
    ./tests \
    ./third_party/closure-compiler \
    ./third_party/jni \
    ./third_party/ply \
    ./third_party/websockify \
    ./tools/websocket_to_posix_proxy \
    ./*.bat

popd
