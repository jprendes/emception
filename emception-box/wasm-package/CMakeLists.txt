add_executable(wasm-package EXCLUDE_FROM_ALL wasm-package.cpp)
target_link_libraries(wasm-package wasm-utils)
target_compile_features(wasm-package PRIVATE cxx_std_17)
target_link_options(wasm-package PUBLIC "-sALLOW_MEMORY_GROWTH" "-sNODERAWFS")
