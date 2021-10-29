#include "WasmFile.hpp"

#include "WasmBuffer.hpp"
#include "WasmIO.hpp"

#include <cstdint>
#include <fstream>
#include <iostream>
#include <ios>

#include <stdexcept>

namespace wasm_transform {

WasmFile WasmIO<WasmFile>::read(WasmBuffer &readable) {
    if (readable.read<std::uint8_t>() != 0
        || readable.read<char>() != 'a'
        || readable.read<char>() != 's'
        || readable.read<char>() != 'm'
        || readable.read<std::uint8_t>() != 1
        || readable.read<std::uint8_t>() != 0
        || readable.read<std::uint8_t>() != 0
        || readable.read<std::uint8_t>() != 0)
    {
        throw std::runtime_error("Not a WebAssembly file.");
    }

    std::vector<Section> sections;
    while (!readable.eof()) {
        auto section = readable.read<Section>();
        sections.push_back(section);
    }

    return WasmFile{std::move(sections)};
}

void WasmIO<WasmFile>::write(WasmBuffer & writable, WasmFile const & x) {
    writable.write<std::uint8_t>(0);
    writable.write<char>('a');
    writable.write<char>('s');
    writable.write<char>('m');
    writable.write<std::uint8_t>(1);
    writable.write<std::uint8_t>(0);
    writable.write<std::uint8_t>(0);
    writable.write<std::uint8_t>(0);

    for (auto const & section : x.sections) {
        writable.write(section);
    }
}

}