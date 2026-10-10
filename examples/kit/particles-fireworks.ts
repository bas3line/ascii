/*
 * fireworks over the city: the fireworks preset by name, with a skyline typed
 * as text in front of it. Shells climb from behind the roofs, burst in turn in
 * five colours and fall back behind the towers; the lit windows are painted
 * gold. No maths: a picture, a preset and two colours. It repeats every 8
 * seconds, a seamless loop for svg().
 */
import { particles } from "../../src/kit/particles.ts";

const city = `
                                        ╷
        ┌───┐                         ┌───┐
        │ ▪ │           ┌───┐         │ ▪ │         ┌───┐
┌─────┐ │ ▪ │           │ ▪ │ ┌─────┐ │   │         │ ▪ │
│ ▪ ▪ │ │   │ ┌───────┐ │   │ │ ▪ ▪ │ │ ▪ │ ┌─────┐ │   │ ┌────┐
│ ▪   │ │ ▪ │ │ ▪ ▪   │ │ ▪ │ │   ▪ │ │ ▪ │ │ ▪ ▪ │ │ ▪ │ │ ▪  │
│   ▪ │ │ ▪ │ │ ▪   ▪ │ │   │ │ ▪ ▪ │ │ ▪ │ │   ▪ │ │ ▪ │ │  ▪ │`;

export default particles({ name: "fireworks over the city", front: { art: city, color: "#64748b", paint: { "▪": "#f59e0b" } } }, "fireworks");
