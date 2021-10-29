#!/bin/bash

NINJA_FILE=""
BOX=""
TOOLING_DIR=""

SRC=$(dirname $0)
SRC=$(realpath "$SRC")

get_rule() {
    cat $NINJA_FILE | tr '\n' '\r' | sed -E 's;(.*)\r(build '"$1"'([^\r]|\r[^\r])*\r)(.*);\2;' | tr '\r' '\n'
}

rename_dep() {
    echo "$@" | tr ' ' '\n' | sed -E 's/^(.*)(\.\w+)\.o$/\1_'"$BOX"'\2.o/' | tr '\n' ' ' | sed -E 's/(^\s+|\s+$)//'
}

rename_dep_metadata() {
    echo "$@" | tr ' ' '\n' | sed -E 's/^(.*)(\.\w+)\.o$/\1_'"$BOX"'\2.o.metadata/' | tr '\n' ' ' | sed -E 's/(^\s+|\s+$)//'
}

find_obj_deps() {
    get_rule "$1" | head -n1 | tr ' ' '\n' | grep -E "\.o$"
}

find_command() {
    get_rule "$1" | head -n1 | sed -E "s/(.*):\s*([^ |]*)\s*([^|]*)(\|([^|]*))?(\|\|([^|]*))?/\2/"
}

find_direct_deps() {
    get_rule "$1" | head -n1 | sed -E "s/(.*):\s*([^ |]*)\s*([^|]*)(\|([^|]*))?(\|\|([^|]*))?/\3/"
}

find_indirect_deps() {
    get_rule "$1" | head -n1 | sed -E "s/(.*):\s*([^ |]*)\s*([^|]*)(\|([^|]*))?(\|\|([^|]*))?/\5/"
}

find_order_deps() {
    get_rule "$1" | head -n1 | sed -E "s/(.*):\s*([^ |]*)\s*([^|]*)(\|([^|]*))?(\|\|([^|]*))?/\7/"
}

find_prop() {
    get_rule "$1" | grep -E '\s+'"$2"'\s*=\s*' | sed -E 's/\s+'"$2"'\s*=\s*//'
}

find_flags() {
    find_prop "$1" "FLAGS"
}

find_link_flags() {
    find_prop "$1" "LINK_FLAGS"
}

find_libraries() {
    find_prop "$1" "LINK_LIBRARIES"
}

make_obj_deps() {
    OBJS=$(find_obj_deps $1)
    for OBJ in $OBJS; do
        echo "build $(rename_dep $OBJ) | $(rename_dep_metadata $OBJ) : CUSTOM_COMMAND $OBJ"
        echo "  COMMAND = $TOOLING_DIR/wasm-transform.sh $OBJ $(rename_dep $OBJ)"
        echo ""
    done

    echo "build $2 $3 : CUSTOM_COMMAND $(rename_dep_metadata $OBJS)"
    echo "  COMMAND = $TOOLING_DIR/codegen.sh $2 $3 $4 $(rename_dep_metadata $OBJS)"
    echo ""
}

DIRECT_DEPS=""
INDIRECT_DEPS=""
ORDER_DEPS=""

FLAGS=""
LINK_FLAGS=""
LIBRARIES=""

GENERATED_DEFINES=""
GENERATED_ENTRIES=""

BIN_TEMPLATE=""

collate() {
    echo " $@" | sed 's/ -s / -s_/g' | tr ' ' '\n' | sort | uniq | tr '\n' ' ' | sed 's/ -s_/ -s /g'
}

make_link_rule() {
    echo -n "build bin/$BOX.mjs: $(find_command $BIN_TEMPLATE) $BOX.cpp.o"
    echo -n " $(rename_dep $(collate $DIRECT_DEPS))"
    echo -n " | $(rename_dep $(collate $INDIRECT_DEPS))"
    echo -n " || $(rename_dep $(collate $ORDER_DEPS))"
    echo ""
    echo "  FLAGS = $(collate $FLAGS)"
    echo "  LINK_FLAGS = $(collate $LINK_FLAGS)"
    echo "  LINK_LIBRARIES = $(collate $LIBRARIES)"
    echo "  POST_BUILD = :"
    echo "  PRE_LINK = :"
    echo "  TARGET_FILE = bin/$BOX.mjs"
    echo ""
    echo "build $BOX: phony bin/$BOX.mjs"
    echo ""
}

