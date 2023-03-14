#pragma once

#include <string>
#include <string_view>

namespace wasm_utils {

std::string readFile(std::string_view file_name);
void writeFile(std::string_view file_name, std::string_view content);

}