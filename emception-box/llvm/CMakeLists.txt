set(LLVM_TARGETS_TO_BUILD "WebAssembly" CACHE INTERNAL "" FORCE)
set(LLVM_ENABLE_PROJECTS "clang;lld;clang-tools-extra" CACHE INTERNAL "" FORCE)

set(LLVM_ENABLE_DUMP OFF CACHE BOOL "" FORCE)
set(LLVM_ENABLE_ASSERTIONS OFF CACHE BOOL "" FORCE)
set(LLVM_ENABLE_EXPENSIVE_CHECKS OFF CACHE BOOL "" FORCE)
set(LLVM_ENABLE_BACKTRACES OFF CACHE BOOL "" FORCE)
set(LLVM_BUILD_TOOLS OFF CACHE BOOL "" FORCE)
set(LLVM_ENABLE_THREADS OFF CACHE BOOL "" FORCE)
set(LLVM_BUILD_LLVM_DYLIB OFF CACHE BOOL "" FORCE)
set(LLVM_INCLUDE_TESTS OFF CACHE BOOL "" FORCE)

add_compile_definitions(wait4=__syscall_wait4)

FetchContent_Declare(llvm
    URL           https://github.com/llvm/llvm-project/archive/d5a963ab8b40fcf7a99acd834e5f10a1a30cc2e5.zip
    PATCH_COMMAND patch -p1 -i ${CMAKE_CURRENT_SOURCE_DIR}/llvm-project.patch
    SOURCE_SUBDIR llvm
)

FetchContent_GetProperties(llvm)
if(NOT llvm_POPULATED)
  FetchContent_Populate(llvm)
  add_subdirectory(${llvm_SOURCE_DIR}/llvm ${llvm_BINARY_DIR} EXCLUDE_FROM_ALL)
endif()

# Using NODERAWFS for llvm-tblgen and clang-tblgen allows them to be used during
# the build process, avoiding having to compile host native versions of them.
target_link_options(llvm-tblgen PUBLIC "-sALLOW_MEMORY_GROWTH" "-sNODERAWFS")
target_link_options(clang-tblgen PUBLIC "-sALLOW_MEMORY_GROWTH" "-sNODERAWFS")
