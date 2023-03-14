function(boxify BOX_NAME)
    add_executable(${BOX_NAME} ${CMAKE_CURRENT_BINARY_DIR}/box.cpp)
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
            COMMAND boxify
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

file(GENERATE OUTPUT ${CMAKE_CURRENT_BINARY_DIR}/box.cpp CONTENT "
#include <string>
#include <unordered_map>
inline std::unordered_map<std::string, int (*)(int,const char **)> _boxify_entrypoints_map;

int main(int argc, const char ** argv) {
    if (argc < 1) return 1;
    const char * argv0 = argv[0];
    --argc;
    ++argv;
    if (_boxify_entrypoints_map.count(argv0) == 0) return 1;
    return _boxify_entrypoints_map.at(argv0)(argc, argv);
}
")
