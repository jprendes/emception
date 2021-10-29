#pragma once

#include <cstdint>
#include <variant>
#include <vector>
#include <string>
#include <type_traits>
#include <variant>

namespace wasm_transform {

class WasmBuffer;

template <typename T>
struct WasmIO;

template <>
struct WasmIO<std::uint8_t> {
    static std::uint8_t read(WasmBuffer &);
    static void write(WasmBuffer &, std::uint8_t);
};

template <>
struct WasmIO<char> {
    static char read(WasmBuffer &);
    static void write(WasmBuffer &, char);
};

template <>
struct WasmIO<std::uint32_t> {
    static std::uint32_t read(WasmBuffer &);
    static void write(WasmBuffer &, std::uint32_t);
};

template <>
struct WasmIO<std::uint64_t> {
    static std::uint64_t read(WasmBuffer &);
    static void write(WasmBuffer &, std::uint64_t);
};

struct padded_uint32_t {
    std::uint32_t val;

    padded_uint32_t(size_t);
    padded_uint32_t(std::uint32_t);
};

template <>
struct WasmIO<padded_uint32_t> {
    static padded_uint32_t read(WasmBuffer &);
    static void write(WasmBuffer &, padded_uint32_t);
};

template <>
struct WasmIO<std::string_view> {
    static std::string_view read(WasmBuffer &);
    static void write(WasmBuffer &, std::string_view);
};

template <>
struct WasmIO<std::string> {
    static std::string read(WasmBuffer &);
    static void write(WasmBuffer &, std::string const &);
};

template <typename T>
struct WasmIO<std::vector<T>> {
    static std::vector<T> read(WasmBuffer & readable) {
        auto size = WasmIO<std::uint32_t>::read(readable);
        std::vector<T> result;
        result.reserve(size);
        for (size_t i = 0; i < size; ++i) {
            result.push_back(WasmIO<T>::read(readable));
        }
        return result;
    }

    static void write(WasmBuffer &writable, std::vector<T> const & vec) {
        WasmIO<std::uint32_t>::write(writable, vec.size());
        for (auto const & el : vec) {
            WasmIO<T>::write(writable, el);
        }
    }
};

}