// Coding standards (CODING_STANDARDS.md) that are mechanical enough to lint.

// --- no-number-from-request -------------------------------------------------
// Number("") is 0, so `Number(formData.get("lessonId"))` once opened lesson 0
// for every learner. Request values go through a zod schema instead.

const NUMBER_PARSERS = new Set(["Number", "parseInt", "parseFloat"]);
const REQUEST_SOURCE = /^(formData|searchParams|params|query)$/i;

const isRequestSource = (node) =>
  (node.type === "Identifier" && REQUEST_SOURCE.test(node.name)) ||
  (node.type === "MemberExpression" &&
    !node.computed &&
    REQUEST_SOURCE.test(node.property.name));

const isRequestGet = (node) =>
  node?.type === "CallExpression" &&
  node.callee.type === "MemberExpression" &&
  !node.callee.computed &&
  (node.callee.property.name === "get" ||
    node.callee.property.name === "getAll") &&
  isRequestSource(node.callee.object);

const noNumberFromRequest = {
  meta: {
    type: "problem",
    messages: {
      parse:
        'Parse request values with a zod schema (z.coerce.number().int().positive()), not {{name}}(): Number("") is 0. See "Parse untrusted input with a schema, at the edge" in CODING_STANDARDS.md.',
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (node.callee.type !== "Identifier") return;
        if (!NUMBER_PARSERS.has(node.callee.name)) return;
        if (!isRequestGet(node.arguments[0])) return;
        context.report({
          node,
          messageId: "parse",
          data: { name: node.callee.name },
        });
      },
    };
  },
};

// --- no-ambient-clock -------------------------------------------------------
// A function that reads the clock cannot be tested at a fixed moment. Module
// implementation takes the time as an argument; the entry point or the route
// reads the clock. .oxlintrc.json scopes this rule to app/modules/*/lib/.

const isDateNow = (node) =>
  node.callee.type === "MemberExpression" &&
  !node.callee.computed &&
  node.callee.object.type === "Identifier" &&
  node.callee.object.name === "Date" &&
  node.callee.property.name === "now";

const noAmbientClock = {
  meta: {
    type: "problem",
    messages: {
      clock:
        'Take the time as an argument (`now: Date`) instead of reading the clock here. See "Inject the clock" in CODING_STANDARDS.md.',
    },
  },
  create(context) {
    return {
      NewExpression(node) {
        if (node.callee.type !== "Identifier" || node.callee.name !== "Date")
          return;
        if (node.arguments.length > 0) return;
        context.report({ node, messageId: "clock" });
      },
      CallExpression(node) {
        if (isDateNow(node)) context.report({ node, messageId: "clock" });
      },
    };
  },
};

export default {
  meta: { name: "standards" },
  rules: {
    "no-number-from-request": noNumberFromRequest,
    "no-ambient-clock": noAmbientClock,
  },
};
