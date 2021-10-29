#include "WasmIO.hpp"

#include "Section.hpp"

#include "WasmIO.hpp"

#include <string>

namespace wasm_transform {

class WasmFile {
  public:
    std::vector<Section> sections;
};

template <>
struct WasmIO<WasmFile> {
    static WasmFile read(WasmBuffer & readable);
    static void write(WasmBuffer &, WasmFile const &);
};

}