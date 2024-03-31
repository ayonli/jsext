import("../../dialog/index.ts")
    .then(({ prompt }) => prompt('Enter something:'))
    .then(console.log);
