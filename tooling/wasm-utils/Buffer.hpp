#pragma once

#include <variant>
#include <string>
#include <string_view>

namespace wasm_transform {

class Buffer {
  private:
    std::variant<std::string, std::string_view> m_data;
    template<class> static inline constexpr bool always_false_v = false;

  public:
    Buffer(std::string buffer);
    Buffer(std::string_view view);
    Buffer(Buffer const &);
    Buffer(Buffer &&);
    Buffer();

    Buffer & operator=(std::string buffer);
    Buffer & operator=(std::string_view view);
    Buffer & operator=(Buffer const &);
    Buffer & operator=(Buffer &&);

    std::string_view view() const;
    std::string * buffer();
    bool owned() const;
    Buffer & own();

    size_t size() const;
    char const & operator[](size_t i) const;

    Buffer slice(size_t start = 0, size_t length = std::string_view::npos) const;
};

}