#pragma once

#include "WasmIO.hpp"

#include <cstdint>
#include <vector>

namespace wasm_transform {

struct InitFunction {
    std::uint32_t priority;
    std::uint32_t symbol_index;
};

template <>
struct WasmIO<InitFunction> {
    static InitFunction read(WasmBuffer & readable);
    static void write(WasmBuffer &, InitFunction const &);
};

class InitFunctions {
  public:
    std::vector<InitFunction> functions;
};

template <>
struct WasmIO<InitFunctions> {
    static InitFunctions read(WasmBuffer & readable);
    static void write(WasmBuffer &, InitFunctions const &);
};

}