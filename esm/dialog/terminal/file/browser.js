import { getExtensions } from '../../../filetype.js';

function htmlAcceptToFileFilters(accept) {
    const groups = [];
    for (const type of accept.split(/\s*,\s*/)) {
        if (type.endsWith("/*")) {
            groups.push(type);
        }
        else {
            const group = groups[groups.length - 1];
            if (!group || typeof group === "string") {
                groups.push([type]);
            }
            else {
                group.push(type);
            }
        }
    }
    return groups.map(group => {
        if (Array.isArray(group)) {
            return group.map(type => {
                return {
                    description: "",
                    accept: {
                        [type]: getExtensions(type),
                    },
                };
            }).flat();
        }
        else if (group === "*/*") {
            return {
                description: "All Files",
                accept: {
                    "*/*": ["*"],
                }
            };
        }
        else {
            const extensions = getExtensions(group);
            if (!extensions.length) {
                return undefined;
            }
            else if (group === "video/*") {
                return {
                    description: "Video Files",
                    accept: extensions,
                };
            }
            else if (group === "audio/*") {
                return {
                    description: "Audio Files",
                    accept: extensions,
                };
            }
            else if (group === "image/*") {
                return {
                    description: "Image Files",
                    accept: extensions,
                };
            }
            else if (group === "text/*") {
                return {
                    description: "Text Files",
                    accept: extensions,
                };
            }
            else {
                return {
                    description: "",
                    accept: extensions,
                };
            }
        }
    }).filter(Boolean);
}
async function browserPickFile(type = "", options = {}) {
    try {
        if (options.forSave) {
            return await globalThis["showSaveFilePicker"]({
                types: type ? htmlAcceptToFileFilters(type) : [],
                suggestedName: options.defaultName,
            });
        }
        else {
            const [handle] = await globalThis["showOpenFilePicker"]({
                types: type ? htmlAcceptToFileFilters(type) : [],
            });
            return handle !== null && handle !== void 0 ? handle : null;
        }
    }
    catch (err) {
        if (err.name === "AbortError") {
            return null;
        }
        else {
            throw err;
        }
    }
}
async function browserPickFiles(type = "") {
    try {
        return await globalThis["showOpenFilePicker"]({
            types: type ? htmlAcceptToFileFilters(type) : [],
            multiple: true,
        });
    }
    catch (err) {
        if (err.name === "AbortError") {
            return [];
        }
        else {
            throw err;
        }
    }
}
async function browserPickFolder() {
    try {
        return await globalThis["showDirectoryPicker"]();
    }
    catch (err) {
        if (err.name === "AbortError") {
            return null;
        }
        else {
            throw err;
        }
    }
}

export { browserPickFile, browserPickFiles, browserPickFolder };
//# sourceMappingURL=browser.js.map