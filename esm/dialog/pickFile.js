import { platform } from './terminal/util.js';
import { macChooseFolder, macChooseMultipleFiles, macChooseOneFile } from './pickFile/mac.js';
import { linuxChooseFolder, linuxChooseMultipleFiles, linuxChooseOneFile } from './pickFile/linux.js';

async function pickFile(options = {}) {
    const { title = "", type = "", multiple = false, folder = false } = options;
    if (typeof document === "object") {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = type !== null && type !== void 0 ? type : "";
        input.multiple = multiple !== null && multiple !== void 0 ? multiple : false;
        input.webkitdirectory = folder !== null && folder !== void 0 ? folder : false;
        return await new Promise(resolve => {
            input.onchange = () => {
                var _a;
                const files = input.files;
                if (folder || multiple) {
                    resolve(files ? [...files] : []);
                }
                else {
                    resolve(files ? ((_a = files[0]) !== null && _a !== void 0 ? _a : null) : null);
                }
            };
            input.click();
        });
    }
    else if (platform() === "darwin") {
        if (folder) {
            return await macChooseFolder(title);
        }
        else if (multiple) {
            return await macChooseMultipleFiles(title, type);
        }
        else {
            return await macChooseOneFile(title, type);
        }
    }
    else if (platform() === "linux") {
        if (folder) {
            return await linuxChooseFolder(title);
        }
        else if (multiple) {
            return await linuxChooseMultipleFiles(title, type);
        }
        else {
            return await linuxChooseOneFile(title, type);
        }
    }
    throw new Error("Unsupported platform or runtime");
}

export { pickFile as default };
//# sourceMappingURL=pickFile.js.map
