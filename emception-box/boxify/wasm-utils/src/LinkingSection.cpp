#include "wasm-utils/LinkingSection.hpp"

#include "wasm-utils/WasmIO.hpp"
#include "wasm-utils/WasmBuffer.hpp"
#include "wasm-utils/Section.hpp"

#include <algorithm>
#include <cstdint>
#include <stdexcept>
#include <vector>

namespace wasm_utils {

LinkingSection WasmIO<LinkingSection>::read(WasmBuffer & readable) {
    auto version = readable.read<std::uint32_t>();
    if (version != 2) {
        throw std::runtime_error("linking section is not on version 2");
    }

    LinkingSection result;
    std::vector<Section> subsections;

    while (!readable.eof()) {
        auto subsection = readable.read<Section>();
        subsections.push_back(subsection);
    }

    return {std::move(subsections)};
}

void WasmIO<LinkingSection>::write(WasmBuffer &writable, LinkingSection const & x) {
    writable.write<std::uint32_t>(2);
    for (auto const & subsection : x.subsections) {
        writable.write(subsection);
    }
}

}