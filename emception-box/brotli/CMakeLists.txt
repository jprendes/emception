set(BROTLI_DISABLE_TESTS ON CACHE BOOL "" FORCE)

fetch_archive("google/brotli" "62662f87cdd96deda90ac817de94e3c4af75226a" brotli_ARCHIVE)

FetchContent_Declare(brotli
    URL           "${brotli_ARCHIVE}"
    PATCH_COMMAND patch -p1 -i ${CMAKE_CURRENT_SOURCE_DIR}/brotli.patch
)
FetchContent_MakeAvailable(brotli)
