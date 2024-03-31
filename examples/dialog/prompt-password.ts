import("../../dialog/index.ts")
    .then(({ prompt }) => prompt('Enter password:', { type: "password" }))
    .then(console.log);
