#include <cstring>
#include <string_view>
#include <sys/types.h>
#include <sys/stat.h>
#include <limits.h>
#include <utime.h>
#include <unistd.h>

#include <iostream>

#include "wasm-utils/WasmBuffer.hpp"
#include "wasm-utils/utils.hpp"

using namespace wasm_utils;

int usage() {
    std::cerr << "Usage: wasm-package (pack|unpack) archive [file1 file2 ...]\n";
    return 1;
}

int mkpath(std::string_view file, mode_t mode) {
    struct stat sb;
    size_t i = 0;

    while (true) {
        if (i < file.length() && file[i] == '\0') const_cast<char&>(file[i]) = '/';
        i = file.find('/', i+1);
        if (i == std::string::npos) return 0;
        const_cast<char&>(file[i]) = '\0';
        if (stat(file.data(), &sb) == 0) continue;
        if (mkdir(file.data(), mode) != 0) return 1;
    }
}

std::string read_link(std::string const & path) {
    char buf[PATH_MAX] = {'\0'};
    auto nbytes = readlink(path.c_str(), buf, PATH_MAX);
    if (nbytes == -1) {
        return "";
    }
    buf[nbytes] = '\0';
    return buf;
}

int main(int argc, const char *argv[]) {
    if (argc < 3) return usage();
    
    auto action = std::string_view(argv[1]);
    auto archive = std::string_view(argv[2]);

    if (action == "pack") {
        WasmBuffer buffer;
        
        for (int i=3; i<argc; i++) {
            auto name = argv[i];

            struct stat status;
            if (lstat(name, &status) == 0) {
                buffer.write<std::string_view>(name);
                buffer.write<std::uint64_t>(status.st_mode);
                buffer.write<std::uint64_t>(status.st_atim.tv_sec);
                buffer.write<std::uint64_t>(status.st_mtim.tv_sec);

                switch (status.st_mode & S_IFMT) {
                    case S_IFREG: // normal file
                        buffer.write(readFile(name));
                        break;
                    case S_IFLNK: // symlink
                        buffer.write(read_link(name));
                        break;
                    case S_IFDIR: // directory
                        // write an empty string to keep things symmetric
                        buffer.write<std::string_view>("");
                        break;
                    default: // something else: block/char device, FIFO/pipe, socket, ...
                        std::cerr << "Skipping node at \"" << name << "\": unsupported node type.\n";
                }
            } else {
                std::cerr << "Skipping node at \"" << name << "\": error stating node.\n";
            }
        }

        writeFile(archive, buffer.data());
    } else if (action == "unpack") {
        auto data = readFile(archive);
        auto buffer = WasmBuffer(data);

        while (!buffer.eof()) {
            auto name = buffer.read<std::string>();

            mode_t mode = buffer.read<std::uint64_t>();

            struct utimbuf times = {
                static_cast<time_t>(buffer.read<std::uint64_t>()),
                static_cast<time_t>(buffer.read<std::uint64_t>())
            };

            auto content = buffer.read<std::string>();

            mkpath(name, 0777);

            switch (mode & S_IFMT) {
                case S_IFREG: // normal file
                    writeFile(name, content);
                    chmod(name.c_str(), mode);
                    utime(name.c_str(), &times);
                    break;
                case S_IFLNK: // symlink
                    symlink(content.c_str(), name.c_str());
                    utime(name.c_str(), &times);
                    break;
                case S_IFDIR: // directory
                    // content is unused here
                    mkdir(name.c_str(), mode);
                    utime(name.c_str(), &times);
                    break;
                default: // something else: block/char device, FIFO/pipe, socket, ...
                    std::cerr << "Skipping node at \"" << name << "\": unsupported node type.\n";
            }
        }
    } else {
        return usage();
    }

    return 0;
}