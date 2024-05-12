async function stat(target, options = {}) {
    throw new Error("Unsupported runtime");
}
async function exists(path, options = {}) {
    throw new Error("Unsupported runtime");
}
async function mkdir(path, options = {}) {
    throw new Error("Unsupported runtime");
}
async function* readDir(target, options = {}) {
    throw new Error("Unsupported runtime");
}
async function readFile(target, options = {}) {
    throw new Error("Unsupported runtime");
}
async function readFileAsText(target, options = {}) {
    throw new Error("Unsupported runtime");
}
async function writeFile(target, data, options = {}) {
    throw new Error("Unsupported runtime");
}
async function remove(path, options = {}) {
    throw new Error("Unsupported runtime");
}
async function rename(oldPath, newPath, options = {}) {
    throw new Error("Unsupported runtime");
}
async function copy(oldPath, newPath, options = {}) {
    throw new Error("Unsupported runtime");
}

export { copy, exists, mkdir, readDir, readFile, readFileAsText, remove, rename, stat, writeFile };
//# sourceMappingURL=fs.js.map
