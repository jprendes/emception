cmake_minimum_required(VERSION 3.22)

project(emception VERSION 0.1 LANGUAGES C CXX)
set(CMAKE_CXX_EXTENSIONS OFF)

include(boxify/boxify.cmake)
include(fetch_archive.cmake)

add_subdirectory(emception-box)
add_subdirectory(package-box)
