import("../../dialog.ts")
    .then(({ prompt }) => prompt('Enter something:', 'Hello, World!'))
    .then(console.log);
