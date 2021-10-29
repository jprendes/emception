#include "Buffer.hpp"

#include <stdexcept>
#include <type_traits>

namespace wasm_transform {

Buffer::Buffer(std::string buffer) : m_data(std::move(buffer)) {}
Buffer::Buffer(std::string_view view) : m_data(std::move(view)) {}
Buffer::Buffer(Buffer const &) = default;
Buffer::Buffer(Buffer &&) = default;
Buffer::Buffer() : Buffer(std::string("")) {}

Buffer & Buffer::operator=(std::string buffer) {
    m_data = std::move(buffer);
    return *this;
}
Buffer & Buffer::operator=(std::string_view view) {
    m_data = std::move(view);
    return *this;
}
Buffer & Buffer::operator=(Buffer const &) = default;
Buffer & Buffer::operator=(Buffer &&) = default;

std::string_view Buffer::view() const {
    return std::visit([](auto&& arg) {
        using T = std::decay_t<decltype(arg)>;
        if constexpr (std::is_same_v<T, std::string_view>) {
            return arg;
        } else if constexpr (std::is_same_v<T, std::string>) {
            return std::string_view{&arg[0], arg.size()};
        } else {
            static_assert(always_false_v<T>, "non-exhaustive visitor!");
        }
    }, m_data);
}

std::string * Buffer::buffer() {
    return std::visit([](auto&& arg) {
        using T = std::decay_t<decltype(arg)>;
        if constexpr (std::is_same_v<T, std::string_view>) {
            return (std::string *)nullptr;
        } else if constexpr (std::is_same_v<T, std::string>) {
            return &arg;
        } else {
            static_assert(always_false_v<T>, "non-exhaustive visitor!");
        }
    }, m_data);
}

bool Buffer::owned() const {
    return std::visit([this](auto&& arg) {
        using T = std::decay_t<decltype(arg)>;
        if constexpr (std::is_same_v<T, std::string_view>) {
            return false;
        } else if constexpr (std::is_same_v<T, std::string>) {
            return true;
        } else {
            static_assert(always_false_v<T>, "non-exhaustive visitor!");
        }
    }, m_data);
}

Buffer & Buffer::own() {
    if (!owned()) {
        auto v = view();
        m_data = std::string(v.begin(), v.end());
    }
    return *this;
}

size_t Buffer::size() const {
    return view().size();
}

char const & Buffer::operator[](size_t i) const {
    return view()[i];
}

Buffer Buffer::slice(size_t start, size_t length) const {
    return Buffer(view().substr(start, length));
}

}