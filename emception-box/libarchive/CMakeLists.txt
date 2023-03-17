set(ENABLE_TEST OFF CACHE BOOL "" FORCE)

fetch_archive("libarchive/libarchive" "aa09163691b955812a269451d1401435a09832d9" libarchive_ARCHIVE)

FetchContent_Declare(libarchive URL "${libarchive_ARCHIVE}")
FetchContent_MakeAvailable(libarchive)
FetchContent_GetProperties(libarchive)

set_target_properties(archive_static PROPERTIES OUTPUT_NAME archive_static)

add_executable(minitar ${libarchive_SOURCE_DIR}/examples/minitar/minitar.c)
target_link_libraries(minitar archive_static)
target_include_directories(minitar PRIVATE ${libarchive_SOURCE_DIR}/libarchive/)
target_compile_definitions(minitar PUBLIC
    NO_BZIP2
    NO_COMPRESS
    NO_CPIO_EXTRACT
    NO_GZIP
    NO_LOOKUP
)
target_compile_options(archive_static PRIVATE -Wno-single-bit-bitfield-constant-conversion)
