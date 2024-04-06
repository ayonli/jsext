import { platform } from "./pickFile/util.ts";
import { macChooseFolder, macChooseMultipleFiles, macChooseOneFile } from "./pickFile/mac.ts";
import { linuxChooseFolder, linuxChooseMultipleFiles, linuxChooseOneFile } from "./pickFile/linux.ts";

export default function pickFile(options: {
    title?: string;
    type?: string;
}): Promise<File | null>;
export default function pickFile(options: {
    title?: string;
    type?: string;
    multiple: boolean;
}): Promise<File[]>;
export default function pickFile(options: {
    title?: string;
    folder: boolean;
}): Promise<File[]>;
export default async function pickFile(options: {
    title?: string;
    type?: string;
    multiple?: boolean;
    folder?: boolean;
} = {}): Promise<File | File[] | null> {
    const { title = "", type = "", multiple = false, folder = false } = options;

    if (typeof document === "object") {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = type ?? "";
        input.multiple = multiple ?? false;
        input.webkitdirectory = folder ?? false;

        return await new Promise<File | File[] | null>(resolve => {
            input.onchange = () => {
                const files = input.files;

                if (folder || multiple) {
                    resolve(files ? [...files] : []);
                } else {
                    resolve(files ? (files[0] ?? null) : null);
                }
            };
            input.click();
        });
    } else if (platform() === "darwin") {
        if (folder) {
            return await macChooseFolder(title);
        } else if (multiple) {
            return await macChooseMultipleFiles(title, type);
        } else {
            return await macChooseOneFile(title, type);
        }
    } else if (platform() === "linux") {
        if (folder) {
            return await linuxChooseFolder(title);
        } else if (multiple) {
            return await linuxChooseMultipleFiles(title, type);
        } else {
            return await linuxChooseOneFile(title, type);
        }
    }

    throw new Error("Unsupported platform or runtime");
}

