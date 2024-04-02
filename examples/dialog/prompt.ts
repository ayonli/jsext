import("../../dialog.ts")
    .then(({ prompt }) => prompt('Enter something:'))
    .then(console.log);
