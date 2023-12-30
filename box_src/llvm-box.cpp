#include <string.h>
#include <stdio.h>

#include "llvm-box-define-gen.hpp"

int main(int argc, const char ** argv) {
    if (argc < 2) {
        fprintf(stderr, "usage: llvm-box [COMMAND] [ARGUMENTS...]\n");
        return 1;
    }

    const char * argv0 = argv[1];

    --argc;
    ++argv;

    #include "llvm-box-entry-gen.hpp"

    fprintf(stderr, "LLVM command \"%s\" not found", argv0);

    return 1;
}
