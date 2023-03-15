#include <string>
#include <unordered_map>
inline std::unordered_map<std::string, int (*)(int,const char **)> _boxify_entrypoints_map;

int main(int argc, const char ** argv) {
    if (argc < 1) return 1;
    const char * argv0 = argv[0];
    --argc;
    ++argv;
    if (_boxify_entrypoints_map.count(argv0) == 0) return 1;
    return _boxify_entrypoints_map.at(argv0)(argc, argv);
}
