#include <string.h>
#include <stdio.h>

#include "llvm-box-define-gen.hpp"

int main(int argc, const char ** argv) {
    if (argc < 1) return 1;
    
    const char * argv0 = argv[0];

    --argc;
    ++argv;

    #include "llvm-box-entry-gen.hpp"
    
    fprintf(stderr, "LLVM command \"%s\" not found", argv0);

    return 1;
}
