cmake_minimum_required(VERSION 3.22)

project(emception VERSION 0.1 LANGUAGES C CXX)
set(CMAKE_CXX_EXTENSIONS OFF)

# Setting the flags this way is a bit extreme but gets the job done reliably
set(CMAKE_C_COMPILE_OBJECT "${CMAKE_C_COMPILE_OBJECT} -Oz -g0 -fwasm-exceptions")
set(CMAKE_CXX_COMPILE_OBJECT "${CMAKE_CXX_COMPILE_OBJECT} -Oz -g0 -fwasm-exceptions")

include(boxify/boxify.cmake)
include(fetch_archive.cmake)

add_subdirectory(binaryen EXCLUDE_FROM_ALL)
add_subdirectory(cpython EXCLUDE_FROM_ALL)
add_subdirectory(llvm EXCLUDE_FROM_ALL)
add_subdirectory(quicknode EXCLUDE_FROM_ALL)
add_subdirectory(libarchive EXCLUDE_FROM_ALL)

add_executable(node ALIAS quicknode)
add_executable(tar ALIAS minitar)

boxify(emception-box)
boxify_add(emception-box clang lld llvm-nm llvm-ar llvm-objcopy llc)
boxify_add(emception-box wasm-as wasm-ctor-eval wasm-emscripten-finalize wasm-metadce wasm-opt wasm-shell)
boxify_add(emception-box node)
boxify_add(emception-box python)
boxify_add(emception-box tar)

target_compile_options(emception-box PUBLIC
    -fwasm-exceptions # for bynarien and quicknode
)
target_link_options(emception-box PUBLIC
    -Oz
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
