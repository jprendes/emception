#pragma once

#include "Section.hpp"

#include <vector>

namespace wasm_utils {

class LinkingSection {
  public:
    std::vector<Section> subsections;
};

template <>
struct WasmIO<LinkingSection> {
    static LinkingSection read(WasmBuffer & readable);
    static void write(WasmBuffer &, LinkingSection const &);
};

}