set(BUILD_TESTS OFF CACHE BOOL "" FORCE)

fetch_archive("WebAssembly/binaryen" "8ab8e40d15a4d9f28ced76d28232f9e791f161d3" binaryen_ARCHIVE)

FetchContent_Declare(binaryen
    URL           "${binaryen_ARCHIVE}"
    PATCH_COMMAND patch -p1 -i ${CMAKE_CURRENT_SOURCE_DIR}/binaryen.patch
)
FetchContent_MakeAvailable(binaryen)
