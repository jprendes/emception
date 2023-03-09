const cp = require("child_process");
const fs = require("fs");
const path = require("path");

function hash_folder(root) {
    return "h" + cp.execSync(`cd "${root}" && find . -type f -print0 | sort -z | xargs -0 sha1sum | sha1sum`, { shell: "bash" }).toString().trim().split(" ")[0];
}

function weight_folder(root) {
    return parseInt(cp.execSync(`cd "${root}" && find . -type f -print0 | sort -z | xargs -0 cat | wc -c`, { shell: "bash" }).toString().trim().split(" ")[0]);
}

function folder_tree(root, parent = null) {
    const node = {
        name: path.basename(root),
        original_path: root,
        path_override: parent ? null : root,
        hash: hash_folder(root),
        size: weight_folder(root),
        parent: parent,
        children: {},
        self_size_override: null,
    };
    Object.defineProperty(node, "path", {
        get: () => {
            return node.path_override || path.join(node.parent.path, node.name);
        },
        set: (val) => {
            throw new Error("Use path_override instead");
        },
    });
    Object.defineProperty(node, "self_size", {
        get: () => {
            if (node.self_size_override !== null) return node.self_size_override;
            let size = node.own_size;
            for (const child of Object.values(node.children)) {
                if (!child.path_override) {
                    size += child.self_size;
                }
            }
            return size;
        },
        set: (val) => {
            throw new Error("Use self_size_override instead");
        },
    });
    Object.defineProperty(node, "own_size", {
        get: () => {
            let size = node.size;
            for (const child of Object.values(node.children)) {
                size -= child.size
            }
            return size;
        },
        set: (val) => {
            throw new Error("Can't override own_size");
        },
    });
    node.child = (path) => {
        let res = node;
        for (const part of path.split("/")) {
            res = res.children[part];
        }
        return res;
    };
    node.path_from = (parent, path_sep = "/") => {
        let p = node;
        let parts = [];
        while (p && p !== parent) {
            parts.unshift(p.name);
            p = p.parent;
        }
        return parts.join(path_sep);
    };
    for (const child of fs.readdirSync(root)) {
        const child_root = path.join(root, child);
        if (fs.statSync(child_root).isDirectory()) {
            node.children[child] = folder_tree(child_root, node);
        }
    };
    return node;
}

const full_tree = folder_tree("./emscripten");
const system_tree = full_tree.child("system");
const cache_tree = full_tree.child("cache");

function bfs(tree, callback) {
    const todo = [tree];
    while (todo.length > 0) {
        const node = todo.shift();
        const res = callback(node);
        if (res === null) continue;
        if (res) return res;
        todo.push(...Object.values(node.children));
    }
}

function dfs(tree, callback) {
    for (const node of Object.values(tree.children)) {
        const res = dfs(node, callback);
        if (res) return res;
    }
    return callback(tree);
}

function find_hash(hash) {
    return bfs(system_tree, (node) => {
        if (node.hash === hash) return node;
    });
}

function format_number(n) {
    return (((100 * n) | 0) / 100 + 1e-4).toString().replace(/(\.\d\d).*/,"$1")
}

function format_bytes(n) {
    const units = ["B", "kB", "MB", "GB", "TB"];
    if (n <= 900) {
        return (n | 0).toString() + " " + units[0];
    }
    n /= 1024;
    for (let unit of units.slice(1,-1)) {
        if (n <= 900) {
            return format_number(n) + " " + unit;
        }
        n /= 1024;
    }
    return format_number(n) + " " + units[units.length - 1];
}

// Find duplication
const links = [];
bfs(cache_tree, (node) => {
    const orig = find_hash(node.hash);
    if (!orig) return;
    node.self_size_override = 0;
    links.push([node, orig]);
    return null;
});

