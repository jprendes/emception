import * as Comlink from "comlink";

import FileSystem from "emception/FileSystem.mjs";

import LlvmBoxProcess from "emception/LlvmBoxProcess.mjs";
import BinaryenBoxProcess from "emception/BinaryenBoxProcess.mjs";
import Python3Process from "emception/Python3Process.mjs";
import NodeProcess from "emception/QuickNodeProcess.mjs";

import root_pack from "emception/root_pack.mjs";
import lazy_cache from "emception/lazy-cache/index.mjs";

class Emception {
    fileSystem = null;
    tools = {};

    async init() {
        const fileSystem = await new FileSystem();
        this.fileSystem = fileSystem;

        await fileSystem.cachedLazyFile(...root_pack);
        await fileSystem.unpack(root_pack[0]);

        // Populate the emscripten cache
        for (const [relpath, ...rest] of lazy_cache) {
            const path = `/emscripten/${relpath.slice(2)}`;
            await fileSystem.cachedLazyFile(path, ...rest);
        }

        if (fileSystem.exists("/emscripten/cache/cache.lock")) {
            fileSystem.unlink("/emscripten/cache/cache.lock");
        }

        const processConfig = {
            FS: fileSystem.FS,
            onrunprocess: (...args) => this._run_process(...args),
        };

        const tools = {
            "llvm-box": new LlvmBoxProcess(processConfig),
            "binaryen-box": new BinaryenBoxProcess(processConfig),
            "node": new NodeProcess(processConfig),
            "python": new Python3Process(processConfig),
            "main-python": new Python3Process(processConfig),
        };
        this.tools = tools;

        for (let tool in tools) {
            await tools[tool];
        }
    }

    onprocessstart = () => {};
    onprocessend = () => {};
    onstdout = () => {};
    onstderr = () => {};

    run(...args) {
        if (args.length == 1) args = args[0].split(/ +/);
        args = [
            "/usr/bin/python",
            "-E",
            `/emscripten/${args[0]}.py`,
            ...args.slice(1)
        ];
        return this.tools["main-python"].exec(args, {
            print: (...args) => this.onstdout(...args),
            printErr: (...args) => this.onstderr(...args),
            cwd: "/working",
            path: ["/emscripten"],
        })
    };

    _run_process(argv, opts = {}) {
        this.onprocessstart(argv);
        const result = this._run_process_impl(argv, opts);
        this.onprocessend(result);
        return result;
    }

    _run_process_impl(argv, opts = {}) {
        const in_emscripten = argv[0].match(/\/emscripten\/(.+)(\.py)?/)
        if (in_emscripten) {
            argv = [
                "/usr/bin/python",
                "-E",
                `/emscripten/${in_emscripten[1]}.py`,
                ...args.slice(1)
            ];
        }
  
        if (!this.fileSystem.exists(argv[0])) {
            const result = {
                returncode: 1,
                stdout: "",
                stderr: `Executable not found: ${JSON.stringify(argv[0])}`,
            };
            return result;
        }
  
        const tool_info = argv[0] === "/usr/bin/python" ? "python" : this.fileSystem.readFile(argv[0], {encoding: "utf8"});
        const [tool_name, ...extra_args] = tool_info.split(";")
  
        if (!(tool_name in this.tools)) {
            const result = {
                returncode: 1,
                stdout: "",
                stderr: `File is not executable: ${JSON.stringify(argv[0])}`,
            };
            return result;
        }
  
        argv = [...extra_args, ...argv];
  
        const tool = this.tools[tool_name];
        const result = tool.exec(argv, {
            ...opts,
            cwd: opts.cwd || "/",
            path: ["/emscripten"]
        });
        this.fileSystem.push();
        return result;
    };
}

const emception = new Emception();
globalThis.emception = emception;
Comlink.expose(emception);
