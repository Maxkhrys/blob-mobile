const fs = require("fs"),
  ts = require("typescript"),
  vm = require("vm"),
  assert = require("assert");
const source = ts.transpileModule(
  fs.readFileSync("src/components/character/cloudCanvasRuntime.ts", "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  },
).outputText;
const mod = { exports: {} };
function requireGenerated(p) {
  const file = "src/components/character/" + p.slice(2) + ".ts";
  const m = { exports: {} };
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    { exports: m.exports },
  );
  return m.exports;
}
vm.runInNewContext(source, { exports: mod.exports, require: requireGenerated });
let callbacks = [],
  frames = 0;
const events = {};
const gradient = { addColorStop() {} };
const context = new Proxy(
  {
    getTransform() {
      return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
    },
    getImageData() {
      return { data: new Uint8ClampedArray(466 * 466 * 4) };
    },
  },
  {
    get(target, key) {
      if (key in target) return target[key];
      if (String(key).includes("Gradient")) return () => gradient;
      return (...args) => {
        for (const x of args)
          if (typeof x === "number")
            assert(
              Number.isFinite(x),
              `Nonfinite canvas ${String(key)} ${args}`,
            );
      };
    },
  },
);
const canvas = () => ({
  width: 466,
  height: 466,
  style: {},
  getContext: () => context,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 466, height: 466 }),
});
const window = {
  devicePixelRatio: 1,
  addEventListener: (k, f) => {
    events[k] = f;
  },
};
const document = {
  hidden: false,
  body: { style: {} },
  getElementById: () => canvas(),
  createElement: () => canvas(),
  addEventListener: (k, f) => {
    events[k] = f;
  },
};
const html = mod.exports.buildCloudHtml({
  palette: {
    body: "#cfe4ff",
    innerGlow: "#4d92f5",
    edge: "#f0f7ff",
    coreTint: "#3d6598",
    glowIntensity: 1.04,
    density: 0.94,
    translucency: 0.84,
  },
  active: true,
  displayMode: "warm",
});
vm.runInNewContext(html.match(/<script>([\s\S]*)<\/script>/)[1], {
  window,
  document,
  requestAnimationFrame: (f) => {
    callbacks.push(f);
    return ++frames;
  },
  cancelAnimationFrame: () => {},
  Path2D: function () {
    return context;
  },
  console,
  Math,
});
function advance(count) {
  for (let i = 0; i < count; i++) {
    const batch = callbacks;
    callbacks = [];
    batch.forEach((f) => f(frames * 16.67));
  }
}
advance(120);
for (const id of [
  "HAPPY",
  "EXCITED_WIGGLE",
  "CURIOUS_DOUBLE_TAKE",
  "SURPRISE_POP",
  "SLEEPY_YAWN",
  "ANGRY_FLARE",
  "SAD_SETTLE",
  "LAUGH_SQUISH",
  "JOY_HOP",
  "SMUG",
  "HAPPY_SOFT",
  "AFFECTIONATE",
]) {
  window.updateCloudProps({ reactionId: id, reactionToken: frames });
  advance(180);
}
window.updateCloudProps({ active: false });
advance(2);
assert.equal(callbacks.length, 0, "Hidden preview must stop scheduling frames");
window.updateCloudProps({ active: true });
assert.equal(callbacks.length, 1);
advance(2);
fs.writeFileSync("/tmp/cherripi-runtime.html", html);
console.log(
  "PASS: 12 reactions, finite canvas geometry, idle return frames, pause/resume, native 466 render.",
);