// Split emscripten/system/ in smaller packages
const packages = [];
function pack(root, nodes, min_size = 1e6) {
    nodes = nodes.filter((node) => !node.path_override && node.self_size === node.size);

    let package_size = 0;
    for (const node of nodes) {
        package_size += node.self_size;
    }
    if (package_size < min_size) return false;

    for (const node of nodes) {
        node.path_override = path.join(root, node.name);
    }
    packages.unshift([root, nodes]);

    return true;
}

dfs(system_tree, (node) => {
    const root = path.normalize(path.join(full_tree.path, "..", "emscripten_" + node.path_from(full_tree, "_")));
    if (pack(root, [node])) return;
    if (pack(root, Object.values(node.children))) return;
});

// The precompiled libraries are handled separately
const cache_lib = cache_tree.child("sysroot/lib/wasm32-emscripten");
cache_lib.path_override = path.normalize(path.join(full_tree.path, "..", cache_lib.path_from(full_tree, "_")));

for (const folder of ["docs", "media", "node_modules", "third_party"]) {
    const node = full_tree.child(folder);
    const root = path.normalize(path.join(full_tree.path, "..", `emscripten_${folder}`));
    pack(root, [node], 0);
}

console.log("## Split emscripten/system/ in smaller packages");
for (const [root, content] of packages) {
    let self_size = 0;
    for (const node of content) {
        self_size += node.self_size;
    }
    console.log(`# package ${path.relative(path.normalize(path.join(full_tree.path, "..")), root)} (${format_bytes(self_size)})`);
    console.log(`    echo 'package ${path.relative(path.normalize(path.join(full_tree.path, "..")), root)} (${format_bytes(self_size)})'`);
    console.log(`    mkdir -p ${root}`);
    for (const node of content) {
        console.log(`    mv ${path.join(node.parent.path, node.name)} ${node.path}`);
        console.log(`    ln -s ${path.relative(node.parent.path, node.path)} ${path.join(node.parent.path, node.name)}`);
    }
}
console.log("");

console.log("# Link back duplication of emscripten/system/ in emscripten/cache/");
console.log(`# Saving ${format_bytes(cache_tree.size - cache_lib.size - cache_tree.self_size)} out of ${format_bytes(cache_tree.size - cache_lib.size)}`)
for (const [node, orig] of links) {
    console.log(`rm -Rf ${node.path}`);
    console.log(`ln -s ${path.relative(path.dirname(node.path), orig.path)} ${node.path}`);
}
console.log("");

console.log(`# Emscripten root package is now ${format_bytes(full_tree.self_size)} (own: ${format_bytes(full_tree.own_size)})`);
for (const child of Object.values(full_tree.children)) {
    if (child.path_override || child.self_size === 0) continue;
    console.log(`    # ${child.name}: ${format_bytes(child.self_size)}`);
}
console.log("    #");
for (const child of Object.values(full_tree.child("cache").children)) {
    if (child.path_override || child.self_size === 0) continue;
    console.log(`    # cache/${child.name}: ${format_bytes(child.self_size)}`);
}
console.log("    #");
for (const child of Object.values(full_tree.child("cache/sysroot").children)) {
    if (child.path_override || child.self_size === 0) continue;
    console.log(`    # cache/sysroot/${child.name}: ${format_bytes(child.self_size)}`);
}

console.log("");
console.log("# Splitting precompile libraries into individual packages")

const wasm32libs = cache_tree.child("sysroot/lib/wasm32-emscripten");
for (const file of fs.readdirSync(wasm32libs.original_path)) {
    if (file.endsWith(".json")) continue;
    const root = path.normalize(path.join(full_tree.path, "..", "emscripten_sysroot_lib_wasm32-emscripten_" + file));
    console.log(`mkdir -p ${root}`);
    console.log(`mv ${wasm32libs.original_path}/${file} ${root}/${file}`);
    console.log(`ln -s ${path.relative(wasm32libs.original_path, `${root}/${file}`)} ${wasm32libs.original_path}/${file}`);
}