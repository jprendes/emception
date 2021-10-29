#include "utils.hpp"

#include <fstream>
#include <ios>

namespace wasm_transform {

std::string readFile(std::string_view file_name) {
    std::string content;
    std::ifstream file(file_name.data(), std::ios::in | std::ios::binary);
    file.seekg(0, std::ios_base::end);
    content.resize(file.tellg());
    file.seekg(0, std::ios_base::beg);
    file.read(&content[0], content.size());
    if (file.gcount() != content.size()) {
        throw std::runtime_error("Unexpected EOF.");
    }
    return content;    
}

void writeFile(std::string_view file_name, std::string_view content) {
    std::ofstream outfile(file_name.data(), std::ios::out | std::ios::binary);
    outfile.write(&content[0], content.size());
    outfile.close();
}

}