# Emception
Compile C/C++ code with [Emscripten](https://emscripten.org/) in the browser.
You can see it in action in the [live demo](https://jprendes.github.io/emception/).

# Build
To build Emception, simply clone the repo, and run `./build-with-docker.sh`. I've only built it on Linux, but you should be able to build it from anywhere you can run Docker. Bear in mind that the build will take a long while (specially cloning/building llvm and building pyodide), so go get a a cup of coffee.
```bash
git clone https://github.com/jprendes/emception.git
cd emception
./build-with-docker.sh
```

This will generate the files in `build/emception`. To build de demo, from the `demo` folder run `npm install` and `npm run build`. You can then run the demo locally running `npx serve build/demo`.
```bash
pushd demo
npm install
npm run build
popd
npx serve build/demo
```
