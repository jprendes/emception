set(BROTLI_DISABLE_TESTS ON CACHE BOOL "" FORCE)

FetchContent_Declare(brotli
    URL https://github.com/google/brotli/archive/62662f87cdd96deda90ac817de94e3c4af75226a.zip
)
FetchContent_GetProperties(brotli)
if(NOT brotli_POPULATED)
  FetchContent_Populate(brotli)
  add_subdirectory(${brotli_SOURCE_DIR} ${brotli_BINARY_DIR} EXCLUDE_FROM_ALL)
endif()

target_link_options(brotli PUBLIC "-sALLOW_MEMORY_GROWTH" "-sNODERAWFS")