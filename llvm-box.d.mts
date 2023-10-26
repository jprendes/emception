interface FsModule extends EmscriptenModule {
    FS: typeof FS;
}

export default Module as EmscriptenModuleFactory<FsModule>;
