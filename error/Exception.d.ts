export default class Exception extends Error {
    readonly cause?: unknown;
    readonly code: number;
    constructor(message: string, code?: number);
    constructor(message: string, options: {
        cause?: unknown;
        code: number;
    });
}
