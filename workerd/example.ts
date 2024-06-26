export default function example<T, A extends any[] = any[]>(
    fn: (this: T, console: Console, ...args: A) => void | Promise<void>,
    options: {
        /** Suppress logging to the terminal and only check the output. */
        suppress?: boolean;
    } | undefined = undefined
): (this: T, ...args: A) => Promise<void> {
    void fn, options;
    throw new Error("Unsupported runtime");
}
