add_library(wasm-utils
  src/Buffer.cpp
  src/InitFunctions.cpp
  src/LinkingSection.cpp
  src/Section.cpp
  src/SymbolTable.cpp
  src/utils.cpp
  src/WasmBuffer.cpp
  src/WasmFile.cpp
  src/WasmIO.cpp
)
target_include_directories(wasm-utils PUBLIC include)
target_compile_features(wasm-utils PUBLIC cxx_std_17)