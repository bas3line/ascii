/*
 * bits: an IPv4 header's first word from a bit mask. The ruler counts in,
 * then each field's walls drop in and its name types, in order. Then it holds.
 */
import { bits } from "../../src/markdown/index.ts";

export default bits(
  `vvvviiiiddddddee
llllllllllllllll
v=version i=ihl d=dscp e=ecn l=length`,
  { title: "ipv4 header" },
);
