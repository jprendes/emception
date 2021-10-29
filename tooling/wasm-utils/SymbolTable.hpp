#pragma once

#include "WasmIO.hpp"

#include <cstdint>
#include <vector>
#include <optional>

namespace wasm_transform {

struct SymbolFlags {
    bool weak;
    bool local;
    bool hidden;
    bool undefined;
    bool exported;
    bool explicit_name;
    bool no_strip;
};

template <>
struct WasmIO<SymbolFlags> {
    static SymbolFlags read(WasmBuffer & readable);
    static void write(WasmBuffer &, SymbolFlags);
};

enum class SymbolKind : std::uint8_t {
    Function = 0,
    Data = 1,
    Global = 2,
    Section = 3,
    Event = 4,
    Table = 5,
};

template <>
struct WasmIO<SymbolKind> {
    static SymbolKind read(WasmBuffer & readable);
    static void write(WasmBuffer &, SymbolKind);
};

struct SymbolInformation {
  public:
    SymbolKind kind;
    SymbolFlags flags;
    std::optional<std::uint32_t> index;
    std::optional<std::uint32_t> offset;
    std::optional<std::uint32_t> size;
    std::optional<std::string> name;
};

template <>
struct WasmIO<SymbolInformation> {
    static SymbolInformation read(WasmBuffer & readable);
    static void write(WasmBuffer &, SymbolInformation const &);
};

class SymbolTable {
  public:
    std::vector<SymbolInformation> symbols;
};

template <>
struct WasmIO<SymbolTable> {
    static SymbolTable read(WasmBuffer & readable);
    static void write(WasmBuffer &, SymbolTable const &);
};

}