FetchContent_Declare(cpython
    URL           https://github.com/python/cpython/archive/b8a9f13abb61bd91a368e2d3f339de736863050f.zip
    PATCH_COMMAND patch -p1 -i ${CMAKE_CURRENT_SOURCE_DIR}/cpython.patch && autoreconf -i
)

FetchContent_MakeAvailable(cpython)
FetchContent_GetProperties(cpython)

execute_process(COMMAND ${cpython_SOURCE_DIR}/config.guess OUTPUT_STRIP_TRAILING_WHITESPACE OUTPUT_VARIABLE cpython_CONFIG_GUESS)
execute_process(COMMAND nproc OUTPUT_STRIP_TRAILING_WHITESPACE OUTPUT_VARIABLE cpython_NPROC)

file(MAKE_DIRECTORY ${cpython_BINARY_DIR}-host)

add_custom_command(OUTPUT ${cpython_BINARY_DIR}-host/python
    COMMAND ${cpython_SOURCE_DIR}/configure -C && make -j${cpython_NPROC}
    USES_TERMINAL
    WORKING_DIRECTORY ${cpython_BINARY_DIR}-host
    COMMAND_EXPAND_LISTS
    VERBATIM
)

add_custom_command(OUTPUT ${cpython_BINARY_DIR}/Makefile
    COMMAND env
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
    
    DEPENDS ${cpython_BINARY_DIR}-host/python
    USES_TERMINAL
    WORKING_DIRECTORY ${cpython_BINARY_DIR}
    COMMAND_EXPAND_LISTS
    VERBATIM
)

add_custom_command(OUTPUT ${cpython_BINARY_DIR}/Makefile.emception
    COMMAND cat
        ${cpython_BINARY_DIR}/Makefile
        ${CMAKE_CURRENT_SOURCE_DIR}/Makefile.append
        > ${cpython_BINARY_DIR}/Makefile.emception
    
    DEPENDS
        ${cpython_BINARY_DIR}/Makefile
        ${CMAKE_CURRENT_SOURCE_DIR}/Makefile.append
    WORKING_DIRECTORY ${cpython_BINARY_DIR}
    COMMAND_EXPAND_LISTS
    VERBATIM
)

add_custom_command(
    OUTPUT
        ${cpython_BINARY_DIR}/Programs/python.o
        ${cpython_BINARY_DIR}/libpython-bundle.a
    COMMAND emmake make -j${cpython_NPROC}
        -f ${cpython_BINARY_DIR}/Makefile.emception
        Programs/python.o
        libpython-bundle.a
    USES_TERMINAL
    DEPENDS ${cpython_BINARY_DIR}/Makefile.emception
    WORKING_DIRECTORY ${cpython_BINARY_DIR}
    COMMAND_EXPAND_LISTS
    VERBATIM
)

add_custom_command(OUTPUT ${cpython_BINARY_DIR}/pythonstdlib.zip
    COMMAND env
        PYTHONPATH=${cpython_SOURCE_DIR}/Lib
        emmake make -j${cpython_NPROC}
            -f ${cpython_BINARY_DIR}/Makefile.emception
            pythonstdlib.zip
    USES_TERMINAL
    DEPENDS ${cpython_BINARY_DIR}/Makefile.emception
    WORKING_DIRECTORY ${cpython_BINARY_DIR}
    COMMAND_EXPAND_LISTS
    VERBATIM
)

add_executable(python EXCLUDE_FROM_ALL ${cpython_BINARY_DIR}/Programs/python.o)
target_link_libraries(python m ${cpython_BINARY_DIR}/libpython-bundle.a)
set_target_properties(python PROPERTIES LINKER_LANGUAGE CXX)
target_link_options(boxify PUBLIC "-sALLOW_MEMORY_GROWTH" "-sNODERAWFS" "-sUSE_ZLIB")
