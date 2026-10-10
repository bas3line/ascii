/*
 * schema: a blog's users and posts as an ER diagram. The tables draw in, their
 * columns typing, then the reference rides in from users.id to posts.user_id,
 * a bar at its one end and a crow's foot at its many end. Then it holds.
 */
import { schema } from "../../src/markdown/schema.ts";

export default schema(
  `users(id*, name, email)
posts(id*, user_id, title)
ref posts.user_id users.id`,
  { title: "blog" },
);
