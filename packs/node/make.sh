#!/bin/bash

if [ -d node ]; then
    # nothing to do here
    exit
fi

SRC=$(dirname $0)
SRC=$(realpath "$SRC")

cp -r $SRC/node .

pushd node/

npm i

popd