import process from "node:process";

if (process.argv.includes("--gui")) {
    import("../../dialog.ts")
        .then(({ prompt }) => prompt('Enter something:', { defaultValue: 'Hello, World!', gui: true }))
        .then(console.log);
} else {
    import("../../dialog.ts")
        .then(({ prompt }) => prompt('Enter something:', 'Hello, World!'))
        .then(console.log);
}
