#include "WasmIO.hpp"

#include "WasmBuffer.hpp"

#include <cstdint>
#include <stdexcept>
#include <string_view>

#include <iostream>

namespace wasm_transform {

std::uint8_t WasmIO<std::uint8_t>::read(WasmBuffer &readable) {
    return readable.readByte();
}

void WasmIO<std::uint8_t>::write(WasmBuffer &writable, std::uint8_t x) {
    writable.writeByte(x);
}

char WasmIO<char>::read(WasmBuffer &readable) {
    return readable.read<std::uint8_t>();
}

void WasmIO<char>::write(WasmBuffer &writable, char x) {
    writable.write<std::uint8_t>(x);
}

std::uint32_t WasmIO<std::uint32_t>::read(WasmBuffer &readable) {
    int i = 0;
    std::uint32_t part = 0, result = 0;
    do {
        part = readable.read<std::uint8_t>();
        result += ((part & 0x7F) << i);
        i += 7;
    } while (part & 0x80);
    return result;
}

void WasmIO<std::uint32_t>::write(WasmBuffer &writable, std::uint32_t x) {
    do {
        std::uint8_t byte = x & 0x7F;
        x -= x & 0x7F;
        x >>= 7;
        if (x)
            byte |= 0x80;
        writable.write(byte);
    } while (x);
}

std::uint64_t WasmIO<std::uint64_t>::read(WasmBuffer &readable) {
    int i = 0;
    std::uint64_t part = 0, result = 0;
    do {
        part = readable.read<std::uint8_t>();
        result += ((part & 0x7F) << i);
        i += 7;
    } while (part & 0x80);
    return result;
}

void WasmIO<std::uint64_t>::write(WasmBuffer &writable, std::uint64_t x) {
    do {
        std::uint8_t byte = x & 0x7F;
        x -= x & 0x7F;
        x >>= 7;
        if (x)
            byte |= 0x80;
        writable.write(byte);
    } while (x);
}

padded_uint32_t::padded_uint32_t(size_t x) : val(x) {}
padded_uint32_t::padded_uint32_t(std::uint32_t x) : val(x) {}

padded_uint32_t WasmIO<padded_uint32_t>::read(WasmBuffer &readable) {
    return {readable.read<std::uint32_t>()};
}

void WasmIO<padded_uint32_t>::write(WasmBuffer &writable, padded_uint32_t y) {
    auto x = y.val;
    for (size_t n = 0; n < 5; n++) {
        std::uint8_t byte = x & 0x7F;
        x -= x & 0x7F;
        x >>= 7;
        if (n < 4)
            byte |= 0x80;
        writable.write(byte);
    }
}

std::string_view WasmIO<std::string_view>::read(WasmBuffer &readable) {
    auto size = readable.read<std::uint32_t>();
    return readable.readBytes(size);
}

void WasmIO<std::string_view>::write(WasmBuffer &writable, std::string_view x) {
    writable.write<std::uint32_t>(x.size());
    writable.writeBytes(x);
}

std::string WasmIO<std::string>::read(WasmBuffer &readable) {
    auto view = readable.read<std::string_view>();
    return std::string{view.begin(), view.end()};
}

void WasmIO<std::string>::write(WasmBuffer &writable, std::string const & x) {
    writable.write<std::string_view>(x);
}

}
