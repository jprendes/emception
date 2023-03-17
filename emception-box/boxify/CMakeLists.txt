cmake_minimum_required(VERSION 3.22)

project(boxify VERSION 0.1 LANGUAGES CXX)
set(CMAKE_CXX_EXTENSIONS OFF)

add_subdirectory(wasm-utils)

add_executable(boxify boxify.cpp)
target_link_libraries(boxify wasm-utils)
target_compile_features(boxify PRIVATE cxx_std_17)
