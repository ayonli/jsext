import { lines } from '../../string.js';
import { join } from '../../path.js';
import readAll from '../../readAll.js';
import { readFile } from './util.js';
import { run } from '../terminal/util.js';
import { UTIMap } from './constants.js';

function htmlAcceptToFileFilter(accept) {
    const list = Object.values(UTIMap);
    return accept.split(/\s*,\s*/).map(type => {
        const _type = type.toLowerCase();
        for (const types of list) {
            if (types.includes(_type)) {
                return types.filter(t => t.startsWith(".")).map(t => `*${t}`).join(" ");
            }
        }
        return type;
    }).join(" ");
}
async function linuxChooseOneFile(title = "", type = "") {
    const { code, stdout, stderr } = await run("zenity", [
        "--file-selection",
        "--title", title,
        "--file-filter", htmlAcceptToFileFilter(type),
    ]);
    if (!code) {
        const path = stdout.trim();
        if (path) {
            return await readFile(path);
        }
        else {
            return null;
        }
    }
    else {
        throw new Error(stderr.trim());
    }
}
async function linuxChooseMultipleFiles(title = "", type = "") {
    const { code, stdout, stderr } = await run("zenity", [
        "--file-selection",
        "--title", title,
        "--file-filter", htmlAcceptToFileFilter(type),
        "--multiple",
        "--separator", "\n",
    ]);
    if (!code) {
        const paths = lines(stdout.trim());
        return await Promise.all(paths.map(path => readFile(path)));
    }
    else {
        throw new Error(stderr.trim());
    }
}
async function linuxChooseFolder(title = "") {
    const { code, stdout, stderr } = await run("zenity", [
        "--file-selection",
        "--title", title,
        "--directory",
    ]);
    if (!code) {
        const dir = stdout.trim();
        const folder = dir.split("/").pop();
        const paths = (await readAll(Deno.readDir(dir)))
            .filter(item => item.isFile)
            .map(item => join(dir, item.name));
        return await Promise.all(paths.map(path => readFile(path, folder)));
    }
    else {
        throw new Error(stderr.trim());
    }
}

export { linuxChooseFolder, linuxChooseMultipleFiles, linuxChooseOneFile };
//# sourceMappingURL=linux.js.map
