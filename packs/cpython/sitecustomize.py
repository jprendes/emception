import subprocess;
import json;
import _emception;

import shutil;

def rmtree(path):
    _emception.eval(f'''
        try {{
            const rmtree = (path) => {{
                const stat = Module.FS.stat(path);
                if (Module.FS.isDir(stat.mode)) {{
                    for (const name of Module.FS.readdir(path)) {{
                        if (name !== "." && name !== "..") {{
                            rmtree(`${{path}}/${{name}}`);
                        }}
                    }}
                    Module.FS.rmdir(path);
                }} else {{
                    Module.FS.unlink(path);
                }}
            }}
            rmtree({json.dumps(path)})
        }} catch (e) {{
            // no-op
        }}
    ''');
shutil.rmtree = rmtree

import types;
import sys;
import os;

sys.modules['ctypes'] = types.ModuleType('ctypes', 'ctypes stub module');

class Popen(object):
    args = None;
    returncode = 0;
    stdout = "";
    stderr = "";

    def __init__(self, arguments, stdout = None, stderr = None, env = None, cwd=None, *args, **kwargs):
        self.args = arguments;
        data = json.loads(_emception.async_eval(f'''
            Module.onrunprocess(
                {json.dumps(arguments)},
                {{
                    cwd: {json.dumps(cwd)} || Module.FS.cwd(),
                    env: {json.dumps(env)} || {{}},
                }},
            )
        '''));
        self.returncode = data["returncode"];
        self.stdout = data["stdout"];
        self.stderr = data["stderr"];
        if callable(getattr(stdout, "write", None)):
            stdout.write(self.stdout);
        if callable(getattr(stderr, "write", None)):
            stdout.write(self.stderr);

    def __enter__(self):
        return self;
    def __exit__(self ,type, value, traceback):
        pass;
    def poll(self, *args, **kwargs):
        return self.returncode;
    def communicate(self, *args, **kwargs):
        return [self.stdout, self.stderr];
    def wait(self, *args, **kwargs):
        return self.returncode;
    def kill(self, *args, **kwargs):
        pass;

subprocess.Popen = Popen;
