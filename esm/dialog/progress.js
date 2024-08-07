import { isBrowserWindow, isDeno, isNodeLike } from '../env.js';

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
    const ctrl = new AbortController();
    const signal = ctrl.signal;
    let fallback = null;
    const abort = !onAbort ? undefined : async () => {
        try {
            const result = await onAbort();
            fallback = { value: result };
            ctrl.abort();
        }
        catch (err) {
            ctrl.abort(err);
        }
    };
    const listenForAbort = !onAbort ? undefined : () => new Promise((resolve, reject) => {
        signal.addEventListener("abort", () => {
            if (fallback) {
                resolve(fallback.value);
            }
            else {
                reject(signal.reason);
            }
        });
    });
    if (isBrowserWindow) {
        const { progressInBrowser } = await import('./browser/index.js');
        return await progressInBrowser(message, fn, { signal, abort, listenForAbort });
    }
    else if (isDeno || isNodeLike) {
        const { lockStdin } = await import('../cli.js');
        const { handleTerminalProgress } = await import('./terminal/progress.js');
        return await lockStdin(() => handleTerminalProgress(message, fn, {
            signal,
            abort,
            listenForAbort,
        }));
    }
    else {
        throw new Error("Unsupported runtime");
    }
}

export { progress as default };
//# sourceMappingURL=progress.js.map