make_main_rule() {
    echo "build $BOX-define-gen.hpp : CUSTOM_COMMAND $GENERATED_DEFINES"
    echo "  COMMAND = $TOOLING_DIR/merge_codegen.sh $BOX-define-gen.hpp $GENERATED_DEFINES"
    echo ""
    echo "build $BOX-entry-gen.hpp : CUSTOM_COMMAND $GENERATED_ENTRIES"
    echo "  COMMAND = $TOOLING_DIR/merge_codegen.sh $BOX-entry-gen.hpp $GENERATED_ENTRIES"
    echo ""
    echo "build $BOX.cpp : CUSTOM_COMMAND $SRC/box_src/$BOX.cpp"
    echo "  COMMAND = cp $SRC/box_src/$BOX.cpp $BOX.cpp"
    echo ""

    MODEL=$(find_obj_deps $BIN_TEMPLATE | head -n1)
    echo "build $BOX.cpp.o: $(find_command $MODEL) $BOX.cpp | $BOX-define-gen.hpp $BOX-entry-gen.hpp"
    echo "  DEFINES = $(find_prop $MODEL DEFINES)"
    echo "  INCLUDES = $(find_prop $MODEL INCLUDES)"
    echo "  DEP_FILE = $BOX.c.o.d"
    echo "  FLAGS = -I$(realpath .) $(find_prop $MODEL FLAGS)"
    echo "  OBJECT_DIR = ."
    echo "  OBJECT_FILE_DIR = ."
    echo ""
}

patch_deps() {
    BIN="bin/$1.mjs"
    GENERATED_DEFINE="$1_defines.hpp"
    GENERATED_ENTRY="$1_entry.hpp"

    if [ "$BIN_TEMPLATE" == "" ]; then
        BIN_TEMPLATE="$BIN"
    fi

    make_obj_deps "$BIN" "$GENERATED_DEFINE" "$GENERATED_ENTRY" "$1"

    DIRECT_DEPS="$DIRECT_DEPS $(find_direct_deps $BIN)"
    INDIRECT_DEPS="$INDIRECT_DEPS $(find_indirect_deps $BIN)"
    ORDER_DEPS="$ORDER_DEPS $(find_order_deps $BIN)"

    FLAGS="$FLAGS $(find_flags $BIN)"
    LINK_FLAGS="$LINK_FLAGS $(find_link_flags $BIN)"
    LIBRARIES="$LIBRARIES $(find_libraries $BIN)"

    GENERATED_DEFINES="${GENERATED_DEFINES} $GENERATED_DEFINE"
    GENERATED_ENTRIES="${GENERATED_ENTRIES} $GENERATED_ENTRY"
}

run_patch() {

echo ""
echo "# ============================================================================="
echo "# Object build statements for EXECUTABLE target $BOX"
echo ""
echo ""

# Outputs the rules to compile the different binaries entry points
# It compiles them renaming the `main` function to a different name
for TARGET in $@; do
    patch_deps $TARGET
done

# Outputs the rules to compile the actual `main` function.
# It dispatches the call to one of the other renamed `main`s
make_main_rule

echo ""
echo "# ============================================================================="
echo "# Link build statements for EXECUTABLE target $BOX"
echo ""
echo ""
echo "#############################################"
echo "# Link the executable bin/$BOX.mjs"
echo ""
echo ""
make_link_rule

}

NINJA_FILE="$1"
shift
BOX="$1"
shift
TOOLING_DIR="$1"
shift

TOOLING_DIR=$(realpath "$TOOLING_DIR")

run_patch "$@"