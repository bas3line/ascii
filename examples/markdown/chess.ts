/*
 * chess: the ruy lopez, from its FEN after three moves, and the bishop's move
 * to b5. The board draws in a rank at a time, then the bishop slides there
 * square by square and holds, in brackets, its from square a dot.
 */
import { chess } from "../../src/markdown/index.ts";

export default chess(
  `r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3
f1b5`,
  { title: "ruy lopez" },
);
