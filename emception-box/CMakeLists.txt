cmake_minimum_required(VERSION 3.22)

project(emception VERSION 0.1 LANGUAGES CXX)
set(CMAKE_CXX_EXTENSIONS OFF)

include(FetchContent)
include(boxify/boxify.cmake)

add_subdirectory(wasm-utils)
add_subdirectory(boxify)
add_subdirectory(binaryen)
add_subdirectory(brotli)
add_subdirectory(cpython)
add_subdirectory(llvm)
add_subdirectory(quicknode)
add_subdirectory(wasm-package)

add_executable(node ALIAS quicknode)

boxify(emception-box)
boxify_add(emception-box clang lld llvm-nm llvm-ar llvm-objcopy llc)
boxify_add(emception-box wasm-as wasm-ctor-eval wasm-emscripten-finalize wasm-metadce wasm-opt wasm-shell)
boxify_add(emception-box node)
boxify_add(emception-box python)

boxify(package-box)
boxify_add(package-box brotli)
boxify_add(package-box wasm-package)

