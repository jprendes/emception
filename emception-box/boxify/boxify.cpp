#include <cstdint>
#include <iostream>
#include <map>
#include <stdexcept>
#include <string>
#include <string_view>
#include <sstream>
#include <optional>

#include "wasm-utils/WasmIO.hpp"
#include "wasm-utils/utils.hpp"
#include "wasm-utils/WasmBuffer.hpp"
#include "wasm-utils/WasmFile.hpp"
#include "wasm-utils/Section.hpp"
#include "wasm-utils/LinkingSection.hpp"
#include "wasm-utils/SymbolTable.hpp"
#include "wasm-utils/InitFunctions.hpp"

using namespace wasm_utils;

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

struct boxify_metadata {
    std::string entrypoint;
    std::multimap<uint32_t, std::string> constructors;
};

boxify_metadata boxify(std::string_view input_file_name, std::string_view output_file_name) {
    auto metadata = boxify_metadata{};

    auto data = readFile(input_file_name);
    auto unique_id = hash(input_file_name) + "_" + hash(output_file_name) + "_" + hash(data);
    auto input = WasmBuffer{data};
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
            *symbol.name += "_" + unique_id;
            //std::cout << "constructor " << func.priority << " " << *symbol.name << "\n";
            symbol.flags.local = false;
            symbol.flags.hidden = true;

            metadata.constructors.insert({ func.priority, *symbol.name });
        }

        // In recent versions of Emscripten the symbol
        // for the `main` function will have differente
        // names depending on wether argc/argv are taken as
        // parameters or not.
        SymbolInformation * entrypoint = nullptr;
        for (auto & symbol : symbol_table.symbols) {
            if (!symbol.name) continue;
            auto &name = *symbol.name;
            
            if (name == "main") {
                entrypoint = &symbol;
            } else if (!entrypoint && name == "__main_argc_argv") {
                entrypoint = &symbol;
            }
            
            if (name == "main"
                || name == "__main_argc_argv"
                || name == "__main_void"
                || name == "__original_main"
            ) {
                name += "_" + unique_id;
            }
        }

        if (!entrypoint) {
            throw std::runtime_error("Input file has no entry point");
        }

        metadata.entrypoint = *entrypoint->name;

        //std::cout << "entrypoint " << *main->name << "\n";

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

    return metadata;
}

const std::string boxified_main_template = R"xxx(// Autogenerated by boxify

#include <string>
#include <unordered_map>

#ifdef __cplusplus
extern "C" {
#endif

int {{entrypoint}}(int, const char **);
void {{constructor}}(void);

#ifdef __cplusplus
}
#endif

static int boxed_main(int argc, const char ** argv) {
    {{constructor}}();
    return {{entrypoint}}(argc, argv);
}

inline std::unordered_map<std::string, int (*)(int,const char **)> _boxify_entrypoints_map;

__attribute__ ((constructor (65535)))
static void initialize() {
    _boxify_entrypoints_map.insert({"{{name}}", &boxed_main});
}
)xxx";

void print_boxified_main(std::string_view name, boxify_metadata const & metadata) {
    std::stringstream ss(boxified_main_template);
    std::string line;

    while(std::getline(ss,line,'\n')){
        if (auto pos = line.find("{{entrypoint}}"); pos != std::string::npos) {
            std::cout << line.replace(pos, 14, metadata.entrypoint) << "\n";
        } else
        if (auto pos = line.find("{{constructor}}"); pos != std::string::npos) {
            for (auto const & [priority, constructor] : metadata.constructors) {
                auto copy = line;
                std::cout << copy.replace(pos, 15, constructor) << "\n";
            }
        } else
        if (auto pos = line.find("{{name}}"); pos != std::string::npos) {
            std::cout << line.replace(pos, 8, name) << "\n";
        } else {
            std::cout << line << "\n";
        }
    }
}

int main(int argc, char** argv) {
    if (argc < 3) {
        std::cerr << "Usage: boxify <name> <input.o> <output.o>\n";
        exit(1);
    }

    auto metadata = boxify(argv[2], argv[3]);
    print_boxified_main(argv[1], metadata);

    return 0;
}
