/*
 * git: a feature branch, as git log --graph --oneline --decorate prints it,
 * written as git's own commands. The log prints in from the top as a pager
 * scrolls it, each fork and merge swinging out; then it holds.
 */
import { git } from "../../src/markdown/git.ts";

export default git(
  `commit "init"
   commit "add the parser"
   switch -c feat
   commit "draw fences"
   switch main
   commit "fix a typo"
   switch feat
   commit "add tests"
   switch main
   merge feat
   tag v0.4`,
  { title: "feature branch" },
);
