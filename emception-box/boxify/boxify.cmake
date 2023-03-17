set(BOXIFY_SOURCE_DIR ${CMAKE_CURRENT_LIST_DIR})

# Make a native build of boxify
add_custom_command(OUTPUT ${CMAKE_BINARY_DIR}/native-boxify/CMakeCache.txt
    COMMAND ${CMAKE_COMMAND}
        -S ${BOXIFY_SOURCE_DIR}
        -B ${CMAKE_BINARY_DIR}/native-boxify
        -G ${CMAKE_GENERATOR}
        -DCMAKE_BUILD_TYPE=Release
    
    COMMENT Configuring native `boxify`
    USES_TERMINAL
    COMMAND_EXPAND_LISTS
    VERBATIM
)

add_custom_command(OUTPUT ${CMAKE_BINARY_DIR}/native-boxify/boxify
    COMMAND ${CMAKE_COMMAND} --build ${CMAKE_BINARY_DIR}/native-boxify -- boxify

    DEPENDS ${CMAKE_BINARY_DIR}/native-boxify/CMakeCache.txt
    COMMENT Building native `boxify`
    USES_TERMINAL
    COMMAND_EXPAND_LISTS
    VERBATIM
)

add_custom_target(build-native-boxify DEPENDS ${CMAKE_BINARY_DIR}/native-boxify/boxify)

add_executable(native-boxify IMPORTED GLOBAL)
set_property(TARGET native-boxify PROPERTY IMPORTED_LOCATION ${CMAKE_BINARY_DIR}/native-boxify/boxify)
add_dependencies(native-boxify build-native-boxify)

function(boxify BOX_NAME)
    add_executable(${BOX_NAME} ${BOXIFY_SOURCE_DIR}/box.cpp)
    target_compile_features(${BOX_NAME} PRIVATE cxx_std_17)
    set_target_properties(${BOX_NAME} PROPERTIES SUFFIX ".mjs")
    boxify_add(${BOX_NAME} ${ARGN})
endfunction()

function(boxify_add BOX_NAME)
    foreach(SUBTARGET ${ARGN})
        set(SUBTARGET_OBJECTS "$<TARGET_OBJECTS:${SUBTARGET}>" "$<FILTER:$<TARGET_PROPERTY:${SUBTARGET},SOURCES>,INCLUDE,\.o$>")
        set(SUBTARGET_LIBS "$<TARGET_PROPERTY:${SUBTARGET},LINK_LIBRARIES>" "$<TARGET_PROPERTY:${SUBTARGET},INTERFACE_LINK_LIBRARIES>")
        add_custom_command(OUTPUT ${BOX_NAME}_${SUBTARGET}_intermediate.o
            COMMAND wasm-ld
                -r ${SUBTARGET_OBJECTS}
                -o ${BOX_NAME}_${SUBTARGET}_intermediate.o

            DEPENDS ${SUBTARGET_OBJECTS}
            COMMAND_EXPAND_LISTS
            VERBATIM
        )
        add_custom_command(OUTPUT ${BOX_NAME}_${SUBTARGET}.o ${BOX_NAME}_${SUBTARGET}.cpp
            COMMAND native-boxify
                ${SUBTARGET}
                ${BOX_NAME}_${SUBTARGET}_intermediate.o
                ${BOX_NAME}_${SUBTARGET}.o
                > ${BOX_NAME}_${SUBTARGET}.cpp

            DEPENDS ${BOX_NAME}_${SUBTARGET}_intermediate.o

            COMMAND_EXPAND_LISTS
            VERBATIM
        )
        target_sources(${BOX_NAME} PUBLIC ${BOX_NAME}_${SUBTARGET}.o ${BOX_NAME}_${SUBTARGET}.cpp)
        target_link_libraries(${BOX_NAME} ${SUBTARGET_LIBS})
    endforeach()
endfunction()