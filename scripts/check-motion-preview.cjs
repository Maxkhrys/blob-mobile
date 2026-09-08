const fs = require("fs");
const vm = require("vm");
const ts = require("typescript");
const assert = require("assert");

const source = ts.transpileModule(
  fs.readFileSync("src/components/character/cloudCanvasRuntime.ts", "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } },
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
const html = mod.exports.buildCloudHtml({
  palette: {
    body: "#c4a5ff",
    innerGlow: "#ac90d5",
    edge: "#c59ffe",
    coreTint: "#992fa7",
    glowIntensity: 1.15,
    density: 0.98,
    translucency: 0.8,
  },
  active: true,
});
assert.match(html, /MotionPreviewPlayer/);
let callbacks = [];
let frames = 0;
const events = {};
const gradient = { addColorStop() {} };
const context = new Proxy(
  {
    canvas: { dataset: {} },
    getTransform() {
      return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
    },
    getImageData() {
      return { data: new Uint8ClampedArray(4) };
    },
  },
  {
    get(target, key) {
      if (key in target) return target[key];
      if (String(key).includes("Gradient")) return () => gradient;
      return () => {};
    },
  },
);
const surfaces = [];
const canvas = () => {
  const el = {
    width: 466,
    height: 466,
    style: {},
    dataset: {},
    getContext: () => context,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 466, height: 466 }),
    addEventListener: (k, f) => {
      events[k] = f;
    },
    setPointerCapture() {},
    releasePointerCapture() {},
  };
  surfaces.push(el);
  return el;
};
const window = {
  devicePixelRatio: 1,
  addEventListener(k, f) {
    events[k] = f;
  },
};
const document = {
  hidden: false,
  body: { style: {} },
  getElementById: () => surfaces[0] || canvas(),
  createElement: () => canvas(),
  addEventListener(k, f) {
    events[k] = f;
  },
};
vm.runInNewContext(html.match(/<script>([\s\S]*)<\/script>/)[1], {
  window,
  document,
  requestAnimationFrame: (f) => {
    callbacks.push(f);
    return ++frames;
  },
  cancelAnimationFrame() {},
  Path2D: function () {
    return context;
  },
  console,
  Math,
  performance: { now: () => frames * 16.67 },
});
function advance(count) {
  for (let i = 0; i < count; i++) {
    const batch = callbacks;
    callbacks = [];
    batch.forEach((f) => f(frames * 16.67));
  }
}
advance(8);
const ids = [
  "NEUTRAL",
  "TURN_LEFT",
  "TURN_RIGHT",
  "SPIN_360",
  "BACKFLIP",
  "FRONTFLIP",
  "CARTWHEEL_LEFT",
  "CARTWHEEL_RIGHT",
  "SIG_PANCAKE",
  "SIG_GIANT_PROUD_PUFF",
  "SIG_TALL_STRETCH",
  "PLAY_SHOWCASE",
];
for (const id of ids) {
  window.handleDevLabCommand({ type: "triggerMotion", id });
  advance(id === "PLAY_SHOWCASE" ? 30 : 80);
  const el = surfaces[0];
  for (const key of ["finalYaw", "finalPitch", "performanceYaw", "performancePitch", "performanceRoll"]) {
    const value = Number(el.dataset[key] || 0);
    assert(Number.isFinite(value), `${id} ${key}=${el.dataset[key]}`);
  }
}
console.log("PASS motion ids", ids.join(","));
