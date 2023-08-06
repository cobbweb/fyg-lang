import { match } from "../../src/parser.ts";
import { expect } from "bun:test";

export default function assertValidCode(code) {
  const matchResult = match(code);
  expect(matchResult.message).toBeUndefined();
}

// expect.extend({
//   toBeValidCode(code) {
//     const matchResult = match(code);

//     return matchResult.succeeded()
//       ? {
//           pass: true,
//           message: () => `Expected \`${code}\` not to invalid code`,
//         }
//       : {
//           pass: false,
//           message: () =>
//             matchResult.message || `Expected \`${code}\` to be valid code`,
//         };
//   },
// });
