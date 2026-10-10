/*
 * sequence: a request through a browser, an api and a database, in
 * PlantUML's arrows. Heads and lifelines draw down, a dot runs each message
 * as its words type; then a dot runs the messages again while it is in view.
 */
import { sequence } from "../../src/markdown/index.ts";

export default sequence(
  `browser -> api "GET /users"
   api -> db "select users"
   db --> api "12 rows"
   api --> browser "200 ok"`,
  { title: "list users" },
);
