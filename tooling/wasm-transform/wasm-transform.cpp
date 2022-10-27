#include <cstdint>
#include <iostream>
#include <stdexcept>
#include <string>
#include <string_view>

#include "WasmIO.hpp"
#include "utils.hpp"
#include "WasmBuffer.hpp"
#include "WasmFile.hpp"
#include "Section.hpp"
#include "LinkingSection.hpp"
#include "SymbolTable.hpp"
#include "InitFunctions.hpp"

using namespace wasm_transform;

std::string hash(std::string_view data) {
    return std::to_string(std::hash<std::string_view>{}(data));
}

void print_symbol(std::string_view header, SymbolInformation const & symbol) {
    std::cout << header << " \"" << *symbol.name << "\"" << std::endl;
    std::cout << "    weak ............ " << symbol.flags.weak << std::endl;
    std::cout << "    local ........... " << symbol.flags.local << std::endl;
    std::cout << "    hidden .......... " << symbol.flags.hidden << std::endl;
    std::cout << "    undefined ....... " << symbol.flags.undefined << std::endl;
    std::cout << "    exported ........ " << symbol.flags.exported << std::endl;
    std::cout << "    explicit_name ... " << symbol.flags.explicit_name << std::endl;
    std::cout << "    no_strip ........ " << symbol.flags.no_strip << std::endl;
    std::cout << std::endl;
}

void process_wasm_file(std::string_view input_file_name, std::string_view output_file_name) {
    auto input = WasmBuffer{readFile(input_file_name)};
    auto file = input.read<WasmFile>();

    SymbolTable symbol_table;
    InitFunctions init_functions;

    for (auto & section : file.sections) {
        if (section.id != 0) {
            // This is not the linking section
            continue;
        }

        auto content = section.buffer.as<CustomSectionContent>();
        if (content.name != "linking") {
            // This is not the linking section
            continue;
        }

        // We have the linking section
        auto linking = content.buffer.as<LinkingSection>();

        for (auto & subsection : linking.subsections) {
            if (subsection.id == 8) {
                symbol_table = subsection.buffer.as<SymbolTable>();
            } else if (subsection.id == 6) {
                init_functions = subsection.buffer.as<InitFunctions>();
                subsection.buffer = WasmBuffer::from(InitFunctions{});
            }
        }

        for (auto const & func : init_functions.functions) {
            auto & symbol = symbol_table.symbols[func.symbol_index];
            if (!symbol.name) {
                throw std::runtime_error("The init function doesn't have a name");
            }
            for (auto & c : *symbol.name) {
                if (c >= 'a' && c <= 'z') continue;
                if (c >= 'A' && c <= 'Z') continue;
                if (c == '_') continue;
                c = '_';
            }
            *symbol.name += "_" + hash(input_file_name);
            std::cout << "constructor " << func.priority << " " << *symbol.name << "\n";
            symbol.flags.local = false;
            symbol.flags.hidden = true;
        }

        // In recent versions of Emscripten the symbol
        // for the `main` function will have differente
        // names depending on wether argc/argv are taken as
        // parameters or not.
        SymbolInformation * main = nullptr;
        for (auto & symbol : symbol_table.symbols) {
            if (!symbol.name) continue;
            auto &name = *symbol.name;
            
            if (name == "main") {
                main = &symbol;
            } else if (!main && name == "__main_argc_argv") {
                main = &symbol;
            }
            
            if (name == "main"
                || name == "__main_argc_argv"
                || name == "__main_void"
                || name == "__original_main"
            ) {
                name += "_" + hash(input_file_name);
            }
        }

        if (main) {
            std::cout << "entrypoint " << *main->name << "\n";
        }

        for (auto & subsection : linking.subsections) {
            if (subsection.id == 8) {
                subsection.buffer = WasmBuffer::from(symbol_table);
            } else if (subsection.id == 6) {
                subsection.buffer = WasmBuffer::from(InitFunctions{});
            }
        }

        content.buffer = WasmBuffer::from(linking);
        section.buffer = WasmBuffer::from(content);
    }

    writeFile(output_file_name, WasmBuffer::from(file).data());
}

int main(int argc, char** argv) {
    if (argc < 3) {
        std::cerr << "Usage: wasm-transform input.o output.o" << std::endl;
        exit(1);
    }

    process_wasm_file(argv[1], argv[2]);

//            std::cout << "void weak_ref_to_" << symbol.first << "(void) __attribute__((weakref(\"" << symbol.first << "\")));" << std::endl;

    return 0;
}
