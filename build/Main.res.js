// src/Main.res.mjs
import * as Std from "std";

// node_modules/rescript/lib/es6/js_exn.js
var $$Error$1 = "JsError";

// src/parser.build.js
var peg$subclass = function(child, parent) {
  function C() {
    this.constructor = child;
  }
  C.prototype = parent.prototype;
  child.prototype = new C;
};
var peg$SyntaxError = function(message, expected, found, location) {
  var self = Error.call(this, message);
  if (Object.setPrototypeOf) {
    Object.setPrototypeOf(self, peg$SyntaxError.prototype);
  }
  self.expected = expected;
  self.found = found;
  self.location = location;
  self.name = "SyntaxError";
  return self;
};
var peg$padEnd = function(str, targetLength, padString) {
  padString = padString || " ";
  if (str.length > targetLength) {
    return str;
  }
  targetLength -= str.length;
  padString += padString.repeat(targetLength);
  return str + padString.slice(0, targetLength);
};
var peg$parse = function(input, options) {
  options = options !== undefined ? options : {};
  var peg$FAILED = {};
  var peg$source = options.grammarSource;
  var peg$startRuleFunctions = { program: peg$parseprogram };
  var peg$startRuleFunction = peg$parseprogram;
  var peg$c0 = "/*";
  var peg$c1 = "*/";
  var peg$c2 = "module";
  var peg$c3 = ".";
  var peg$c4 = "const";
  var peg$c5 = "=";
  var peg$c6 = "+";
  var peg$c7 = "-";
  var peg$c8 = "*";
  var peg$c9 = "/";
  var peg$c10 = "(";
  var peg$c11 = ")";
  var peg$c12 = "{";
  var peg$c13 = ",";
  var peg$c14 = "}";
  var peg$c15 = ":";
  var peg$c16 = "[";
  var peg$c17 = "]";
  var peg$c18 = "`";
  var peg$c19 = "\\`";
  var peg$r0 = /^[ \t]/;
  var peg$r1 = /^[\n\r]/;
  var peg$r2 = /^[A-Z]/;
  var peg$r3 = /^[a-zA-Z0-9]/;
  var peg$r4 = /^[0-9]/;
  var peg$r5 = /^[^`\\]/;
  var peg$r6 = /^[a-z]/;
  var peg$r7 = /^[a-zA-Z0-9_]/;
  var peg$e0 = peg$otherExpectation("program");
  var peg$e1 = peg$classExpectation([" ", "\t"], false, false);
  var peg$e2 = peg$classExpectation(["\n", "\r"], false, false);
  var peg$e3 = peg$literalExpectation("/*", false);
  var peg$e4 = peg$literalExpectation("*/", false);
  var peg$e5 = peg$anyExpectation();
  var peg$e6 = peg$otherExpectation("module delcaration");
  var peg$e7 = peg$literalExpectation("module", false);
  var peg$e8 = peg$literalExpectation(".", false);
  var peg$e9 = peg$classExpectation([["A", "Z"]], false, false);
  var peg$e10 = peg$classExpectation([["a", "z"], ["A", "Z"], ["0", "9"]], false, false);
  var peg$e11 = peg$literalExpectation("const", false);
  var peg$e12 = peg$literalExpectation("=", false);
  var peg$e13 = peg$literalExpectation("+", false);
  var peg$e14 = peg$literalExpectation("-", false);
  var peg$e15 = peg$literalExpectation("*", false);
  var peg$e16 = peg$literalExpectation("/", false);
  var peg$e17 = peg$literalExpectation("(", false);
  var peg$e18 = peg$literalExpectation(")", false);
  var peg$e19 = peg$literalExpectation("{", false);
  var peg$e20 = peg$literalExpectation(",", false);
  var peg$e21 = peg$literalExpectation("}", false);
  var peg$e22 = peg$literalExpectation(":", false);
  var peg$e23 = peg$literalExpectation("[", false);
  var peg$e24 = peg$literalExpectation("]", false);
  var peg$e25 = peg$otherExpectation("simple number");
  var peg$e26 = peg$classExpectation([["0", "9"]], false, false);
  var peg$e27 = peg$literalExpectation("`", false);
  var peg$e28 = peg$classExpectation(["`", "\\"], true, false);
  var peg$e29 = peg$literalExpectation("\\`", false);
  var peg$e30 = peg$otherExpectation("value identifier");
  var peg$e31 = peg$classExpectation([["a", "z"]], false, false);
  var peg$e32 = peg$classExpectation([["a", "z"], ["A", "Z"], ["0", "9"], "_"], false, false);
  var peg$f0 = function(module_name) {
    return module_name;
  };
  var peg$f1 = function(name_part) {
    return name_part.join("");
  };
  var peg$currPos = options.peg$currPos | 0;
  var peg$savedPos = peg$currPos;
  var peg$posDetailsCache = [{ line: 1, column: 1 }];
  var peg$maxFailPos = peg$currPos;
  var peg$maxFailExpected = options.peg$maxFailExpected || [];
  var peg$silentFails = options.peg$silentFails | 0;
  var peg$result;
  if (options.startRule) {
    if (!(options.startRule in peg$startRuleFunctions)) {
      throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
    }
    peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
  }
  function text() {
    return input.substring(peg$savedPos, peg$currPos);
  }
  function offset() {
    return peg$savedPos;
  }
  function range() {
    return {
      source: peg$source,
      start: peg$savedPos,
      end: peg$currPos
    };
  }
  function location() {
    return peg$computeLocation(peg$savedPos, peg$currPos);
  }
  function expected(description, location2) {
    location2 = location2 !== undefined ? location2 : peg$computeLocation(peg$savedPos, peg$currPos);
    throw peg$buildStructuredError([peg$otherExpectation(description)], input.substring(peg$savedPos, peg$currPos), location2);
  }
  function error(message, location2) {
    location2 = location2 !== undefined ? location2 : peg$computeLocation(peg$savedPos, peg$currPos);
    throw peg$buildSimpleError(message, location2);
  }
  function peg$literalExpectation(text2, ignoreCase) {
    return { type: "literal", text: text2, ignoreCase };
  }
  function peg$classExpectation(parts, inverted, ignoreCase) {
    return { type: "class", parts, inverted, ignoreCase };
  }
  function peg$anyExpectation() {
    return { type: "any" };
  }
  function peg$endExpectation() {
    return { type: "end" };
  }
  function peg$otherExpectation(description) {
    return { type: "other", description };
  }
  function peg$computePosDetails(pos) {
    var details = peg$posDetailsCache[pos];
    var p;
    if (details) {
      return details;
    } else {
      if (pos >= peg$posDetailsCache.length) {
        p = peg$posDetailsCache.length - 1;
      } else {
        p = pos;
        while (!peg$posDetailsCache[--p]) {
        }
      }
      details = peg$posDetailsCache[p];
      details = {
        line: details.line,
        column: details.column
      };
      while (p < pos) {
        if (input.charCodeAt(p) === 10) {
          details.line++;
          details.column = 1;
        } else {
          details.column++;
        }
        p++;
      }
      peg$posDetailsCache[pos] = details;
      return details;
    }
  }
  function peg$computeLocation(startPos, endPos, offset2) {
    var startPosDetails = peg$computePosDetails(startPos);
    var endPosDetails = peg$computePosDetails(endPos);
    var res = {
      source: peg$source,
      start: {
        offset: startPos,
        line: startPosDetails.line,
        column: startPosDetails.column
      },
      end: {
        offset: endPos,
        line: endPosDetails.line,
        column: endPosDetails.column
      }
    };
    if (offset2 && peg$source && typeof peg$source.offset === "function") {
      res.start = peg$source.offset(res.start);
      res.end = peg$source.offset(res.end);
    }
    return res;
  }
  function peg$fail(expected2) {
    if (peg$currPos < peg$maxFailPos) {
      return;
    }
    if (peg$currPos > peg$maxFailPos) {
      peg$maxFailPos = peg$currPos;
      peg$maxFailExpected = [];
    }
    peg$maxFailExpected.push(expected2);
  }
  function peg$buildSimpleError(message, location2) {
    return new peg$SyntaxError(message, null, null, location2);
  }
  function peg$buildStructuredError(expected2, found, location2) {
    return new peg$SyntaxError(peg$SyntaxError.buildMessage(expected2, found), expected2, found, location2);
  }
  function peg$parseprogram() {
    var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9;
    peg$silentFails++;
    s0 = peg$currPos;
    s1 = peg$parse_nl();
    s2 = peg$parsemodule_dec();
    if (s2 !== peg$FAILED) {
      s3 = peg$parse_();
      s4 = [];
      s5 = peg$currPos;
      s6 = peg$parsenl();
      if (s6 !== peg$FAILED) {
        s7 = peg$parse_nl();
        s8 = peg$parseadditive_expr();
        if (s8 !== peg$FAILED) {
          s9 = peg$parse_();
          s6 = [s6, s7, s8, s9];
          s5 = s6;
        } else {
          peg$currPos = s5;
          s5 = peg$FAILED;
        }
      } else {
        peg$currPos = s5;
        s5 = peg$FAILED;
      }
      while (s5 !== peg$FAILED) {
        s4.push(s5);
        s5 = peg$currPos;
        s6 = peg$parsenl();
        if (s6 !== peg$FAILED) {
          s7 = peg$parse_nl();
          s8 = peg$parseadditive_expr();
          if (s8 !== peg$FAILED) {
            s9 = peg$parse_();
            s6 = [s6, s7, s8, s9];
            s5 = s6;
          } else {
            peg$currPos = s5;
            s5 = peg$FAILED;
          }
        } else {
          peg$currPos = s5;
          s5 = peg$FAILED;
        }
      }
      s5 = peg$parse_nl();
      s1 = [s1, s2, s3, s4, s5];
      s0 = s1;
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e0);
      }
    }
    return s0;
  }
  function peg$parsews() {
    var s0;
    s0 = input.charAt(peg$currPos);
    if (peg$r0.test(s0)) {
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e1);
      }
    }
    return s0;
  }
  function peg$parsenl() {
    var s0;
    s0 = input.charAt(peg$currPos);
    if (peg$r1.test(s0)) {
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e2);
      }
    }
    return s0;
  }
  function peg$parseonl() {
    var s0, s1;
    s0 = [];
    s1 = peg$parsenl();
    while (s1 !== peg$FAILED) {
      s0.push(s1);
      s1 = peg$parsenl();
    }
    return s0;
  }
  function peg$parsecomment() {
    var s0, s1, s2, s3, s4, s5;
    s0 = peg$currPos;
    if (input.substr(peg$currPos, 2) === peg$c0) {
      s1 = peg$c0;
      peg$currPos += 2;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e3);
      }
    }
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = peg$currPos;
      s4 = peg$currPos;
      peg$silentFails++;
      if (input.substr(peg$currPos, 2) === peg$c1) {
        s5 = peg$c1;
        peg$currPos += 2;
      } else {
        s5 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e4);
        }
      }
      peg$silentFails--;
      if (s5 === peg$FAILED) {
        s4 = undefined;
      } else {
        peg$currPos = s4;
        s4 = peg$FAILED;
      }
      if (s4 !== peg$FAILED) {
        if (input.length > peg$currPos) {
          s5 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s5 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e5);
          }
        }
        if (s5 !== peg$FAILED) {
          s4 = [s4, s5];
          s3 = s4;
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      } else {
        peg$currPos = s3;
        s3 = peg$FAILED;
      }
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        s3 = peg$currPos;
        s4 = peg$currPos;
        peg$silentFails++;
        if (input.substr(peg$currPos, 2) === peg$c1) {
          s5 = peg$c1;
          peg$currPos += 2;
        } else {
          s5 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e4);
          }
        }
        peg$silentFails--;
        if (s5 === peg$FAILED) {
          s4 = undefined;
        } else {
          peg$currPos = s4;
          s4 = peg$FAILED;
        }
        if (s4 !== peg$FAILED) {
          if (input.length > peg$currPos) {
            s5 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e5);
            }
          }
          if (s5 !== peg$FAILED) {
            s4 = [s4, s5];
            s3 = s4;
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      }
      if (input.substr(peg$currPos, 2) === peg$c1) {
        s3 = peg$c1;
        peg$currPos += 2;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e4);
        }
      }
      if (s3 !== peg$FAILED) {
        s1 = [s1, s2, s3];
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parse_() {
    var s0, s1;
    s0 = [];
    s1 = peg$parsews();
    if (s1 === peg$FAILED) {
      s1 = peg$parsecomment();
    }
    while (s1 !== peg$FAILED) {
      s0.push(s1);
      s1 = peg$parsews();
      if (s1 === peg$FAILED) {
        s1 = peg$parsecomment();
      }
    }
    return s0;
  }
  function peg$parse_nl() {
    var s0, s1;
    s0 = [];
    s1 = peg$parsews();
    if (s1 === peg$FAILED) {
      s1 = peg$parsecomment();
      if (s1 === peg$FAILED) {
        s1 = peg$parsenl();
      }
    }
    while (s1 !== peg$FAILED) {
      s0.push(s1);
      s1 = peg$parsews();
      if (s1 === peg$FAILED) {
        s1 = peg$parsecomment();
        if (s1 === peg$FAILED) {
          s1 = peg$parsenl();
        }
      }
    }
    return s0;
  }
  function peg$parse__() {
    var s0, s1, s2;
    s0 = peg$currPos;
    s1 = [];
    s2 = peg$parsews();
    if (s2 !== peg$FAILED) {
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        s2 = peg$parsews();
      }
    } else {
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parse_();
      s1 = [s1, s2];
      s0 = s1;
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parsemodule_dec() {
    var s0, s1, s2, s3;
    peg$silentFails++;
    s0 = peg$currPos;
    if (input.substr(peg$currPos, 6) === peg$c2) {
      s1 = peg$c2;
      peg$currPos += 6;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e7);
      }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parse__();
      if (s2 !== peg$FAILED) {
        s3 = peg$parsemodule_name();
        if (s3 !== peg$FAILED) {
          peg$savedPos = s0;
          s0 = peg$f0(s3);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e6);
      }
    }
    return s0;
  }
  function peg$parsemodule_name() {
    var s0, s1, s2, s3, s4, s5;
    s0 = peg$currPos;
    s1 = peg$parsemodule_name_part();
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 46) {
        s4 = peg$c3;
        peg$currPos++;
      } else {
        s4 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e8);
        }
      }
      if (s4 !== peg$FAILED) {
        s5 = peg$parsemodule_name_part();
        if (s5 !== peg$FAILED) {
          s4 = [s4, s5];
          s3 = s4;
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      } else {
        peg$currPos = s3;
        s3 = peg$FAILED;
      }
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        s3 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 46) {
          s4 = peg$c3;
          peg$currPos++;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e8);
          }
        }
        if (s4 !== peg$FAILED) {
          s5 = peg$parsemodule_name_part();
          if (s5 !== peg$FAILED) {
            s4 = [s4, s5];
            s3 = s4;
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      }
      s1 = [s1, s2];
      s0 = s1;
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parsemodule_name_part() {
    var s0, s1, s2, s3;
    s0 = peg$currPos;
    s1 = input.charAt(peg$currPos);
    if (peg$r2.test(s1)) {
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e9);
      }
    }
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = input.charAt(peg$currPos);
      if (peg$r3.test(s3)) {
        peg$currPos++;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e10);
        }
      }
      if (s3 !== peg$FAILED) {
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = input.charAt(peg$currPos);
          if (peg$r3.test(s3)) {
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e10);
            }
          }
        }
      } else {
        s2 = peg$FAILED;
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s0 = peg$f1(s1);
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parseconst_dec() {
    var s0, s1, s2, s3, s4, s5, s6, s7;
    s0 = peg$currPos;
    if (input.substr(peg$currPos, 5) === peg$c4) {
      s1 = peg$c4;
      peg$currPos += 5;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e11);
      }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parse__();
      if (s2 !== peg$FAILED) {
        s3 = peg$parsevalue_iden();
        if (s3 !== peg$FAILED) {
          s4 = peg$parse_nl();
          if (input.charCodeAt(peg$currPos) === 61) {
            s5 = peg$c5;
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e12);
            }
          }
          if (s5 !== peg$FAILED) {
            s6 = peg$parse_nl();
            s7 = peg$parseadditive_expr();
            if (s7 !== peg$FAILED) {
              s1 = [s1, s2, s3, s4, s5, s6, s7];
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parseadditive_expr() {
    var s0, s1, s2, s3, s4, s5;
    s0 = peg$currPos;
    s1 = peg$parsemultiplicative_expr();
    if (s1 !== peg$FAILED) {
      s2 = peg$parse_nl();
      if (input.charCodeAt(peg$currPos) === 43) {
        s3 = peg$c6;
        peg$currPos++;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e13);
        }
      }
      if (s3 !== peg$FAILED) {
        s4 = peg$parse_nl();
        s5 = peg$parseadditive_expr();
        if (s5 !== peg$FAILED) {
          s1 = [s1, s2, s3, s4, s5];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      s1 = peg$parsemultiplicative_expr();
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_nl();
        if (input.charCodeAt(peg$currPos) === 45) {
          s3 = peg$c7;
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e14);
          }
        }
        if (s3 !== peg$FAILED) {
          s4 = peg$parse_nl();
          s5 = peg$parseadditive_expr();
          if (s5 !== peg$FAILED) {
            s1 = [s1, s2, s3, s4, s5];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$parsemultiplicative_expr();
      }
    }
    return s0;
  }
  function peg$parsemultiplicative_expr() {
    var s0, s1, s2, s3, s4, s5;
    s0 = peg$currPos;
    s1 = peg$parseprimary_expr();
    if (s1 !== peg$FAILED) {
      s2 = peg$parse_nl();
      if (input.charCodeAt(peg$currPos) === 42) {
        s3 = peg$c8;
        peg$currPos++;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e15);
        }
      }
      if (s3 !== peg$FAILED) {
        s4 = peg$parse_nl();
        s5 = peg$parsemultiplicative_expr();
        if (s5 !== peg$FAILED) {
          s1 = [s1, s2, s3, s4, s5];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      s1 = peg$parseprimary_expr();
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_nl();
        if (input.charCodeAt(peg$currPos) === 47) {
          s3 = peg$c9;
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e16);
          }
        }
        if (s3 !== peg$FAILED) {
          s4 = peg$parse_nl();
          s5 = peg$parsemultiplicative_expr();
          if (s5 !== peg$FAILED) {
            s1 = [s1, s2, s3, s4, s5];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$parseprimary_expr();
      }
    }
    return s0;
  }
  function peg$parseprimary_expr() {
    var s0, s1, s2, s3;
    s0 = peg$parseconst_dec();
    if (s0 === peg$FAILED) {
      s0 = peg$parseobject_expr();
      if (s0 === peg$FAILED) {
        s0 = peg$parsearray_expr();
        if (s0 === peg$FAILED) {
          s0 = peg$parsevalue_iden();
          if (s0 === peg$FAILED) {
            s0 = peg$parseinteger();
            if (s0 === peg$FAILED) {
              s0 = peg$parsestring();
              if (s0 === peg$FAILED) {
                s0 = peg$currPos;
                if (input.charCodeAt(peg$currPos) === 40) {
                  s1 = peg$c10;
                  peg$currPos++;
                } else {
                  s1 = peg$FAILED;
                  if (peg$silentFails === 0) {
                    peg$fail(peg$e17);
                  }
                }
                if (s1 !== peg$FAILED) {
                  s2 = peg$parseadditive_expr();
                  if (s2 !== peg$FAILED) {
                    if (input.charCodeAt(peg$currPos) === 41) {
                      s3 = peg$c11;
                      peg$currPos++;
                    } else {
                      s3 = peg$FAILED;
                      if (peg$silentFails === 0) {
                        peg$fail(peg$e18);
                      }
                    }
                    if (s3 !== peg$FAILED) {
                      s1 = [s1, s2, s3];
                      s0 = s1;
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              }
            }
          }
        }
      }
    }
    return s0;
  }
  function peg$parseobject_expr() {
    var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11;
    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 123) {
      s1 = peg$c12;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e19);
      }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parse_nl();
      s3 = peg$parseobject_member();
      if (s3 !== peg$FAILED) {
        s4 = [];
        s5 = peg$currPos;
        s6 = peg$parse_nl();
        if (input.charCodeAt(peg$currPos) === 44) {
          s7 = peg$c13;
          peg$currPos++;
        } else {
          s7 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e20);
          }
        }
        if (s7 !== peg$FAILED) {
          s8 = peg$parse_nl();
          s9 = peg$parseobject_member();
          if (s9 !== peg$FAILED) {
            s10 = peg$parse_nl();
            if (input.charCodeAt(peg$currPos) === 44) {
              s11 = peg$c13;
              peg$currPos++;
            } else {
              s11 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e20);
              }
            }
            if (s11 !== peg$FAILED) {
              s6 = [s6, s7, s8, s9, s10, s11];
              s5 = s6;
            } else {
              peg$currPos = s5;
              s5 = peg$FAILED;
            }
          } else {
            peg$currPos = s5;
            s5 = peg$FAILED;
          }
        } else {
          peg$currPos = s5;
          s5 = peg$FAILED;
        }
        while (s5 !== peg$FAILED) {
          s4.push(s5);
          s5 = peg$currPos;
          s6 = peg$parse_nl();
          if (input.charCodeAt(peg$currPos) === 44) {
            s7 = peg$c13;
            peg$currPos++;
          } else {
            s7 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e20);
            }
          }
          if (s7 !== peg$FAILED) {
            s8 = peg$parse_nl();
            s9 = peg$parseobject_member();
            if (s9 !== peg$FAILED) {
              s10 = peg$parse_nl();
              if (input.charCodeAt(peg$currPos) === 44) {
                s11 = peg$c13;
                peg$currPos++;
              } else {
                s11 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e20);
                }
              }
              if (s11 !== peg$FAILED) {
                s6 = [s6, s7, s8, s9, s10, s11];
                s5 = s6;
              } else {
                peg$currPos = s5;
                s5 = peg$FAILED;
              }
            } else {
              peg$currPos = s5;
              s5 = peg$FAILED;
            }
          } else {
            peg$currPos = s5;
            s5 = peg$FAILED;
          }
        }
        s5 = peg$parse_nl();
        if (input.charCodeAt(peg$currPos) === 125) {
          s6 = peg$c14;
          peg$currPos++;
        } else {
          s6 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e21);
          }
        }
        if (s6 !== peg$FAILED) {
          s1 = [s1, s2, s3, s4, s5, s6];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 123) {
        s1 = peg$c12;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e19);
        }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_nl();
        if (input.charCodeAt(peg$currPos) === 125) {
          s3 = peg$c14;
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e21);
          }
        }
        if (s3 !== peg$FAILED) {
          s1 = [s1, s2, s3];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    }
    return s0;
  }
  function peg$parseobject_member() {
    var s0, s1, s2, s3, s4, s5;
    s0 = peg$currPos;
    s1 = peg$parsevalue_iden();
    if (s1 !== peg$FAILED) {
      s2 = peg$parse_();
      if (input.charCodeAt(peg$currPos) === 58) {
        s3 = peg$c15;
        peg$currPos++;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e22);
        }
      }
      if (s3 !== peg$FAILED) {
        s4 = peg$parse_();
        s5 = peg$parseadditive_expr();
        if (s5 !== peg$FAILED) {
          s1 = [s1, s2, s3, s4, s5];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parsearray_expr() {
    var s0, s1, s2, s3, s4, s5, s6, s7, s8;
    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 91) {
      s1 = peg$c16;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e23);
      }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parse_nl();
      s3 = [];
      s4 = peg$currPos;
      s5 = peg$parseadditive_expr();
      if (s5 !== peg$FAILED) {
        s6 = peg$parse_nl();
        if (input.charCodeAt(peg$currPos) === 44) {
          s7 = peg$c13;
          peg$currPos++;
        } else {
          s7 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e20);
          }
        }
        if (s7 !== peg$FAILED) {
          s8 = peg$parse_nl();
          s5 = [s5, s6, s7, s8];
          s4 = s5;
        } else {
          peg$currPos = s4;
          s4 = peg$FAILED;
        }
      } else {
        peg$currPos = s4;
        s4 = peg$FAILED;
      }
      if (s4 !== peg$FAILED) {
        while (s4 !== peg$FAILED) {
          s3.push(s4);
          s4 = peg$currPos;
          s5 = peg$parseadditive_expr();
          if (s5 !== peg$FAILED) {
            s6 = peg$parse_nl();
            if (input.charCodeAt(peg$currPos) === 44) {
              s7 = peg$c13;
              peg$currPos++;
            } else {
              s7 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e20);
              }
            }
            if (s7 !== peg$FAILED) {
              s8 = peg$parse_nl();
              s5 = [s5, s6, s7, s8];
              s4 = s5;
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
          } else {
            peg$currPos = s4;
            s4 = peg$FAILED;
          }
        }
      } else {
        s3 = peg$FAILED;
      }
      if (s3 !== peg$FAILED) {
        s4 = peg$parse_nl();
        if (input.charCodeAt(peg$currPos) === 93) {
          s5 = peg$c17;
          peg$currPos++;
        } else {
          s5 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e24);
          }
        }
        if (s5 !== peg$FAILED) {
          s1 = [s1, s2, s3, s4, s5];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 91) {
        s1 = peg$c16;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e23);
        }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_nl();
        s3 = peg$parseadditive_expr();
        if (s3 === peg$FAILED) {
          s3 = null;
        }
        s4 = peg$parse_nl();
        if (input.charCodeAt(peg$currPos) === 93) {
          s5 = peg$c17;
          peg$currPos++;
        } else {
          s5 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e24);
          }
        }
        if (s5 !== peg$FAILED) {
          s1 = [s1, s2, s3, s4, s5];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    }
    return s0;
  }
  function peg$parseinteger() {
    var s0, s1;
    peg$silentFails++;
    s0 = [];
    s1 = input.charAt(peg$currPos);
    if (peg$r4.test(s1)) {
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e26);
      }
    }
    if (s1 !== peg$FAILED) {
      while (s1 !== peg$FAILED) {
        s0.push(s1);
        s1 = input.charAt(peg$currPos);
        if (peg$r4.test(s1)) {
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e26);
          }
        }
      }
    } else {
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e25);
      }
    }
    return s0;
  }
  function peg$parsestring() {
    var s0, s1, s2, s3;
    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 96) {
      s1 = peg$c18;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e27);
      }
    }
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = peg$parsestring_content();
      if (s3 === peg$FAILED) {
        s3 = peg$parseescaped_backtick();
      }
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        s3 = peg$parsestring_content();
        if (s3 === peg$FAILED) {
          s3 = peg$parseescaped_backtick();
        }
      }
      if (input.charCodeAt(peg$currPos) === 96) {
        s3 = peg$c18;
        peg$currPos++;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e27);
        }
      }
      if (s3 !== peg$FAILED) {
        s1 = [s1, s2, s3];
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parsestring_content() {
    var s0, s1;
    s0 = [];
    s1 = input.charAt(peg$currPos);
    if (peg$r5.test(s1)) {
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e28);
      }
    }
    if (s1 !== peg$FAILED) {
      while (s1 !== peg$FAILED) {
        s0.push(s1);
        s1 = input.charAt(peg$currPos);
        if (peg$r5.test(s1)) {
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e28);
          }
        }
      }
    } else {
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parseescaped_backtick() {
    var s0;
    if (input.substr(peg$currPos, 2) === peg$c19) {
      s0 = peg$c19;
      peg$currPos += 2;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e29);
      }
    }
    return s0;
  }
  function peg$parsevalue_iden() {
    var s0, s1, s2, s3;
    peg$silentFails++;
    s0 = peg$currPos;
    s1 = input.charAt(peg$currPos);
    if (peg$r6.test(s1)) {
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e31);
      }
    }
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = input.charAt(peg$currPos);
      if (peg$r7.test(s3)) {
        peg$currPos++;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e32);
        }
      }
      if (s3 !== peg$FAILED) {
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = input.charAt(peg$currPos);
          if (peg$r7.test(s3)) {
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e32);
            }
          }
        }
      } else {
        s2 = peg$FAILED;
      }
      if (s2 !== peg$FAILED) {
        s1 = [s1, s2];
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e30);
      }
    }
    return s0;
  }
  peg$result = peg$startRuleFunction();
  if (options.peg$library) {
    return {
      peg$result,
      peg$currPos,
      peg$FAILED,
      peg$maxFailExpected,
      peg$maxFailPos
    };
  }
  if (peg$result !== peg$FAILED && peg$currPos === input.length) {
    return peg$result;
  } else {
    if (peg$result !== peg$FAILED && peg$currPos < input.length) {
      peg$fail(peg$endExpectation());
    }
    throw peg$buildStructuredError(peg$maxFailExpected, peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null, peg$maxFailPos < input.length ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1) : peg$computeLocation(peg$maxFailPos, peg$maxFailPos));
  }
};
peg$subclass(peg$SyntaxError, Error);
peg$SyntaxError.prototype.format = function(sources) {
  var str = "Error: " + this.message;
  if (this.location) {
    var src = null;
    var k;
    for (k = 0;k < sources.length; k++) {
      if (sources[k].source === this.location.source) {
        src = sources[k].text.split(/\r\n|\n|\r/g);
        break;
      }
    }
    var s = this.location.start;
    var offset_s = this.location.source && typeof this.location.source.offset === "function" ? this.location.source.offset(s) : s;
    var loc = this.location.source + ":" + offset_s.line + ":" + offset_s.column;
    if (src) {
      var e = this.location.end;
      var filler = peg$padEnd("", offset_s.line.toString().length, " ");
      var line = src[s.line - 1];
      var last = s.line === e.line ? e.column : line.length + 1;
      var hatLen = last - s.column || 1;
      str += "\n --> " + loc + "\n" + filler + " |\n" + offset_s.line + " | " + line + "\n" + filler + " | " + peg$padEnd("", s.column - 1, " ") + peg$padEnd("", hatLen, "^");
    } else {
      str += "\n at " + loc;
    }
  }
  return str;
};
peg$SyntaxError.buildMessage = function(expected, found) {
  var DESCRIBE_EXPECTATION_FNS = {
    literal: function(expectation) {
      return "\"" + literalEscape(expectation.text) + "\"";
    },
    class: function(expectation) {
      var escapedParts = expectation.parts.map(function(part) {
        return Array.isArray(part) ? classEscape(part[0]) + "-" + classEscape(part[1]) : classEscape(part);
      });
      return "[" + (expectation.inverted ? "^" : "") + escapedParts.join("") + "]";
    },
    any: function() {
      return "any character";
    },
    end: function() {
      return "end of input";
    },
    other: function(expectation) {
      return expectation.description;
    }
  };
  function hex(ch) {
    return ch.charCodeAt(0).toString(16).toUpperCase();
  }
  function literalEscape(s) {
    return s.replace(/\\/g, "\\\\").replace(/"/g, "\\\"").replace(/\0/g, "\\0").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/[\x00-\x0F]/g, function(ch) {
      return "\\x0" + hex(ch);
    }).replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) {
      return "\\x" + hex(ch);
    });
  }
  function classEscape(s) {
    return s.replace(/\\/g, "\\\\").replace(/\]/g, "\\]").replace(/\^/g, "\\^").replace(/-/g, "\\-").replace(/\0/g, "\\0").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/[\x00-\x0F]/g, function(ch) {
      return "\\x0" + hex(ch);
    }).replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) {
      return "\\x" + hex(ch);
    });
  }
  function describeExpectation(expectation) {
    return DESCRIBE_EXPECTATION_FNS[expectation.type](expectation);
  }
  function describeExpected(expected2) {
    var descriptions = expected2.map(describeExpectation);
    var i, j;
    descriptions.sort();
    if (descriptions.length > 0) {
      for (i = 1, j = 1;i < descriptions.length; i++) {
        if (descriptions[i - 1] !== descriptions[i]) {
          descriptions[j] = descriptions[i];
          j++;
        }
      }
      descriptions.length = j;
    }
    switch (descriptions.length) {
      case 1:
        return descriptions[0];
      case 2:
        return descriptions[0] + " or " + descriptions[1];
      default:
        return descriptions.slice(0, -1).join(", ") + ", or " + descriptions[descriptions.length - 1];
    }
  }
  function describeFound(found2) {
    return found2 ? "\"" + literalEscape(found2) + "\"" : "end of input";
  }
  return "Expected " + describeExpected(expected) + " but " + describeFound(found) + " found.";
};

