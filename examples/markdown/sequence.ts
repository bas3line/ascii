/*
 * sequence: an OAuth handshake, who says what to whom in order. Heads and
 * lifelines draw down, a dot runs each message as its words type; then a dot
 * runs the messages again while it is in view.
 */
import { sequence } from "../../src/markdown/index.ts";

export default sequence(
  `app -> auth "sign in"
   auth --> app "code"
   app -> auth "code for a token"
   auth --> app "token"`,
  { title: "oauth" },
);
