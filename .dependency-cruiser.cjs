// @ts-check
// Deep-module enforcement for dependency-cruiser.
//
// Each package under the packages root is a DEEP MODULE: a lot of behaviour
// behind a small interface. A package's PUBLIC SURFACE is its ENTRY POINTS:
// the files at the package root. Implementation lives in SUBFOLDERS and is
// private (by convention `lib/` for implementation and `tests/` for tests,
// though any subfolder is private). A package may expose several small entry
// points (index.ts, client.ts, server.ts, …); prefer that over one giant
// barrel index.
//
// The only thing you should ever need to edit here is PACKAGES_ROOT.

/** Where packages live. One immediate child dir per package (flat, no nesting). */
const PACKAGES_ROOT = "app/modules";

// --- derived patterns (no need to edit) -------------------------------------
const R = PACKAGES_ROOT;
/**
 * A package's private internals: anything nested inside a package subfolder.
 * The package's root files are its entry points and are NOT matched here:
 * they stay importable from outside.
 */
const PACKAGE_INTERNALS = `^${R}/[^/]+/[^/]+/`;

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "entrypoint-boundary-from-app",
      comment:
        "App/root code may import a package's entry points (its root files), but nothing inside its subfolders.",
      severity: "error",
      from: { pathNot: `^${R}/` }, // importer is NOT inside any package
      to: { path: PACKAGE_INTERNALS },
    },
    {
      name: "entrypoint-boundary-across-packages",
      comment:
        "A package's own files import each other freely, but may reach OTHER packages only through their entry points, never their internals.",
      severity: "error",
      // importer is inside a package ($1), but is not a test file
      from: { path: `^${R}/([^/]+)/`, pathNot: `^${R}/[^/]+/tests/` },
      to: {
        path: PACKAGE_INTERNALS,
        pathNot: `^${R}/$1/`, // same package → intra-package freedom
      },
    },
    {
      name: "tests-through-entrypoints",
      comment:
        "A package's tests exercise it through its entry points like everyone else: they may import any package's entry points and their own tests/ fixtures, but never any package's internals, not even their own.",
      severity: "error",
      from: { path: `^${R}/([^/]+)/tests/` }, // a test file, in package $1
      to: {
        path: PACKAGE_INTERNALS,
        pathNot: `^${R}/$1/tests/`, // own tests/ fixtures → allowed
      },
    },
    {
      name: "tests-folder-is-private",
      comment:
        "A package's tests/ folder is reachable only from tests: nothing else may import fixtures.",
      severity: "error",
      from: { pathNot: `^${R}/[^/]+/tests/` }, // importer is not itself a test
      to: { path: `^${R}/[^/]+/tests/` },
    },
    {
      name: "no-circular",
      comment:
        "No dependency cycles. Scope to `^${R}/` if you want to allow cycles outside packages.",
      severity: "error",
      from: {},
      to: { circular: true },
    },

    // --- Layering (optional, off by default) ----------------------------------
    // Interface-hiding controls HOW you import (through the entry points).
    // Layering controls WHICH packages may depend on which. Add your own rules
    // here, e.g.:
    //
    // {
    //   name: "ui-may-not-depend-on-billing",
    //   severity: "error",
    //   from: { path: `^${R}/ui/` },
    //   to:   { path: `^${R}/billing/` },
    // },

    {
      name: "routes-no-db",
      comment:
        "A route gets its data from a module, never by querying the database itself. A ratchet: the routes in pathNot predate the rule. Remove each one once its queries move into a module; never add one.",
      severity: "error",
      from: {
        path: "^app/routes/",
        pathNot: [
          "^app/routes/admin\\.categories\\.tsx$",
          "^app/routes/admin\\.courses\\.tsx$",
          "^app/routes/admin\\.refunds\\.tsx$",
          "^app/routes/admin\\.users\\.tsx$",
          "^app/routes/api\\.video-tracking\\.ts$",
          "^app/routes/courses\\.\\$slug\\.\\$moduleId\\.tsx$",
          "^app/routes/courses\\.\\$slug\\.lessons\\.\\$lessonId\\.tsx$",
          "^app/routes/courses\\.\\$slug\\.purchase\\.tsx$",
          "^app/routes/courses\\.\\$slug\\.refund\\.ts$",
          "^app/routes/courses\\.\\$slug\\.tsx$",
          "^app/routes/courses\\.\\$slug\\.welcome\\.tsx$",
          "^app/routes/courses\\.tsx$",
          "^app/routes/dashboard\\.tsx$",
          "^app/routes/home\\.tsx$",
          "^app/routes/instructor\\.\\$courseId\\.lessons\\.\\$lessonId\\.quiz\\.tsx$",
          "^app/routes/instructor\\.\\$courseId\\.lessons\\.\\$lessonId\\.tsx$",
          "^app/routes/instructor\\.\\$courseId\\.modules\\.\\$moduleId\\.tsx$",
          "^app/routes/instructor\\.\\$courseId\\.students\\.tsx$",
          "^app/routes/instructor\\.\\$courseId\\.tsx$",
          "^app/routes/instructor\\.new\\.tsx$",
          "^app/routes/instructor\\.questions\\.tsx$",
          "^app/routes/instructor\\.tsx$",
          "^app/routes/layout\\.app\\.tsx$",
          "^app/routes/login\\.tsx$",
          "^app/routes/redeem\\.\\$code\\.tsx$",
          "^app/routes/saved\\.tsx$",
          "^app/routes/settings\\.tsx$",
          "^app/routes/signup\\.tsx$",
          "^app/routes/team\\.tsx$",
        ],
      },
      to: { path: ["^app/db/", "^node_modules/(drizzle-orm|better-sqlite3)/"] },
    },
    {
      name: "module-lib-no-db-connection",
      comment:
        "A module's implementation takes `db` as an argument, so its tests can pass a test database. Only the module's entry points (its root files) import the connection.",
      severity: "error",
      from: { path: `^${R}/[^/]+/lib/` },
      to: { path: ["^app/db/index\\.ts$", "^node_modules/better-sqlite3/"] },
    },
    {
      name: "modules-no-components",
      comment:
        "Modules hold behaviour; components render it. A type both share lives in the module, and the component imports it from there.",
      severity: "error",
      from: { path: `^${R}/` },
      to: { path: "^app/components/" },
    },
    {
      name: "components-no-db-connection",
      comment:
        "Components ship to the browser, so they may not open the database connection: it pulls better-sqlite3 into the client bundle and breaks hydration. Get data through a loader instead.",
      severity: "error",
      from: { path: "^app/components/" },
      to: {
        path: ["^app/db/index\\.ts$", "^node_modules/better-sqlite3/"],
      },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
    },
  },
};
