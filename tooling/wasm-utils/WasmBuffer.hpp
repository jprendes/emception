#pragma once

#include "Buffer.hpp"
#include "WasmIO.hpp"

#include <cstdint>
#include <stdexcept>
#include <string_view>
#include <type_traits>
#include <vector>
#include <string>

namespace wasm_transform {

class WasmBuffer {
  private:
    Buffer m_buffer;
    size_t m_index;

  public:
    WasmBuffer(Buffer buffer = Buffer());
    WasmBuffer(WasmBuffer const &) = default;
    WasmBuffer(WasmBuffer &&) = default;

    WasmBuffer & operator=(WasmBuffer const &) = default;
    WasmBuffer & operator=(WasmBuffer &&) = default;

    bool eof() const;
    size_t size() const;
    std::string_view data() const;

    bool owned() const;
    WasmBuffer & own();

    WasmBuffer slice(size_t start = 0, size_t length = std::string_view::npos) const;

    template<typename T>
    T read() {
        return ::wasm_transform::WasmIO<T>::read(*this);
    }

    char readByte();
    std::string_view readBytes(size_t length = std::string_view::npos);

    template<typename T>
    void write(T const & val) {
        ::wasm_transform::WasmIO<T>::write(*this, val);
    }

    void writeByte(char);
    void writeBytes(std::string_view data);

    template <typename T>
    T as() {
        auto result = read<T>();
        if (!eof()) {
            throw std::runtime_error("Unused bytes in buffer");
        }
        return result;
    }

    template <typename T>
    static WasmBuffer from(T const & x) {
        WasmBuffer buffer;
        buffer.write<T>(x);
        return buffer;
    }
};

}
