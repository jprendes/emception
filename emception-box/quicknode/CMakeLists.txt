cmake_minimum_required(VERSION 3.22)

project(quicknode VERSION 0.1 LANGUAGES CXX)
set(CMAKE_CXX_EXTENSIONS OFF)

fetch_archive("ftk/quickjspp" "9cee4b4d27271d54b95f6f42bfdc534ebeaaeb72" quickjspp_ARCHIVE)

FetchContent_Declare(quickjspp URL "${quickjspp_ARCHIVE}")
FetchContent_MakeAvailable(quickjspp)

add_executable(quicknode main.cpp)
target_link_libraries(quicknode quickjspp quickjs)
target_compile_features(quicknode PUBLIC cxx_std_17)
