/**
 * Canonical Cherri brain parity against LCDPROTO 7d26f8b.
 * Fails if mobile silently misses a catalogue or runtime item.
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");
const ts = require("typescript");

const WEB = process.env.LCDPROTO_ROOT || path.resolve(__dirname, "../../LCDPROTO");
const MOBILE = path.resolve(__dirname, "../vendor/lcdproto");
const EXPECTED_SHA = "7d26f8ba6b8709d38b071115a025ba0dfeaefbee";
const MANIFEST = JSON.parse(fs.readFileSync(path.join(MOBILE, "manifest.json"), "utf8"));

assert.strictEqual(MANIFEST.sha, EXPECTED_SHA, "vendor manifest SHA");
assert.strictEqual(MANIFEST.branch, "feat/grok-terra-orientation-synthesis-v1");

const webHead = fs.readFileSync(path.join(WEB, ".git/HEAD"), "utf8").trim();
// detached checkout stores SHA in HEAD or git/HEAD file; fall back to rev-parse via file
let webSha = webHead.startsWith("ref:") ? null : webHead;
if (!webSha) {
  const ref = webHead.slice(5).trim();
  webSha = fs.readFileSync(path.join(WEB, ".git", ref), "utf8").trim();
}
assert.strictEqual(webSha, EXPECTED_SHA, "LCDPROTO checkout SHA");

function loadTree(root) {
  const cache = {};
  function resolve(fromFile, spec) {
    let target = spec;
    if (spec.startsWith("@/")) target = spec.slice(2);
    else if (spec.startsWith(".")) target = path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), spec));
    else return null;
    const candidates = [target + ".ts", target + ".tsx", target + "/index.ts", target + "/index.tsx"];
    if (target.endsWith(".ts") || target.endsWith(".tsx")) candidates.unshift(target);
    for (const c of candidates) {
      const abs = path.join(root, c);
      if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return c;
    }
    throw new Error(`unresolved ${spec} from ${fromFile}`);
  }
  function load(id) {
    const key = id.endsWith(".ts") || id.endsWith(".tsx") ? id : id + ".ts";
    if (cache[key]) return cache[key].exports;
    const filename = path.join(root, key);
    const source = fs.readFileSync(filename, "utf8");
    const js = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React },
      fileName: filename,
    }).outputText;
    const module = { exports: {} };
    cache[key] = module;
    const localRequire = (spec) => {
      if (spec === "react") return {};
      const resolved = resolve(key, spec);
      if (!resolved) throw new Error("external " + spec);
      return load(resolved);
    };
    vm.runInNewContext(js, { require: localRequire, module, exports: module.exports, console }, { filename });
    return module.exports;
  }
  return load;
}

function idsOf(mapOrList) {
  if (!mapOrList) return [];
  if (typeof mapOrList.keys === "function" && typeof mapOrList.size === "number") return [...mapOrList.keys()];
  if (Array.isArray(mapOrList)) return mapOrList.map((item) => (typeof item === "string" ? item : item.id)).filter(Boolean);
  return Object.keys(mapOrList);
}

function storyIds(mod) {
  const catalogue = idsOf(mod.ALL_STORIES).sort();
  const extra = [];
  if (!catalogue.includes("DEMO_60S_ADORABILITY")) extra.push("DEMO_60S_ADORABILITY");
  return { catalogue, brain: [...catalogue, ...extra].sort() };
}

function primitiveParams(primitives) {
  const out = {};
  for (const id of Object.keys(primitives).sort()) {
    const value = primitives[id];
    const clone = JSON.parse(JSON.stringify(value));
    if (clone.sample) delete clone.sample;
    out[id] = clone;
  }
  return out;
}

function diffIds(webIds, mobileIds) {
  const web = new Set(webIds);
  const mobile = new Set(mobileIds);
  return {
    missing: [...web].filter((id) => !mobile.has(id)).sort(),
    extra: [...mobile].filter((id) => !web.has(id)).sort(),
  };
}

const webLoad = loadTree(WEB);
const mobileLoad = loadTree(MOBILE);
const webCat = webLoad("lib/mind/catalogue/index.ts");
const mobileCat = mobileLoad("lib/mind/catalogue/index.ts");
const webPrim = webLoad("lib/behaviours/primitives.ts");
const mobilePrim = mobileLoad("lib/behaviours/primitives.ts");
const webMouth = webLoad("lib/behaviours/mouths.ts");
const mobileMouth = mobileLoad("lib/behaviours/mouths.ts");
const webActing = webLoad("lib/mind/acting.ts");
const mobileActing = mobileLoad("lib/mind/acting.ts");
const webEmotion = webLoad("lib/mind/emotion.ts");
const mobileEmotion = mobileLoad("lib/mind/emotion.ts");
const webControllerMod = webLoad("lib/behaviours/controller.ts");
const mobileControllerMod = mobileLoad("lib/behaviours/controller.ts");
const webOrient = webLoad("lib/orientation.ts");
const mobileFacing = mobileLoad("lib/mind/cloudFacing.ts");

const webStories = storyIds(webCat);
const mobileStories = storyIds(mobileCat);
const storyDiff = diffIds(webStories.brain, mobileStories.brain);
const primDiff = diffIds(Object.keys(webPrim.PRIMITIVES), Object.keys(mobilePrim.PRIMITIVES));
const mouthDiff = diffIds(Object.keys(webMouth.MOUTH_RECIPES), Object.keys(mobilePrim.PRIMITIVES && mobileMouth.MOUTH_RECIPES));
const mouthOnly = diffIds(Object.keys(webMouth.MOUTH_RECIPES), Object.keys(mobileMouth.MOUTH_RECIPES));
const sigDiff = diffIds(
  webCat.SIGNATURE_LIFE_STORIES.map((s) => s.id),
  mobileCat.SIGNATURE_LIFE_STORIES.map((s) => s.id),
);
const cycleDiff = diffIds(webActing.ACTING_CYCLES, mobileActing.ACTING_CYCLES);
const intensityDiff = diffIds(webActing.ACTING_INTENSITIES, mobileActing.ACTING_INTENSITIES);
const moodDiff = diffIds(Object.keys(webEmotion.MOOD_FORCE), Object.keys(mobileEmotion.MOOD_FORCE));

const webParams = primitiveParams(webPrim.PRIMITIVES);
const mobileParams = primitiveParams(mobilePrim.PRIMITIVES);
const paramDiffs = [];
for (const id of Object.keys(webParams)) {
  if (!mobileParams[id]) continue;
  if (JSON.stringify(webParams[id]) !== JSON.stringify(mobileParams[id])) paramDiffs.push(id);
}
const mouthParamDiffs = [];
for (const id of Object.keys(webMouth.MOUTH_RECIPES)) {
  if (JSON.stringify(webMouth.MOUTH_RECIPES[id]) !== JSON.stringify(mobileMouth.MOUTH_RECIPES[id])) mouthParamDiffs.push(id);
}

const report = {
  WEB_STORY_COUNT: webStories.brain.length,
  MOBILE_STORY_COUNT: mobileStories.brain.length,
  CATALOGUE_STORY_COUNT: webStories.catalogue.length,
  MISSING_ON_MOBILE: storyDiff.missing,
  EXTRA_ON_MOBILE: storyDiff.extra,
  WEB_PRIMITIVE_COUNT: Object.keys(webPrim.PRIMITIVES).length,
  MOBILE_PRIMITIVE_COUNT: Object.keys(mobilePrim.PRIMITIVES).length,
  PRIMITIVE_MISSING: primDiff.missing,
  PRIMITIVE_EXTRA: primDiff.extra,
  PRIMITIVE_PARAM_DIFFS: paramDiffs,
  WEB_MOUTH_COUNT: Object.keys(webMouth.MOUTH_RECIPES).length,
  MOBILE_MOUTH_COUNT: Object.keys(mobileMouth.MOUTH_RECIPES).length,
  MOUTH_MISSING: mouthOnly.missing,
  MOUTH_EXTRA: mouthOnly.extra,
  MOUTH_PARAM_DIFFS: mouthParamDiffs,
  WEB_SIGNATURE_COUNT: webCat.SIGNATURE_LIFE_STORIES.length,
  MOBILE_SIGNATURE_COUNT: mobileCat.SIGNATURE_LIFE_STORIES.length,
  SIGNATURE_MISSING: sigDiff.missing,
  ACTING_CYCLES: mobileActing.ACTING_CYCLES,
  CYCLE_MISSING: cycleDiff.missing,
  INTENSITIES: mobileActing.ACTING_INTENSITIES,
  INTENSITY_MISSING: intensityDiff.missing,
  MOODS: Object.keys(mobileEmotion.MOOD_FORCE).sort(),
  MOOD_MISSING: moodDiff.missing,
  SHOWCASE_SEQUENCE: mobileActing.SHOWCASE_SEQUENCE,
};

function cfg() {
  return { gazePx: 8, squash: 0.032, paceScale: 1, blinkIntervalMs: 3400 };
}

function step(controller, ms, dt = 16.67, auto = true) {
  let elapsed = 0;
  while (elapsed < ms) {
    const slice = Math.min(dt, ms - elapsed);
    controller.update(slice, cfg(), auto);
    elapsed += slice;
  }
}

function samplePose(controller) {
  const pose = controller.pose();
  const truth = controller.poseTruthSnapshot();
  const mind = controller.mindTelemetry();
  return {
    storyId: mind.storyId,
    phase: mind.phase,
    primitive: truth.primitiveId,
    amount: Number(truth.primitiveAmount.toFixed(4)),
    blobScale: Number(pose.blobScale.toFixed(4)),
    blobScaleX: Number(pose.blobScaleX.toFixed(4)),
    blobScaleY: Number(pose.blobScaleY.toFixed(4)),
    bodyScaleX: Number(pose.bodyScaleX.toFixed(4)),
    bodyScaleY: Number(pose.bodyScaleY.toFixed(4)),
    gazeX: Number((pose.eyeX + pose.leftEyeX).toFixed(3)),
    gazeY: Number((pose.eyeY + pose.leftEyeY).toFixed(3)),
    yaw: Number(pose.blobYaw.toFixed(3)),
    pitch: Number(pose.blobPitch.toFixed(3)),
    performanceYaw: Number(pose.blobPerformanceYaw.toFixed(3)),
    performancePitch: Number(pose.blobPerformancePitch.toFixed(3)),
    performanceRoll: Number(pose.blobPerformanceRoll.toFixed(3)),
    mouthCurve: Number(pose.mouthCurve.toFixed(3)),
    mouthO: Number(pose.mouthO.toFixed(3)),
    mouthD: Number(pose.mouthD.toFixed(3)),
    mouthCrescent: Number(pose.mouthCrescent.toFixed(3)),
    mouthTongue: Number(pose.mouthTongue.toFixed(4)),
    tintAmount: Number(pose.tintAmount.toFixed(4)),
  };
}

function runShowcase(Controller) {
  const controller = new Controller();
  controller.setMindSeed(0xc4e881);
  controller.setActingCycle("SHOWCASE");
  controller.setActingIntensity("EXPRESSIVE");
  const ok = controller.playStory("DEMO_60S_ADORABILITY");
  assert.strictEqual(ok, true, "DEMO_60S_ADORABILITY playStory");
  const marks = [0, 7000, 13000, 20000, 28000, 34000, 42000, 48000, 56000];
  const samples = {};
  let cursor = 0;
  for (const mark of marks) {
    step(controller, mark - cursor, 16.67, true);
    cursor = mark;
    samples[mark] = samplePose(controller);
  }
  const plan = controller.activePlan;
  return { samples, durationMs: plan ? plan.durationMs : null, storyId: controller.mindTelemetry().storyId };
}

const webShow = runShowcase(webControllerMod.BehaviourController);
const mobileShow = runShowcase(mobileControllerMod.BehaviourController);
assert.strictEqual(webShow.durationMs, 60000, "web showcase duration");
assert.strictEqual(mobileShow.durationMs, 60000, "mobile showcase duration");
const sampleDiffs = [];
for (const mark of Object.keys(webShow.samples)) {
  if (JSON.stringify(webShow.samples[mark]) !== JSON.stringify(mobileShow.samples[mark])) {
    sampleDiffs.push({ mark, web: webShow.samples[mark], mobile: mobileShow.samples[mark] });
  }
}

function runNatural(Controller) {
  const controller = new Controller();
  controller.setMindSeed(0xc4e881);
  controller.setActingCycle("NATURAL");
  controller.setActingIntensity("EXPRESSIVE");
  const seen = [];
  let last = "";
  const steps = Math.round(120000 / 50);
  for (let i = 0; i < steps; i++) {
    controller.update(50, cfg(), true);
    const id = controller.mindTelemetry().storyId;
    if (id && id !== last) {
      seen.push(id);
      last = id;
    }
  }
  return seen;
}
const webNatural = runNatural(webControllerMod.BehaviourController);
const mobileNatural = runNatural(mobileControllerMod.BehaviourController);

function tongueAndTint(Controller) {
  const showcase = new Controller();
  showcase.setMindSeed(0xc4e881);
  showcase.setActingCycle("SHOWCASE");
  showcase.setActingIntensity("EXPRESSIVE");
  showcase.playStory("DEMO_60S_ADORABILITY");
  step(showcase, 42000, 16.67, true);
  const duringTongue = showcase.pose().mouthTongue;
  step(showcase, 22000, 16.67, true);
  const afterTongue = showcase.pose().mouthTongue;
  const tinted = new Controller();
  tinted.setMindSeed(3);
  assert.strictEqual(tinted.playStory("SIG_CAUGHT_YOU_LOOKING"), true);
  step(tinted, 800, 16.67, true);
  const duringTint = tinted.pose().tintAmount;
  step(tinted, 5200, 16.67, false);
  const afterTint = tinted.pose().tintAmount;
  return { duringTongue, afterTongue, duringTint, afterTint };
}
const tongue = tongueAndTint(mobileControllerMod.BehaviourController);

function spinUnwrap(Controller) {
  const controller = new Controller();
  controller.trigger("SPIN_360", cfg());
  step(controller, 2800, 16.67, false);
  const once = controller.pose().blobPerformanceYaw;
  controller.trigger("SPIN_360", cfg());
  step(controller, 2800, 16.67, false);
  const twice = controller.pose().blobPerformanceYaw;
  return { once, twice };
}
const spins = spinUnwrap(mobileControllerMod.BehaviourController);

function backFace() {
  const facing = webOrient.orientationMatrix({ yaw: 180, pitch: 0, roll: 0 });
  const normal = webOrient.rotateVec3(facing, { x: 0, y: 0, z: 1 });
  const front = webOrient.orientationMatrix({ yaw: 0, pitch: 0, roll: 0 });
  const frontNormal = webOrient.rotateVec3(front, { x: 0, y: 0, z: 1 });
  const mobileFacingM = mobileLoad("lib/orientation.ts");
  const mobileNormal = mobileFacingM.rotateVec3(mobileFacingM.orientationMatrix({ yaw: 180, pitch: 0, roll: 0 }), { x: 0, y: 0, z: 1 });
  return { webZ: normal.z, frontZ: frontNormal.z, mobileZ: mobileNormal.z };
}
const face = backFace();

function followThrough() {
  const facing = { ...mobileFacing.NEUTRAL_CLOUD_FACING };
  mobileFacing.applyCloudFacing(facing, { yaw: 180, pitch: 0 }, { yaw: 0, pitch: 0, roll: 0 }, 0.016);
  return {
    eyes: facing.facingYaw,
    core: facing.coreFacingYaw,
    shell: facing.shellFacingYaw,
    crown: facing.crownFacingYaw,
    mass: facing.massFacingYaw,
  };
}
const lag = followThrough();

function interrupt(Controller) {
  const controller = new Controller();
  controller.setMindSeed(0xc4e881);
  controller.setActingCycle("NATURAL");
  controller.playStory("SIG_PANCAKE");
  step(controller, 400, 16.67, true);
  const before = controller.mindTelemetry().storyId;
  controller.notify({ id: "GRAB_START", strength: 1, direction: 1 });
  step(controller, 400, 16.67, true);
  const grabbed = controller.mindTelemetry();
  controller.notify({ id: "RELEASE", strength: 0.6, direction: 0 });
  step(controller, 1200, 16.67, true);
  const after = controller.mindTelemetry();
  return {
    before,
    grabbedStory: grabbed.storyId,
    grabbedEvents: grabbed.recentEvents,
    afterStory: after.storyId,
    afterEvents: after.recentEvents,
  };
}
const interaction = interrupt(mobileControllerMod.BehaviourController);

const failures = [];
function expectEmpty(name, list) {
  if (list && list.length) failures.push(`${name}: ${list.join(",")}`);
}
expectEmpty("MISSING_ON_MOBILE", storyDiff.missing);
expectEmpty("EXTRA_ON_MOBILE", storyDiff.extra);
expectEmpty("PRIMITIVE_MISSING", primDiff.missing);
expectEmpty("PRIMITIVE_PARAM_DIFFS", paramDiffs);
expectEmpty("MOUTH_MISSING", mouthOnly.missing);
expectEmpty("MOUTH_PARAM_DIFFS", mouthParamDiffs);
expectEmpty("SIGNATURE_MISSING", sigDiff.missing);
expectEmpty("CYCLE_MISSING", cycleDiff.missing);
expectEmpty("INTENSITY_MISSING", intensityDiff.missing);
expectEmpty("MOOD_MISSING", moodDiff.missing);
expectEmpty("SHOWCASE_SAMPLE_DIFFS", sampleDiffs.map((d) => d.mark));
if (JSON.stringify(webNatural) !== JSON.stringify(mobileNatural)) {
  failures.push("NATURAL_SEQUENCE_DIFF");
}
if (!(tongue.duringTongue > 0.5)) failures.push(`tongue did not rise (${tongue.duringTongue})`);
if (!(tongue.afterTongue < 0.05)) failures.push(`tongue did not reset (${tongue.afterTongue})`);
if (!(tongue.duringTint > 0.02)) failures.push(`tint did not rise (${tongue.duringTint})`);
if (!(tongue.afterTint < 0.05)) failures.push(`tint did not reset (${tongue.afterTint})`);
if (!(spins.once > 300)) failures.push(`first spin yaw ${spins.once}`);
if (!(spins.twice > spins.once + 300)) failures.push(`second spin did not unwrap ${spins.once} -> ${spins.twice}`);
if (!(face.frontZ > 0.9 && face.webZ < -0.9 && face.mobileZ < -0.9)) failures.push(`back-face z ${JSON.stringify(face)}`);
if (!(lag.eyes === 180 && lag.core < lag.eyes && lag.shell < lag.core && lag.mass <= lag.crown)) {
  failures.push(`follow-through ${JSON.stringify(lag)}`);
}
if (!interaction.grabbedEvents.includes("GRAB_START")) failures.push("grab event not recorded");
if (interaction.afterStory === "NONE" && !interaction.afterEvents.includes("RELEASE")) {
  failures.push("release not recovered into mind events");
}

const host = fs.readFileSync(path.resolve(__dirname, "../src/components/character/cloudCanvasRuntime.ts"), "utf8");
if (host.includes("MotionPreviewPlayer") || host.includes("motionPreview")) failures.push("host still references motion preview sequencer");
if (!host.includes("playStory") && !host.includes("DEMO_60S_ADORABILITY")) failures.push("host does not call showcase playStory");

const result = {
  ...report,
  SHOWCASE_DURATION_MS: mobileShow.durationMs,
  SHOWCASE_SAMPLES: mobileShow.samples,
  SHOWCASE_SAMPLE_DIFFS: sampleDiffs.length,
  NATURAL_WEB_STORIES: webNatural,
  NATURAL_MOBILE_STORIES: mobileNatural,
  NATURAL_MATCH: JSON.stringify(webNatural) === JSON.stringify(mobileNatural),
  TONGUE: tongue,
  SPIN: spins,
  BACK_FACE: face,
  FOLLOW_THROUGH: lag,
  INTERACTION: interaction,
  failures,
};
fs.writeFileSync(path.resolve(__dirname, "../docs/agent-status/cherri-parity-report.json"), JSON.stringify(result, null, 2));
console.log(JSON.stringify({
  WEB_STORY_COUNT: result.WEB_STORY_COUNT,
  MOBILE_STORY_COUNT: result.MOBILE_STORY_COUNT,
  MISSING_ON_MOBILE: result.MISSING_ON_MOBILE,
  EXTRA_ON_MOBILE: result.EXTRA_ON_MOBILE,
  WEB_PRIMITIVE_COUNT: result.WEB_PRIMITIVE_COUNT,
  MOBILE_PRIMITIVE_COUNT: result.MOBILE_PRIMITIVE_COUNT,
  PRIMITIVE_PARAM_DIFFS: result.PRIMITIVE_PARAM_DIFFS,
  WEB_MOUTH_COUNT: result.WEB_MOUTH_COUNT,
  MOBILE_MOUTH_COUNT: result.MOBILE_MOUTH_COUNT,
  WEB_SIGNATURE_COUNT: result.WEB_SIGNATURE_COUNT,
  MOBILE_SIGNATURE_COUNT: result.MOBILE_SIGNATURE_COUNT,
  ACTING_CYCLES: result.ACTING_CYCLES,
  INTENSITIES: result.INTENSITIES,
  MOODS: result.MOODS,
  SHOWCASE_DURATION_MS: result.SHOWCASE_DURATION_MS,
  SHOWCASE_SAMPLE_DIFFS: result.SHOWCASE_SAMPLE_DIFFS,
  NATURAL_MATCH: result.NATURAL_MATCH,
  NATURAL_STORY_COUNT: result.NATURAL_MOBILE_STORIES.length,
  TONGUE: result.TONGUE,
  SPIN: result.SPIN,
  BACK_FACE: result.BACK_FACE,
  FOLLOW_THROUGH: result.FOLLOW_THROUGH,
  INTERACTION: result.INTERACTION,
  failures: result.failures,
}, null, 2));
if (failures.length) {
  console.error("PARITY FAIL", failures.join(" | "));
  process.exit(1);
}
console.log("PARITY PASS");
