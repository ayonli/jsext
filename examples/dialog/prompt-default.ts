import("../../dialog/index.ts")
    .then(({ prompt }) => prompt('Enter something:', 'Hello, World!'))
    .then(console.log);
