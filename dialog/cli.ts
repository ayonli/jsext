/**
 * The implementation of `dialog` module for the CLI.
 * 
 * Normally, we should just use the `dialog` module, however, if we don't want
 * to include other parts that are not needed in the CLI, we can use this
 * module instead.
 * @module
 */
import alert from "./cli/alert.ts";
import confirm from "./cli/confirm.ts";
import prompt from "./cli/prompt.ts";
import progress from "./cli/progress.ts";

export * from "./cli/file.ts";

export {
    alert,
    confirm,
    prompt,
    progress,
};
