import * as Comlink from "comlink";

import FileSystem from "../build/emception/FileSystem.mjs";

import LlvmBoxProcess from "../build/emception/LlvmBoxProcess.mjs";
import BinaryenBoxProcess from "../build/emception/BinaryenBoxProcess.mjs";
import PythonProcess from "../build/emception/PythonProcess.mjs";
import NodeProcess from "../build/emception/NodeProcess.mjs";

import root_pack_url from "../build/emception/root.pack.br";

class Emception {
    fileSystem = null;
    tools = {};

    async init() {
        const fileSystem = await new FileSystem();
        this.fileSystem = fileSystem;

        fileSystem.persist("/emscripten/cache");
        await fileSystem.pull();
        await fileSystem.unpack(root_pack_url);
        await fileSystem.push();
      
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
            "python": new PythonProcess(processConfig),
            "main-python": new PythonProcess(processConfig),
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

    async run(...args) {
        await this.tools["main-python"];
        if (args.length == 1) args = args[0].split(/ +/);
        args[0] = `/emscripten/${args[0]}.py`;
        return await this.tools["main-python"].exec(args, {
            print: (...args) => this.onstdout(...args),
            printErr: (...args) => this.onstderr(...args),
            cwd: "/working",
            path: ["/emscripten"],
        })
    };

    async _run_process(argv, opts = {}) {
        this.onprocessstart(argv);
        const result = await this._run_process_impl(argv, opts);
        this.onprocessend(result);
        return result;
    }

    async _run_process_impl(argv, opts = {}) {
        const in_emscripten = argv[0].match(/\/emscripten\/(.+)(\.py)?/)
        if (in_emscripten) {
            argv[0] = `/emscripten/${in_emscripten[1]}.py`;
        }
  
        if (!this.fileSystem.exists(argv[0])) {
            const result = {
                returncode: 1,
                stdout: "",
                stderr: `Executable not found: ${JSON.stringify(argv[0])}`,
            };
            return result;
        }
  
        const tool_info = argv[0].endsWith(".py") ? "python" : this.fileSystem.readFile(argv[0], {encoding: "utf8"});
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
  
        const tool = await this.tools[tool_name];
        const result = await tool.exec(argv, {
            ...opts,
            cwd: opts.cwd || "/",
            path: ["/emscripten"]
        });
        await this.fileSystem.push();
        return result;
    };
}

const emception = new Emception();
globalThis.emception = emception;
Comlink.expose(emception);