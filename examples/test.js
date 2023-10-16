import avg from "./avg.js";

const res = await avg(1, 2, 3, 4, 5, 6, 7, 8, 9);

if (res === 5) {
    console.log(`avg(1,2,3,4,5,6,7,8,9) === ${res}`);
} else {
    console.assert(false, `want 5, got: ${res}`);
}
