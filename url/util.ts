export const URLPrefix = /^([a-z]([a-z\-]+[a-z]|[a-z])?:\/\/|file:)/i;

export function isFileProtocol(path: string): boolean {
    return /^file:(\/\/)?$/i.test(path);
}
