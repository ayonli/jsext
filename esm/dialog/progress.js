import { isBrowserWindow, isDeno, isNodeLike } from '../env.js';
import '../bytes.js';
import '../error/Exception.js';
import '../external/event-target-polyfill/index.js';
import { NotSupportedError } from '../error/common.js';

/**
 * Displays a dialog with a progress bar indicating the ongoing state of the
 * `fn` function, and to wait until the job finishes or the user cancels the
 * dialog.
 *
 * @param onAbort If provided, the dialog will show a cancel button (or listen
 * for Escape in CLI) that allows the user to abort the task. This function can
 * either return a default/fallback result or throw an error to indicate the
 * cancellation.
 *
 * @example
 * ```ts
 * // default usage
 * import { progress } from "@ayonli/jsext/dialog";
 *
 * const result = await progress("Processing...", async () => {
 *     // ... some long-running task
 *     return { ok: true };
 * });
 *
 * console.log(result); // { ok: true }
 * ```
 *
 * @example
 * ```ts
 * // update state
 * import { progress } from "@ayonli/jsext/dialog";
 *
 * const result = await progress("Processing...", async (set) => {
 *     set({ percent: 0 });
 *     // ... some long-running task
 *     set({ percent: 50, message: "Halfway there!" });
 *     // ... some long-running task
 *     set({ percent: 100 });
 *
 *     return { ok: true };
 * });
 *
 * console.log(result); // { ok: true }
 * ```
 *
 * @example
 * ```ts
 * // abortable
 * import { progress } from "@ayonli/jsext/dialog";
 *
 * const result = await progress("Processing...", async (set, signal) => {
 *     set({ percent: 0 });
 *
 *     if (!signal.aborted) {
 *         // ... some long-running task
 *         set({ percent: 50, message: "Halfway there!" });
 *     }
 *
 *     if (!signal.aborted) {
 *         // ... some long-running task
 *         set({ percent: 100 });
 *     }
 *
 *     return { ok: true };
 * }, () => {
 *     return { ok: false };
 * });
 *
 * console.log(result); // { ok: true } or { ok: false }
 * ```
 */
async function progress(message, fn, onAbort = undefined) {
    if (isBrowserWindow) {
        const { progress } = await import('./web.js');
        return await progress(message, fn, onAbort);
    }
    else if (isDeno || isNodeLike) {
        const { default: progress } = await import('./cli/progress.js');
        return await progress(message, fn, onAbort);
    }
    else {
        throw new NotSupportedError("Unsupported runtime");
    }
}

export { progress as default };
//# sourceMappingURL=progress.js.map
