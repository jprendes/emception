#!/bin/bash

DEFINES="$1"
shift
ENTRY="$1"
shift
COMMAND="$1"
shift

cat "$@" | grep -E "^entrypoint" | sed -E 's/entrypoint (.*)/extern "C" int \1(int, const char **);/' > $DEFINES
cat "$@" | grep -E "^constructor" | sed -E 's/^constructor //' | sort -n | sed -E 's/[0-9]+ (.*)/extern "C" void \1(void);/' >> $DEFINES
echo "" >> $DEFINES

echo "    if (strcmp(argv0, \"$COMMAND\") == 0) {" > $ENTRY
cat "$@" | grep -E "^constructor" | sed -E 's/^constructor //' | sort -n | sed -E 's/[0-9]+ (.*)/        \1();/' >> $ENTRY
cat "$@" | grep -E "^entrypoint" | sed -E 's/entrypoint (.*)/        return \1(argc, argv);/' >> $ENTRY
echo "    }" >> $ENTRY
echo "" >> $ENTRY

