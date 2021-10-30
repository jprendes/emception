#include "WasmBuffer.hpp"

#include <stdexcept>

namespace wasm_transform {

WasmBuffer::WasmBuffer(Buffer buffer)
  : m_buffer(std::move(buffer))
  , m_index(0)
{}

bool WasmBuffer::eof() const {
    return m_index >= m_buffer.size();
}

size_t WasmBuffer::size() const {
    return m_buffer.size();
}

std::string_view WasmBuffer::data() const {
    return m_buffer.view();
}

bool WasmBuffer::owned() const {
    return m_buffer.owned();
}

WasmBuffer & WasmBuffer::own() {
    m_buffer.own();
    return *this;
}

WasmBuffer WasmBuffer::slice(size_t start, size_t length) const {
    return {m_buffer.slice(start, length)};
}

char WasmBuffer::readByte() {
    if (eof()) {
        throw std::runtime_error("Unexpected EOF.");
    }
    return m_buffer[m_index++];
}
std::string_view WasmBuffer::readBytes(size_t length) {
    if (length == std::string_view::npos) {
        length = m_buffer.size() - m_index;
    }
    if (m_buffer.size() < m_index + length) {
        m_index = m_buffer.size();
        throw std::runtime_error("Unexpected EOF.");
    }
    std::string_view result{m_buffer.view().data() + m_index, length};
    m_index += length;
    return result;
}

void WasmBuffer::writeByte(char x) {
    m_buffer.own();
    m_buffer.buffer()->push_back(x);
}
void WasmBuffer::writeBytes(std::string_view data) {
    auto buffer = m_buffer.buffer();
    buffer->insert(buffer->end(), data.begin(), data.end());
}

}
