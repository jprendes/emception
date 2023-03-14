set(BUILD_TESTS OFF CACHE BOOL "" FORCE)

FetchContent_Declare(binaryen
    URL https://github.com/WebAssembly/binaryen/archive/8ab8e40d15a4d9f28ced76d28232f9e791f161d3.zip
)
FetchContent_GetProperties(binaryen)
if(NOT binaryen_POPULATED)
  FetchContent_Populate(binaryen)
  add_subdirectory(${binaryen_SOURCE_DIR} ${binaryen_BINARY_DIR} EXCLUDE_FROM_ALL)
endif()