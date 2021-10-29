#include "Section.hpp"
#include "WasmIO.hpp"
#include <cstdint>
#include <string_view>

namespace wasm_transform {

CustomSectionContent WasmIO<CustomSectionContent>::read(WasmBuffer & readable) {
    return CustomSectionContent{
        readable.read<std::string>(),
        {readable.readBytes()},
    };
}

void WasmIO<CustomSectionContent>::write(WasmBuffer & writable, CustomSectionContent const & x) {
    writable.write<std::string>(x.name);
    writable.writeBytes(x.buffer.data());
}

Section WasmIO<Section>::read(WasmBuffer & readable) {
    return Section{
        readable.read<std::uint8_t>(),
        {readable.read<std::string_view>()},
    };
}

void WasmIO<Section>::write(WasmBuffer & writable, Section const & x) {
    writable.write<std::uint8_t>(x.id);
    writable.write<padded_uint32_t>(x.buffer.size());
    writable.writeBytes(x.buffer.data());
}

}