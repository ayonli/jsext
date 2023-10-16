import { parallel } from "../esm/index.js";
import avg from "./avg.js";
const { default: avg_dup } = parallel(() => import("./avg.js"));

const res = await avg(1, 2, 3, 4, 5, 6, 7, 8, 9);
if (res === 5) {
    console.log(`avg(1,2,3,4,5,6,7,8,9) === ${res}`);
} else {
    console.assert(false, `want 5, got: ${res}`);
}

const res_dup = await avg_dup(1, 2, 3, 4, 5, 6, 7, 8, 9,);
if (res_dup === 5) {
    console.log(`avg_dup(1,2,3,4,5,6,7,8,9) === ${res_dup}`);
} else {
    console.assert(false, `want 5, got: ${res_dup}`);
}
