/*
 * snow on the cabin: the snow preset by name, blown across by a wind that
 * rises and drops, falling in three depths behind a cabin and its pines typed
 * as text. Far flakes are small, slow and faint, near ones large and quick.
 * The pines are painted green and the windows gold. It repeats every 8
 * seconds, a seamless loop for svg().
 */
import { particles } from "../../src/kit/particles.ts";

const cabin = `
                                ▄
       ▲                 _______█______                 ▲
      ▲▲▲      ▲        /              \\        ▲      ▲▲▲
     ▲▲▲▲▲    ▲▲▲      /________________\\      ▲▲▲    ▲▲▲▲▲
    ▲▲▲▲▲▲▲  ▲▲▲▲▲      │ ▪▪   ┌─┐   ▪▪ │     ▲▲▲▲▲  ▲▲▲▲▲▲▲
       █       █        │ ▪▪   │ │   ▪▪ │       █       █
▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁`;

const front = { art: cabin, paint: { "▲": "#16a34a", "▪": "#f59e0b" } };
export default particles({ name: "snow on the cabin", front }, "snow", { wind: 3 });
