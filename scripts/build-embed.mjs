#!/usr/bin/env node
/**
 * Build the distribution artifacts:
 *
 *   dist/companion.js       IIFE for <script> tag (self-mounting; everything bundled including React)
 *   dist/index.mjs          ESM for `import { ... } from "cursor-companion-ai"` (React external)
 *   dist/index.cjs          CJS fallback
 *   dist/index.d.ts         Type declarations
 *
 * The same Tailwind CSS + cursor PNG get inlined into every JS output via
 * esbuild's `define` substitution so consumers don't have to import extra
 * CSS or assets.
 */
import * as esbuild from "esbuild";
import { execSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  unlinkSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const TMP_CSS = resolve(ROOT, ".embed-tailwind.css");
const DIST_DIR = resolve(ROOT, "dist");
const CURSOR = resolve(ROOT, "public/cursor.png");

if (!existsSync(DIST_DIR)) mkdirSync(DIST_DIR);

console.log("[embed] tailwind …");
execSync(
  `npx tailwindcss -c ./tailwind.embed.config.js -i ./src/embed.css -o ${TMP_CSS} --minify`,
  { stdio: "inherit", cwd: ROOT }
);
const css = readFileSync(TMP_CSS, "utf8");

const cursorBytes = readFileSync(CURSOR);
const cursorDataUrl = `data:image/png;base64,${cursorBytes.toString("base64")}`;

const SHARED_DEFINES = {
  "process.env.NODE_ENV": '"production"',
  "process.env.ANTHROPIC_API_KEY": "undefined",
  "process.env.GROQ_API_KEY": "undefined",
  "process.env.OPENAI_API_KEY": "undefined",
  "process.env.ANTHROPIC_LOG": "undefined",
  "process.env.ANTHROPIC_AUTH_TOKEN": "undefined",
  __COMPANION_CSS__: JSON.stringify(css),
  __COMPANION_CURSOR__: JSON.stringify(cursorDataUrl),
};

const SHARED_EXTERNAL_NODE = [
  "node:*",
  "fs",
  "path",
  "os",
  "crypto",
  "child_process",
  "readline",
  "util",
  "stream",
  "events",
];

/**
 * For the ESM/CJS builds we cannot leave Node core imports as runtime
 * externals — downstream bundlers (Turbopack, Vite, webpack) refuse to
 * re-resolve them in a client bundle. Stub them with empty objects at our
 * build time. The code paths that touch them (Anthropic SDK credential
 * chain, agent toolset) are unreachable when consumers pass apiKey
 * explicitly.
 */
const stubNodeCoreModules = {
  name: "stub-node-core",
  setup(build) {
    const pattern =
      /^(node:.*|fs|fs\/promises|path|os|crypto|child_process|readline|util|stream|events|buffer|process|tty|net|tls|http|https|querystring|url|zlib|assert|module)$/;
    build.onResolve({ filter: pattern }, (args) => ({
      path: args.path,
      namespace: "stub-node-core",
    }));
    build.onLoad({ filter: /.*/, namespace: "stub-node-core" }, () => ({
      contents:
        "export default {}; export const promises = {}; export const constants = {};",
      loader: "js",
    }));
  },
};

// ----- 1. IIFE bundle (script-tag) -----
console.log("[embed] IIFE …");
await esbuild.build({
  entryPoints: [resolve(ROOT, "src/embed.tsx")],
  bundle: true,
  platform: "browser",
  conditions: ["browser", "module", "import", "default"],
  format: "iife",
  target: "es2020",
  jsx: "automatic",
  outfile: resolve(DIST_DIR, "companion.js"),
  minify: true,
  legalComments: "none",
  define: SHARED_DEFINES,
  loader: { ".png": "dataurl" },
  external: SHARED_EXTERNAL_NODE,
  logLevel: "warning",
});

// ----- 2. ESM bundle (npm import) -----
// React + react-dom are peer-deps; consumers bring their own to avoid the
// dreaded two-Reacts-in-one-app bug. Node-core imports are stubbed (not
// external) so downstream bundlers like Turbopack don't choke on them.
console.log("[embed] ESM …");
await esbuild.build({
  entryPoints: [resolve(ROOT, "src/index.tsx")],
  bundle: true,
  platform: "browser",
  conditions: ["browser", "module", "import", "default"],
  format: "esm",
  target: "es2020",
  jsx: "automatic",
  outfile: resolve(DIST_DIR, "index.mjs"),
  minify: true,
  legalComments: "none",
  define: SHARED_DEFINES,
  loader: { ".png": "dataurl" },
  external: [
    "react",
    "react-dom",
    "react-dom/client",
    "react/jsx-runtime",
  ],
  plugins: [stubNodeCoreModules],
  logLevel: "warning",
});

// ----- 3. CJS bundle (npm import, legacy bundlers) -----
console.log("[embed] CJS …");
await esbuild.build({
  entryPoints: [resolve(ROOT, "src/index.tsx")],
  bundle: true,
  platform: "browser",
  conditions: ["browser", "module", "import", "default"],
  format: "cjs",
  target: "es2020",
  jsx: "automatic",
  outfile: resolve(DIST_DIR, "index.cjs"),
  minify: true,
  legalComments: "none",
  define: SHARED_DEFINES,
  loader: { ".png": "dataurl" },
  external: [
    "react",
    "react-dom",
    "react-dom/client",
    "react/jsx-runtime",
  ],
  plugins: [stubNodeCoreModules],
  logLevel: "warning",
});

// ----- 3b. Server bundle (Node-side proxy helper) -----
// Targets Node, not the browser. No CSS / cursor inlining. React isn't used.
console.log("[embed] server (ESM) …");
await esbuild.build({
  entryPoints: [resolve(ROOT, "src/server.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node18",
  outfile: resolve(DIST_DIR, "server.mjs"),
  minify: true,
  legalComments: "none",
  // For the server bundle, Node-core imports stay native; no stubbing.
  external: ["@anthropic-ai/sdk", "openai"],
  logLevel: "warning",
});

console.log("[embed] server (CJS) …");
await esbuild.build({
  entryPoints: [resolve(ROOT, "src/server.ts")],
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node18",
  outfile: resolve(DIST_DIR, "server.cjs"),
  minify: true,
  legalComments: "none",
  external: ["@anthropic-ai/sdk", "openai"],
  logLevel: "warning",
});

// ----- 4. Type declarations (hand-maintained) -----
copyFileSync(
  resolve(ROOT, "src/index.d.ts"),
  resolve(DIST_DIR, "index.d.ts")
);
copyFileSync(
  resolve(ROOT, "src/server.d.ts"),
  resolve(DIST_DIR, "server.d.ts")
);

// ----- 5. Mirror the IIFE into public/ for the Next.js dev demo -----
copyFileSync(
  resolve(DIST_DIR, "companion.js"),
  resolve(ROOT, "public/companion.js")
);

// Cleanup
try {
  unlinkSync(TMP_CSS);
} catch {}

const sizes = [
  ["companion.js", statSync(resolve(DIST_DIR, "companion.js")).size],
  ["index.mjs", statSync(resolve(DIST_DIR, "index.mjs")).size],
  ["index.cjs", statSync(resolve(DIST_DIR, "index.cjs")).size],
  ["index.d.ts", statSync(resolve(DIST_DIR, "index.d.ts")).size],
  ["server.mjs", statSync(resolve(DIST_DIR, "server.mjs")).size],
  ["server.cjs", statSync(resolve(DIST_DIR, "server.cjs")).size],
  ["server.d.ts", statSync(resolve(DIST_DIR, "server.d.ts")).size],
];
console.log("[embed] done");
for (const [name, size] of sizes) {
  console.log(`  dist/${name.padEnd(15)} ${(size / 1024).toFixed(1)} KB`);
}
