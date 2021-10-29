#include "SymbolTable.hpp"

#include "WasmIO.hpp"
#include "WasmBuffer.hpp"
#include <cstdint>

#include <stdexcept>

namespace wasm_transform {

SymbolFlags WasmIO<SymbolFlags>::read(WasmBuffer & readable) {
    auto flags = readable.read<std::uint32_t>();
    return SymbolFlags{
        (flags & 0x01) != 0,
        (flags & 0x02) != 0,
        (flags & 0x04) != 0,
        (flags & 0x10) != 0,
        (flags & 0x20) != 0,
        (flags & 0x40) != 0,
        (flags & 0x80) != 0,
    };
}

void WasmIO<SymbolFlags>::write(WasmBuffer & writable, SymbolFlags x) {
    writable.write<std::uint32_t>(
        (x.weak          ? 0x01 : 0) |
        (x.local         ? 0x02 : 0) |
        (x.hidden        ? 0x04 : 0) |
        (x.undefined     ? 0x10 : 0) |
        (x.exported      ? 0x20 : 0) |
        (x.explicit_name ? 0x40 : 0) |
        (x.no_strip      ? 0x80 : 0)
    );
}

SymbolKind WasmIO<SymbolKind>::read(WasmBuffer & readable) {
    auto kind = readable.read<std::uint8_t>();
    return static_cast<SymbolKind>(kind);
}

void WasmIO<SymbolKind>::write(WasmBuffer & writable, SymbolKind x) {
    writable.write<std::uint8_t>(static_cast<std::uint8_t>(x));
}

SymbolInformation WasmIO<SymbolInformation>::read(WasmBuffer & readable) {
    auto kind = readable.read<SymbolKind>();
    auto flags = readable.read<SymbolFlags>();

    SymbolInformation info{kind, flags, std::nullopt, std::nullopt, std::nullopt, std::nullopt};

    switch (kind) {
        case SymbolKind::Function:
        case SymbolKind::Global:
        case SymbolKind::Event:
        case SymbolKind::Table:
            info.index = readable.read<std::uint32_t>();
            if (flags.explicit_name || !flags.undefined) {
                info.name = readable.read<std::string>();
            }
            break;
        case SymbolKind::Data:
            info.name = readable.read<std::string>();
            if (!flags.undefined) {
                info.index = readable.read<std::uint32_t>();
                info.offset = readable.read<std::uint32_t>();
                info.size = readable.read<std::uint32_t>();
            }
            break;
        case SymbolKind::Section:
            info.index = readable.read<std::uint32_t>();
            break;
        default:
            throw std::runtime_error("Unknown symbol type.");
    }

    return info;
}

void WasmIO<SymbolInformation>::write(WasmBuffer & writable, SymbolInformation const & x) {
    writable.write(x.kind);
    writable.write(x.flags);

    switch (x.kind) {
        case SymbolKind::Function:
        case SymbolKind::Global:
        case SymbolKind::Event:
        case SymbolKind::Table:
            if (!x.index) throw std::runtime_error("Expected symbol to have an index");
            writable.write<std::uint32_t>(*x.index);
            if (x.flags.explicit_name || !x.flags.undefined) {
                if (!x.name) throw std::runtime_error("Expected symbol to have a name");
                writable.write<std::string>(*x.name);
            }
            break;
        case SymbolKind::Data:
            if (!x.name) throw std::runtime_error("Expected symbol to have a name");
            writable.write<std::string>(*x.name);
            if (!x.flags.undefined) {
                if (!x.index) throw std::runtime_error("Expected symbol to have an index");
                writable.write<std::uint32_t>(*x.index);
                if (!x.offset) throw std::runtime_error("Expected symbol to have an offset");
                writable.write<std::uint32_t>(*x.offset);
                if (!x.size) throw std::runtime_error("Expected symbol to have a size");
                writable.write<std::uint32_t>(*x.size);
            }
            break;
        case SymbolKind::Section:
            if (!x.index) throw std::runtime_error("Expected symbol to have an index");
            writable.write<std::uint32_t>(*x.index);
            break;
        default:
            throw std::runtime_error("Unknown symbol type.");
    }
}

SymbolTable WasmIO<SymbolTable>::read(WasmBuffer & readable) {
    return SymbolTable{
        readable.read<std::vector<SymbolInformation>>()
    };
}

void WasmIO<SymbolTable>::write(WasmBuffer & writable, SymbolTable const & x) {
    writable.write(x.symbols);
}

}
