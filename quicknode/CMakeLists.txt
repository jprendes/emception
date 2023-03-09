cmake_minimum_required(VERSION 3.16)

project(quicknode VERSION 0.1 LANGUAGES CXX)
set(CMAKE_CXX_EXTENSIONS OFF)

include(FetchContent)
FetchContent_Declare(
  upstream_quickjspp
  GIT_REPOSITORY https://github.com/ftk/quickjspp.git
  GIT_TAG        9cee4b4d27271d54b95f6f42bfdc534ebeaaeb72
)
FetchContent_MakeAvailable(upstream_quickjspp)
FetchContent_GetProperties(upstream_quickjspp)
if(NOT upstream_quickjspp_POPULATED)
  FetchContent_Populate(upstream_quickjspp)
endif()

add_executable(quicknode main.cpp)
target_link_libraries(quicknode quickjspp quickjs)
target_compile_features(quicknode PUBLIC cxx_std_17)