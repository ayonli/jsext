import wrap from "./wrap.ts";

declare var Bun: any;
const isBun = typeof Bun === "object";
const warnedRecord = new Map<Function, boolean>();

/**
 * Marks a function as deprecated and returns a wrapped function.
 * 
 * When the wrapped function is called, a deprecation warning will be emitted to the stdout.
 * 
 * NOTE: the original function must have a name.
 * 
 * @param tip Extra tip for the user to migrate.
 * @param once If set, the warning will only be emitted once.
 * 
 * @example
 * ```ts
 * const sum = deprecate(function sum(a: number, b: number) {
 *     return a + b;
 * }, "use `a + b` instead");
 * console.log(sum(1, 2));
 * // output:
 * // DeprecationWarning: sum() is deprecated, use `a + b` instead (at <anonymous>:4:13)
 * // 3
 * ```
 */
export default function deprecate<T, Fn extends (this: T, ...args: any[]) => any>(
    fn: Fn,
    tip?: string,
    once?: boolean
): Fn;
/**
 * Emits a deprecation warning for the target, usually a parameter, an option,
 * or the function's name, etc.
 * 
 * @param forFn Usually set to the current function, used to locate the call-site.
 * @param tip Extra tip for the user to migrate.
 * @param once If set, the warning will only be emitted once.
 * 
 * @example
 * ```ts
 * const pow = function pow(a: number, b: number) {
 *     deprecate("pow()", pow, "use `a ** b` instead");
 *     return a ** b;
 * };
 * console.log(pow(2, 3));
 * // output:
 * // DeprecationWarning: pow() is deprecated, use `a ** b` instead (at <anonymous>:5:13)
 * // 3
 * ```
 */
export default function deprecate(target: string, forFn: Function, tip?: string, once?: boolean): void;
export default function deprecate<T, Fn extends (this: T, ...args: any[]) => any>(
    target: Fn | string,
    ...args: any[]
): Fn | void {
    if (typeof target === "function") {
        const tip = (args[0] as string) ?? "";
        const once = (args[1] as boolean) ?? false;

        return wrap<T, Fn>(target, function wrapped(fn, ...args) {
            emitWarning(fn.name + "()", wrapped, tip, once, isBun ? 1 : 2);
            return fn.apply(this, args);
        });
    }

    const forFn = args[0] as Function;
    const tip = (args[1] as string) ?? "";
    const once = (args[2] as boolean) ?? false;

    return emitWarning(target, forFn, tip, once, 1);
}

function emitWarning(target: string, forFn: Function, tip: string, once: boolean, lineNum: number) {
    if (!once || !warnedRecord.has(forFn)) {
        const capture: { stack?: string; } = {};
        Error.captureStackTrace(capture, forFn);
        let line = (capture.stack as string).split("\n")[lineNum]?.trim();
        let warning = `${target} is deprecated`;

        if (tip) {
            warning += ", " + tip;
        }

        if (line) {
            let start = line.indexOf("(");

            if (start !== -1) {
                start += 1;
                const end = line.indexOf(")", start);
                line = line.slice(start, end);
            }

            warning += " (" + line + ")";
        }

        console.warn("DeprecationWarning:", warning);
        once && warnedRecord.set(forFn, true);
    }
}
