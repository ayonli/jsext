import("../../dialog.ts")
    .then(({ confirm }) => confirm("Are you sure?"))
    .then(console.log);
