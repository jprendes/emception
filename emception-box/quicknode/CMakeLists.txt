FetchContent_Declare(quickjspp
  URL https://github.com/ftk/quickjspp/archive/9cee4b4d27271d54b95f6f42bfdc534ebeaaeb72.zip
)
FetchContent_MakeAvailable(quickjspp)

add_executable(quicknode EXCLUDE_FROM_ALL main.cpp)
target_link_libraries(quicknode quickjspp quickjs)
target_compile_features(quicknode PUBLIC cxx_std_17)
target_link_options(quicknode PUBLIC "-sALLOW_MEMORY_GROWTH" "-sNODERAWFS")