// node_modules/rescript/lib/es6/caml_option.js
var valFromOption = function(x) {
  if (!(x !== null && x.BS_PRIVATE_NESTED_SOME_NONE !== undefined)) {
    return x;
  }
  var depth = x.BS_PRIVATE_NESTED_SOME_NONE;
  if (depth === 0) {
    return;
  } else {
    return {
      BS_PRIVATE_NESTED_SOME_NONE: depth - 1 | 0
    };
  }
};

// node_modules/rescript/lib/es6/caml_exceptions.js
var is_extension = function(e) {
  if (e == null) {
    return false;
  } else {
    return typeof e.RE_EXN_ID === "string";
  }
};
var idMap = new Map;

// node_modules/rescript/lib/es6/caml_js_exceptions.js
var internalToOCamlException = function(e) {
  if (is_extension(e)) {
    return e;
  } else {
    return {
      RE_EXN_ID: "JsError",
      _1: e
    };
  }
};

// src/Parser.res.mjs
var parse = function(source) {
  try {
    var parseResult = parser(source.contents);
    console.log("parse result: ", parseResult);
    return "Success";
  } catch (raw_obj) {
    var obj = internalToOCamlException(raw_obj);
    if (obj.RE_EXN_ID === $$Error$1) {
      var obj$1 = obj._1;
      var parserError_message = obj$1.message;
      var parserError_prettyMessage = obj$1.message;
      var parserError = {
        exn: obj$1,
        message: parserError_message,
        prettyMessage: parserError_prettyMessage
      };
      return {
        TAG: "Error",
        _0: parserError
      };
    }
    throw obj;
  }
};
var parser = peg$parse;

// node_modules/@rescript/core/src/Core__Option.res.mjs
var getExn = function(x) {
  if (x !== undefined) {
    return valFromOption(x);
  }
  throw {
    RE_EXN_ID: "Not_found",
    Error: new Error
  };
};

// src/Main.res.mjs
var entryFile = getExn(scriptArgs[1]);
console.log(entryFile);
var source = getExn(Std.loadFile(entryFile));
console.log(source);
var parseResult = parse({
  filename: entryFile,
  contents: source
});
console.log(JSON.stringify(parseResult, null, 2));
export {
  source,
  parseResult,
  entryFile
};
