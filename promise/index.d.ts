/** Try to resolve a promise with a timeout limit. */
export declare function timeout<T>(value: T | PromiseLike<T>, ms: number): Promise<T>;
/** Resolves a promise only after the given duration. */
export declare function after<T>(value: T | PromiseLike<T>, ms: number): Promise<T>;
/** Blocks the context for a given time. */
export declare function sleep(ms: number): Promise<void>;
/** Blocks the context until the test is passed. */
export declare function until(test: () => boolean | Promise<boolean>): Promise<void>;
