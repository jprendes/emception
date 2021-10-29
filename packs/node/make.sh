#!/bin/bash

SRC=$(dirname $0)
SRC=$(realpath "$SRC")

cp -r $SRC/node .

pushd node/

npm i

popd