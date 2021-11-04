import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { Terminal } from "xterm";
import { FitAddon } from 'xterm-addon-fit';
import Split from "split-grid";
import { spinner, previewTemplate, miniBrowserTemplate } from "./preview-template.mjs";

import { render, html } from "lit";

import * as Comlink from "comlink";
import EmceptionWorker from "./emception.worker.js";

import "./style.css";
import "xterm/css/xterm.css";

const emception = Comlink.wrap(new EmceptionWorker());
window.emception = emception;
window.Comlink = Comlink;

const editorContainer = document.createElement("div");
const editor = monaco.editor.create(editorContainer, {
	value: "",
	language: "cpp",
	theme: "vs-dark",
});

const terminalContainer = document.createElement("div");
const terminal = new Terminal({
    convertEol: true,
    theme: {
        background: "#1e1e1e",
        foreground: "#d4d4d4",
    },
});
terminal.open(terminalContainer);

const terminalFitAddon = new FitAddon();
terminal.loadAddon(terminalFitAddon);

window.editor = editor;
window.terminal = terminal;

editor.setValue(`#include <iostream>

int main(void) {
    std::cout << "hello world!\\n";
    return 0;
}
`);

emception.onstdout = Comlink.proxy((str) => terminal.write(str + "\n"));
emception.onstderr = Comlink.proxy((str) => terminal.write(str + "\n"));

window.addEventListener("resize", () => {
    editor.layout();
    terminalFitAddon.fit();
});

async function main() {
    render(html`
        <div id="layout">
            <div id="header">
                <div id="title">Emception</div>
                <input id="flags" type="text"></input>
                <button disabled id="compile">Loading</button>
            </div>
            <div id="editor">${editorContainer}</div>
            <div id="vgutter"></div>
            <div id="preview">
                <iframe id="preview-frame"></iframe>
            </div>
            <div id="hgutter"></div>
            <div id="output">
                <div id="terminal">
                    ${terminalContainer}
                </div>
                <div id="status"></div>
            </div>
        </div>
    `, document.body);

    const flags = document.getElementById("flags");
    flags.value = "-O2 -fexceptions --proxy-to-worker -s EXIT_RUNTIME=1";
    
    window.split = Split({
        onDrag: () => {
            editor.layout();
            terminalFitAddon.fit();
        },
        columnGutters: [{
            track: 1,
            element: document.getElementById("vgutter"),
        }],
        rowGutters: [{
            track: 2,
            element: document.getElementById("hgutter"),
        }],
    });

    const frame = document.getElementById("preview-frame");
    let url = "";
    function preview(html_content) {
        if (url) URL.revokeObjectURL(url);
        url = URL.createObjectURL(new Blob([html_content], { type: 'text/html' }));
        frame.src = url;
    }

    let miniUrl = "";
    function previewMiniBrowser(html_content) {
        if (miniUrl) URL.revokeObjectURL(miniUrl);
        miniUrl = URL.createObjectURL(new Blob([html_content], { type: 'text/html' }));
        preview(miniBrowserTemplate("main.html", miniUrl));
    }

    preview(previewTemplate(spinner(80), "Loading", ""));

    const status = document.getElementById("status");
    const statusElements = [];
    emception.onprocessstart = Comlink.proxy((argv) => {
        const lastEl = statusElements[statusElements.length - 1] || status;
        const newEl = document.createElement("div");
        newEl.className = "process-status";
        render(html`
            <div class="process-argv" title=${argv.join(" ")}>${argv.join(" ")}</div>
        `, newEl);
        statusElements.push(newEl);
        lastEl.appendChild(newEl);

        terminalFitAddon.fit();
        requestAnimationFrame(() => {
            terminalFitAddon.fit();
        });
    });
    emception.onprocessend = Comlink.proxy(() => {
        const lastEl = statusElements.pop();
        if (lastEl) lastEl.remove();

        terminalFitAddon.fit();
        requestAnimationFrame(() => {
            terminalFitAddon.fit();
        });
    });

    const compile = document.getElementById("compile");
    compile.addEventListener("click", async () => {
        compile.disabled = true;
        compile.textContent = "Compiling";
        status.textContent = "Running:";
        preview(previewTemplate(spinner(80), "Compiling", ""));
        try {
            terminal.reset();
            await emception.fileSystem.writeFile("/working/main.cpp", editor.getValue());
            const cmd = `em++ ${flags.value} -s SINGLE_FILE=1 main.cpp -o main.html`;
            terminal.write(`$ ${cmd}\n\n`);
            const result = await emception.run(cmd);
            terminal.write("\n");
            if (result.returncode == 0) {
                terminal.write("Emception compilation finished");
                const content = await emception.fileSystem.readFile("/working/main.html", { encoding: "utf8" });
                previewMiniBrowser(content);
            } else {
                terminal.write(`Emception compilation failed`);
                preview(previewTemplate("", "", "The compilation failed, check the output bellow"));
            }
            terminal.write("\n");
        } catch (err) {
            preview(previewTemplate("", "", "Something went wrong, please file a bug report"));
            console.error(err);
        } finally {
            status.textContent = "Iddle";
            statusElements.splice(0, statusElements.length);
            compile.textContent = "Compile!";
            compile.disabled = false;
        }
    });

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            editor.layout();
            terminalFitAddon.fit();
        });
    });
    terminal.write("Loading Emception...\n");
    status.textContent = "Loading...";

    await emception.init();

    terminal.reset();
    terminal.write("Emception is ready\n");
    status.textContent = "Iddle";
    compile.disabled = false;
    compile.textContent = "Compile!";
    preview(previewTemplate("", "", "Your compiled code will run here"));
}

main();