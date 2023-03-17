#include "wasm-utils/InitFunctions.hpp"

#include "wasm-utils/WasmIO.hpp"
#include "wasm-utils/WasmBuffer.hpp"

#include <cstdint>
#include <vector>

namespace wasm_utils {

InitFunction WasmIO<InitFunction>::read(WasmBuffer &readable) {
    return InitFunction{
        readable.read<std::uint32_t>(),
        readable.read<std::uint32_t>(),
    };
}

void WasmIO<InitFunction>::write(WasmBuffer &writable, InitFunction const & x) {
    writable.write<std::uint32_t>(x.priority);
    writable.write<std::uint32_t>(x.symbol_index);
}

InitFunctions WasmIO<InitFunctions>::read(WasmBuffer &readable) {
    return InitFunctions{
        readable.read<std::vector<InitFunction>>(),
    };
}

void WasmIO<InitFunctions>::write(WasmBuffer &writable, InitFunctions const & x) {
    writable.write(x.functions);
}

}