#pragma once

#include "WasmBuffer.hpp"
#include "WasmIO.hpp"
#include <variant>

namespace wasm_transform {

struct CustomSectionContent {
    std::string name;
    WasmBuffer buffer;
};

template <>
struct WasmIO<CustomSectionContent> {
    static CustomSectionContent read(WasmBuffer & readable);
    static void write(WasmBuffer &, CustomSectionContent const &);
};

struct Section {
    std::uint8_t id;
    WasmBuffer buffer;
};

template <>
struct WasmIO<Section> {
    static Section read(WasmBuffer & readable);
    static void write(WasmBuffer &, Section const &);
};

}