/**
 * The implementation of `dialog` module for the CLI.
 * 
 * Normally, we should just use the `dialog` module, however, if we don't want
 * to include other parts that are not needed in the CLI, we can use this
 * module instead.
 * @module
 */
import alert from "./alert.ts";
import confirm from "./confirm.ts";
import prompt from "./prompt.ts";
import progress from "./progress.ts";

export * from "./file.ts";

export {
    alert,
    confirm,
    prompt,
    progress,
};
