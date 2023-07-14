import { assert } from "testing/asserts.ts";
import { match } from "../../src/parser.ts";

export default function assertValidCode(code) {
  const matchResult = match(code);
  assert(matchResult.succeeded(), matchResult.message);
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
