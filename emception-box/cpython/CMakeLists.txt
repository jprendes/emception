fetch_archive("python/cpython" "b8a9f13abb61bd91a368e2d3f339de736863050f" cpython_ARCHIVE)

FetchContent_Declare(cpython
    URL           "${cpython_ARCHIVE}"
    PATCH_COMMAND patch -p1 -i ${CMAKE_CURRENT_SOURCE_DIR}/cpython.patch && autoreconf -i
)

FetchContent_MakeAvailable(cpython)
FetchContent_GetProperties(cpython)

file(MAKE_DIRECTORY ${cpython_BINARY_DIR}-host)

add_custom_command(OUTPUT ${cpython_BINARY_DIR}-host/python
    COMMAND
        ${cpython_SOURCE_DIR}/configure -C
        && ${CMAKE_CURRENT_LIST_DIR}/parallel_make.sh -s

    USES_TERMINAL
    WORKING_DIRECTORY ${cpython_BINARY_DIR}-host
    COMMAND_EXPAND_LISTS
    VERBATIM
)

execute_process(COMMAND ${cpython_SOURCE_DIR}/config.guess OUTPUT_STRIP_TRAILING_WHITESPACE OUTPUT_VARIABLE cpython_CONFIG_GUESS)
add_custom_command(OUTPUT ${cpython_BINARY_DIR}/Makefile
    COMMAND
        env
            CONFIG_SITE=${cpython_SOURCE_DIR}/Tools/wasm/config.site-wasm32-emscripten
            LIBSQLITE3_CFLAGS=" "
            BZIP2_CFLAGS=" "
            PYTHONPATH=${cpython_SOURCE_DIR}/Lib
            OPT="-DNDEBUG -fwrapv -Oz -Wall"
            emconfigure ${cpython_SOURCE_DIR}/configure -C
                --host=wasm32-unknown-emscripten
                --build=${cpython_CONFIG_GUESS}
                --with-emscripten-target=browser
                --disable-wasm-dynamic-linking
                --with-build-python=${cpython_BINARY_DIR}-host/python
        && cat ${CMAKE_CURRENT_SOURCE_DIR}/Makefile.append >> ${cpython_BINARY_DIR}/Makefile
    
    DEPENDS
        ${cpython_BINARY_DIR}-host/python
        ${CMAKE_CURRENT_SOURCE_DIR}/Makefile.append

    USES_TERMINAL
    WORKING_DIRECTORY ${cpython_BINARY_DIR}
    COMMAND_EXPAND_LISTS
    VERBATIM
)

add_custom_command(
    OUTPUT
        ${cpython_BINARY_DIR}/Programs/python.o
        ${cpython_BINARY_DIR}/libpython-bundle.a
        ${cpython_BINARY_DIR}/pythonstdlib.zip
    
    COMMAND ${CMAKE_CURRENT_LIST_DIR}/parallel_make.sh -s Programs/python.o libpython-bundle.a pythonstdlib.zip
    USES_TERMINAL
    DEPENDS ${cpython_BINARY_DIR}/Makefile
    WORKING_DIRECTORY ${cpython_BINARY_DIR}
    COMMAND_EXPAND_LISTS
    VERBATIM
)

add_executable(python ${cpython_BINARY_DIR}/Programs/python.o)
target_link_libraries(python m ${cpython_BINARY_DIR}/libpython-bundle.a)
set_target_properties(python PROPERTIES LINKER_LANGUAGE CXX)
target_link_options(python PUBLIC -sUSE_ZLIB --preload-file=${cpython_BINARY_DIR}/usr/local@/usr/local)
