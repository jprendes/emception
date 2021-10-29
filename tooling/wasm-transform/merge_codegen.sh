#!/bin/bash

OUTPUT="$1"
shift

cat "$@" > "$OUTPUT"