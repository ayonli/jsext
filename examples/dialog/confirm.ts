import("../../dialog/index.ts")
    .then(({ confirm }) => confirm("Are you sure?"))
    .then(console.log);
