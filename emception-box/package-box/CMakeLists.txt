add_subdirectory(../brotli brotli EXCLUDE_FROM_ALL)
add_subdirectory(../libarchive libarchive EXCLUDE_FROM_ALL)

add_executable(tar ALIAS minitar)

boxify(package-box)
boxify_add(package-box tar)
boxify_add(package-box brotli)

target_link_options(package-box PUBLIC
    -sALLOW_MEMORY_GROWTH
)

target_link_options(package-box PUBLIC
    -sEXPORTED_FUNCTIONS=_main,_free,_malloc
    -sEXPORTED_RUNTIME_METHODS=FS,PROXYFS,ERRNO_CODES,allocateUTF8
    -lproxyfs.js
    --js-library=${CMAKE_SOURCE_DIR}/emlib/fsroot.js
)