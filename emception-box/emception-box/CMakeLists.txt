add_subdirectory(../binaryen binaryen EXCLUDE_FROM_ALL)
add_subdirectory(../cpython cpython EXCLUDE_FROM_ALL)
add_subdirectory(../llvm llvm EXCLUDE_FROM_ALL)
add_subdirectory(../quicknode quicknode EXCLUDE_FROM_ALL)

add_executable(node ALIAS quicknode)

boxify(emception-box)
boxify_add(emception-box clang lld llvm-nm llvm-ar llvm-objcopy llc)
boxify_add(emception-box wasm-as wasm-ctor-eval wasm-emscripten-finalize wasm-metadce wasm-opt wasm-shell)
boxify_add(emception-box node)
boxify_add(emception-box python)

target_compile_options(emception-box PUBLIC
    -fwasm-exceptions # for bynarien and quicknode
)
target_link_options(emception-box PUBLIC
    -sALLOW_MEMORY_GROWTH
    -sUSE_ZLIB # for python
    -fwasm-exceptions # for bynarien and quicknode
)

target_link_options(emception-box PUBLIC
    -sEXPORTED_FUNCTIONS=_main,_free,_malloc
    -sEXPORTED_RUNTIME_METHODS=FS,PROXYFS,ERRNO_CODES,allocateUTF8
    -lproxyfs.js
    --js-library=${CMAKE_SOURCE_DIR}/emlib/fsroot.js
)