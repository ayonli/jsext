async function stat(path) {
    throw new Error("Unsupported runtime");
}
async function exists(path) {
    throw new Error("Unsupported runtime");
}
async function mkdir(path, options = {}) {
    throw new Error("Unsupported runtime");
}
async function* readDir(path, options = {}) {
    throw new Error("Unsupported runtime");
}
async function readFile(filename, options = {}) {
    throw new Error("Unsupported runtime");
}
async function readFileAsText(filename, options = {}) {
    throw new Error("Unsupported runtime");
}
async function writeFile(filename, data, options = {}) {
    throw new Error("Unsupported runtime");
}
async function remove(path, options = {}) {
    throw new Error("Unsupported runtime");
}
async function rename(oldPath, newPath) {
    throw new Error("Unsupported runtime");
}
async function copy(oldPath, newPath) {
    throw new Error("Unsupported runtime");
}

export { copy, exists, mkdir, readDir, readFile, readFileAsText, remove, rename, stat, writeFile };
//# sourceMappingURL=fs.js.map
