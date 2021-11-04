export const miniBrowserTemplate = (url, src) => `
    <html>
        <head>
            <title>Emception output preview</title>
            <style>
                html, body {
                    display: grid;
                    grid-template-rows: 1fr 0;
                    grid-template-columns: 1fr 0;
                    align-items: center;
                    justify-items: center;
                    margin: 0;
                    width: 100%;
                    height: 100%;
                }
                #mini-browser {
                    display: grid;
                    grid-template-rows: 40px 1fr;
                    grid-template-columns: 1fr;
                    width: 100%;
                    height: 100%;
                    margin: 0;
                }
                #preview-frame {
                    width: 100%;
                    height: 100%;
                    border: none;
                }
                #mini-browser-toolbar {
                    background: #f6f5f3;
                    display: grid;
                    grid-template-columns: 40px 1fr;
                    align-items: center;
                    z-index: 999;
                    border-bottom: 1px solid #c5c4c2;
                    box-shadow: 0 0 5px rgba(0,0,0,0.5);
                }
                #preview-frame {
                    width: 100%;
                    height: 100%;
                    border: none;
                }
                #refresh {
                    margin: auto;
                    width: 30px;
                    height: 30px;
                    border: 1px solid #c5c4c2;
                    border-radius: 5px;
                    font-size: 20px;
                    display: grid;
                    align-items: center;
                    justify-items: center;
                    color: #333;
                    background: #f6f5f3;
                    box-sizing: border-box;
                }
                #refresh:hover {
                    background: #c5c4c2
                }
                #omnibar {
                    border: 1px solid #c5c4c2;
                    border-radius: 5px;
                    margin: 0 5px 0 0;
                    font-family: sans-serif;
                    font-size: 0.9em;
                    background: white;
                    height: 30px;
                    display: grid;
                    align-items: center;
                    padding: 0 5px;
                    color: #444;
                    box-sizing: border-box;
                }
            </style>
        </head>
        <body>
            <div id="mini-browser">
                <div id="mini-browser-toolbar"><button id="refresh">⟳</button><span id="omnibar">${url}</span></div>
                <iframe id="preview-frame" src="${src}"></iframe>
                <script>
                    document.getElementById("refresh").addEventListener("click", () => {
                        document.getElementById("preview-frame").src = "";
                        document.getElementById("preview-frame").src = "${src}";
                    });
                </script>
            </div>
        </body>
    <html>
`;

export const previewTemplate = (icon, title, message) => `
    <html>
        <head>
            <title>Emception output preview</title>
            <style>
                html, body {
                    display: grid;
                    grid-template-rows: 1fr 0;
                    grid-template-columns: 1fr 0;
                    align-items: center;
                    justify-items: center;
                }
                #title,
                #message {
                    font-family: Roboto, sans-serif;
                    margin: 0;
                    padding: 0;
                }
                #icon,
                #title,
                #message {
                    display: grid;
                    align-items: center;
                    justify-items: center;
                }
            </style>
        </head>
        <body>
            <div id="container">
                <h1 id="title">${title}</h1>
                <div id="icon">${icon}</div>
                <div id="message">${message}</div>
            </div>
        </body>
    </html>
`;

export const spinner = (size) => `
    <div style="font-size: calc(${size}px / 13)">
        <div style="width: 13em;height: 13em;overflow: hidden;align-items: center;justify-items: center;display: grid;padding: 2em;">
            <style>
                .loader,
                .loader:after {
                    border-radius: 50%;
                    width: 10em;
                    height: 10em;
                }
                .loader {
                    margin: 0;
                    position: relative;
                    text-indent: -9999em;
                    border-top: 1.1em solid rgba(51, 102, 153, 0.2);
                    border-right: 1.1em solid rgba(51, 102, 153, 0.2);
                    border-bottom: 1.1em solid rgba(51, 102, 153, 0.2);
                    border-left: 1.1em solid #336699;
                    -webkit-transform: translateZ(0);
                    -ms-transform: translateZ(0);
                    transform: translateZ(0);
                    -webkit-animation: load8 1.1s infinite linear;
                    animation: load8 1.1s infinite linear;
                }
                @-webkit-keyframes load8 {
                    0% {
                        -webkit-transform: rotate(0deg);
                        transform: rotate(0deg);
                    }
                    100% {
                        -webkit-transform: rotate(360deg);
                        transform: rotate(360deg);
                    }
                }
                @keyframes load8 {
                    0% {
                        -webkit-transform: rotate(0deg);
                        transform: rotate(0deg);
                    }
                    100% {
                        -webkit-transform: rotate(360deg);
                        transform: rotate(360deg);
                    }
                }
            </style>
            <div class="loader"></div>
        </div>
    </div>
`;