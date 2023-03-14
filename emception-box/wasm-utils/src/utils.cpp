#include "wasm-utils/utils.hpp"

#include <sstream>
#include <fstream>
#include <ios>

namespace wasm_utils {

std::string readFile(std::string_view file_name) {
    std::ifstream f(file_name.data(), std::ios::in | std::ios::binary);
    if (!f.is_open()) {
        throw std::runtime_error("Could not read file: " + std::string(file_name));
    }
    std::stringstream sstream;
    sstream << f.rdbuf();
    return sstream.str();
}

void writeFile(std::string_view file_name, std::string_view content) {
    std::ofstream outfile(file_name.data(), std::ios::out | std::ios::binary);
    outfile.write(&content[0], content.size());
    outfile.close();
}

}