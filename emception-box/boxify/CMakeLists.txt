add_executable(boxify EXCLUDE_FROM_ALL boxify.cpp)
target_link_libraries(boxify wasm-utils)
target_compile_features(boxify PRIVATE cxx_std_17)
target_link_options(boxify PUBLIC "-sALLOW_MEMORY_GROWTH" "-sNODERAWFS")
