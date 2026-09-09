/**
 * End-to-end Cherri frame-stage parity at LCDPROTO 7d26f8b.
 *
 * This executes both the read-only web checkout and the vendored mobile
 * runtime through the same platform-neutral frame constructor. It verifies
 * controller -> jelly target -> physics -> rig -> cloud -> lobe inputs for
 * authored performance, touch, showcase, and autonomous paths.
 */
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const ts = require("typescript");
const Core = require("../src/components/character/cherriFrameCore.js");

const MOBILE = path.resolve(__dirname, "../vendor/lcdproto");
const WEB = process.env.LCDPROTO_ROOT || path.resolve(__dirname, "../../LCDPROTO");
const REPORT = path.resolve(__dirname, "../docs/agent-status/cherri-stage-parity-report.json");
const FRAME_MS = 1000 / 60;
const SIZE = 466;
const CHARACTER_SCALE = 0.68;
const ZERO_AMBIENT = { x: 0, y: 0, breath: 0, squashX: 0, squashY: 0, rotation: 0 };
const CFG = { gazePx: 8, squash: 0.032, paceScale: 1, blinkIntervalMs: 3400 };

function loadTree(root) {
  const cache = {};
  function resolve(fromFile, spec) {
    let target = spec;
    if (spec.startsWith("@/")) target = spec.slice(2);
    else if (spec.startsWith(".")) target = path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), spec));
    else return null;
    const candidates = [target, `${target}.ts`, `${target}.tsx`, `${target}/index.ts`, `${target}/index.tsx`];
    for (const candidate of candidates) {
      const absolute = path.join(root, candidate);
      if (fs.existsSync(absolute) && fs.statSync(absolute).isFile()) return candidate;
    }
    throw new Error(`unresolved ${spec} from ${fromFile}`);
  }
  function load(id) {
    const key = id.endsWith(".ts") || id.endsWith(".tsx") ? id : `${id}.ts`;
    if (cache[key]) return cache[key].exports;
    const filename = path.join(root, key);
    const js = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React },
      fileName: filename,
    }).outputText;
    const module = { exports: {} };
    cache[key] = module;
    const localRequire = (spec) => {
      if (spec === "react") return {};
      const resolved = resolve(key, spec);
      if (!resolved) throw new Error(`external ${spec}`);
      return load(resolved);
    };
    vm.runInNewContext(js, { require: localRequire, module, exports: module.exports, console }, { filename });
    return module.exports;
  }
  return load;
}

function createLCD(root) {
  const load = loadTree(root);
  return Object.assign(
    {},
    load("components/experimental/cloud-blob/cloudLobeSystem.ts"),
    load("lib/behaviours/controller.ts"),
    load("lib/blobCalibration.ts"),
    load("lib/blobDrag.ts"),
    load("lib/blobIdle.ts"),
    load("lib/blobPhysics.ts"),
    load("lib/blobRig.ts"),
    load("lib/mind/cloudFacing.ts"),
    load("lib/mind/eventSense.ts"),
  );
}

function rounded(value) {
  if (typeof value === "number") return Number.isFinite(value) ? Number(value.toFixed(6)) : String(value);
  if (Array.isArray(value)) return value.map(rounded);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && typeof item !== "function").map(([key, item]) => [key, rounded(item)]));
}

function compactStage(frame) {
  return rounded({
    controller: frame.controller,
    jellyTarget: frame.jellyTarget,
    physics: frame.physics,
    rig: frame.rig,
    cloud: frame.cloud,
    lobes: frame.lobes,
  });
}

class Harness {
  constructor(LCD) {
    this.LCD = LCD;
    this.controller = new LCD.BehaviourController();
    this.controller.setMindSeed(0xc4e881);
    this.ambient = new LCD.AmbientDrift();
    this.physics = new LCD.BlobJellyPhysics();
    this.drag = new LCD.BlobDragController();
    this.sensor = new LCD.InteractionSensor();
    this.facing = { ...LCD.NEUTRAL_CLOUD_FACING };
    this.lobes = LCD.createLobeStates();
    this.contact = { grabbed: false, x: 0, y: 0 };
    this.events = [];
    this.clock = 0;
    this.idleTime = 0;
    this.cloudIdleWeight = 1;
    this.previous = { x: 0, y: 0 };
    this.previousVelocity = { x: 0, y: 0 };
    this.firstFrame = true;
    this.lastFrame = null;
  }

  begin(x = SIZE / 2 - 58, y = SIZE / 2 + 6) {
    this.contact = { grabbed: true, x: x - SIZE / 2, y: y - SIZE / 2 };
    this.drag.begin(x, y, this.clock, x - SIZE / 2, y - SIZE / 2);
    this.sensor.contact(true, this.contact.x, this.contact.y, (event) => {
      this.events.push(event.id);
      this.controller.notify(event);
    });
  }

  move(x, y) {
    this.contact.x = x - SIZE / 2;
    this.contact.y = y - SIZE / 2;
    this.drag.move(x, y, this.clock);
  }

  end(x, y) {
    this.contact = { grabbed: false, x: x - SIZE / 2, y: y - SIZE / 2 };
    this.sensor.contact(false, this.contact.x, this.contact.y, (event) => {
      this.events.push(event.id);
      this.controller.notify(event);
    });
    this.drag.end();
  }

  step(dtMs = FRAME_MS, auto = false) {
    this.clock += dtMs;
    const step = dtMs / 1000;
    this.idleTime += step;
    this.controller.update(dtMs, CFG, auto);
    const controller = this.controller.pose();
    const ambient = this.ambient.update(dtMs, this.LCD.DEFAULT_IDLE, controller.blobY || 0);
    this.cloudIdleWeight += ((this.drag.isGrabbed ? 0.25 : 1) - this.cloudIdleWeight) * (1 - Math.exp(-Math.min(dtMs, 50) / 180));
    const base = Core.buildJellyTarget(controller, ambient, {
      driftWeight: this.cloudIdleWeight,
      driverYaw: 0,
      driverPitch: 0,
      jellyAmount: this.LCD.DEFAULT_IDLE.jellyAmount,
      rippleAmount: this.LCD.DEFAULT_IDLE.rippleAmount,
    });
    const radius = Core.effectiveDragRadius(controller, ambient, CHARACTER_SCALE, 1);
    const dragPose = this.drag.step(dtMs, SIZE, radius, base.target.x, base.target.y, true);
    this.sensor.update(dtMs, { ...this.contact, wallPressure: dragPose.wallPressure }, (event) => {
      this.events.push(event.id);
      this.controller.notify(event);
    });
    Core.applyDragToJellyTarget(base, controller, dragPose);
    const physics = this.physics.update(dtMs, base.target, true);
    const rig = Core.buildRig(this.LCD, physics, controller, ambient, dragPose, {
      characterScale: CHARACTER_SCALE,
      calibration: this.LCD.DEFAULT_FACE_CALIBRATION,
    });
    const velocity = Core.frameVelocity(rig, this.previous, step, this.firstFrame);
    const acceleration = Math.hypot(
      (velocity.vx - this.previousVelocity.x) / Math.max(step, 1e-3),
      (velocity.vy - this.previousVelocity.y) / Math.max(step, 1e-3),
    );
    this.previous = { x: velocity.x, y: velocity.y };
    this.previousVelocity = { x: velocity.vx, y: velocity.vy };
    this.firstFrame = false;
    this.LCD.applyCloudFacing(
      this.facing,
      { yaw: rig.blob.yaw || 0, pitch: rig.blob.pitch || 0 },
      {
        yaw: rig.blob.performanceYaw || 0,
        pitch: rig.blob.performancePitch || 0,
        roll: rig.blob.performanceRoll || 0,
      },
      step,
    );
    const motion = { ...this.LCD.DEFAULT_MOTION_CONFIG };
    if (this.drag.isGrabbed) motion.lobeLag *= 1.18;
    else if ((dragPose.flickStretch || 0) > 0.02) motion.lobeLag *= 1.12;
    const cloud = Core.buildCloudParams(this.LCD, rig, physics, dragPose, {
      cloudParams: {},
      facing: this.facing,
      motion,
      idleTime: this.idleTime,
      acceleration,
    });
    this.LCD.stepLobePhysics(this.lobes, cloud, motion, velocity.vx / Math.max(0.01, cloud.scale || 1), velocity.vy / Math.max(0.01, cloud.scale || 1), this.idleTime, step);
    const frame = {
      controller,
      jellyTarget: base.target,
      physics,
      rig,
      cloud,
      lobes: this.lobes,
      dragPose,
      velocity,
      events: [...this.events],
    };
    this.lastFrame = frame;
    return frame;
  }
}

function maxAbs(value, next) {
  return Math.max(value, Math.abs(next || 0));
}

function createMetrics() {
  return {
    minBlobScale: Infinity,
    maxBlobScale: -Infinity,
    minBodyScaleX: Infinity,
    maxBodyScaleX: -Infinity,
    minBodyScaleY: Infinity,
    maxBodyScaleY: -Infinity,
    minCloudScale: Infinity,
    maxCloudScale: -Infinity,
    minActingScaleX: Infinity,
    maxActingScaleX: -Infinity,
    minActingScaleY: Infinity,
    maxActingScaleY: -Infinity,
    maxActingPuff: 0,
    maxPuff: 0,
    maxTongue: 0,
    maxMouthO: 0,
    maxMouthD: 0,
    maxMouthCrescent: 0,
    maxRootX: 0,
    maxRootY: 0,
    maxPerformanceYaw: 0,
    maxPerformancePitch: 0,
    maxPerformanceRoll: 0,
    maxLobeDeformation: 0,
  };
}

function sampleMetrics(metrics, frame) {
  const d = frame.controller;
  const p = frame.cloud;
  metrics.minBlobScale = Math.min(metrics.minBlobScale, d.blobScale);
  metrics.maxBlobScale = Math.max(metrics.maxBlobScale, d.blobScale);
  metrics.minBodyScaleX = Math.min(metrics.minBodyScaleX, d.bodyScaleX);
  metrics.maxBodyScaleX = Math.max(metrics.maxBodyScaleX, d.bodyScaleX);
  metrics.minBodyScaleY = Math.min(metrics.minBodyScaleY, d.bodyScaleY);
  metrics.maxBodyScaleY = Math.max(metrics.maxBodyScaleY, d.bodyScaleY);
  metrics.minCloudScale = Math.min(metrics.minCloudScale, p.scale);
  metrics.maxCloudScale = Math.max(metrics.maxCloudScale, p.scale);
  metrics.minActingScaleX = Math.min(metrics.minActingScaleX, p.actingScaleX);
  metrics.maxActingScaleX = Math.max(metrics.maxActingScaleX, p.actingScaleX);
  metrics.minActingScaleY = Math.min(metrics.minActingScaleY, p.actingScaleY);
  metrics.maxActingScaleY = Math.max(metrics.maxActingScaleY, p.actingScaleY);
  metrics.maxActingPuff = Math.max(metrics.maxActingPuff, p.actingPuff || 0);
  metrics.maxPuff = Math.max(metrics.maxPuff, p.puff || 0);
  metrics.maxTongue = Math.max(metrics.maxTongue, frame.rig.mouth.mouthTongue || 0);
  metrics.maxMouthO = Math.max(metrics.maxMouthO, frame.rig.mouth.mouthO || 0);
  metrics.maxMouthD = Math.max(metrics.maxMouthD, frame.rig.mouth.mouthD || 0);
  metrics.maxMouthCrescent = Math.max(metrics.maxMouthCrescent, frame.rig.mouth.mouthCrescent || 0);
  metrics.maxRootX = maxAbs(metrics.maxRootX, p.x);
  metrics.maxRootY = maxAbs(metrics.maxRootY, p.y);
  metrics.maxPerformanceYaw = maxAbs(metrics.maxPerformanceYaw, p.performanceYaw);
  metrics.maxPerformancePitch = maxAbs(metrics.maxPerformancePitch, p.performancePitch);
  metrics.maxPerformanceRoll = maxAbs(metrics.maxPerformanceRoll, p.performanceRoll);
  metrics.maxLobeDeformation = Math.max(metrics.maxLobeDeformation, ...Object.values(frame.lobes).map((lobe) => Math.max(Math.abs(lobe.scaleX - 1), Math.abs(lobe.scaleY - 1))));
}

function runTouchSuite(LCD) {
  const result = {};

  let h = new Harness(LCD);
  for (let i = 0; i < 30; i += 1) h.step();
  result.neutral = { stage: compactStage(h.lastFrame), events: h.events };

  h = new Harness(LCD);
  h.begin();
  let maxGrabPressure = 0;
  let maxBodyDeformation = 0;
  for (let i = 0; i < 11; i += 1) {
    const frame = h.step();
    maxGrabPressure = Math.max(maxGrabPressure, frame.dragPose.grabPressure);
    maxBodyDeformation = Math.max(maxBodyDeformation, Math.abs(frame.rig.body.scaleX - 1), Math.abs(frame.rig.body.scaleY - 1));
  }
  h.end(SIZE / 2 - 58, SIZE / 2 + 6);
  for (let i = 0; i < 24; i += 1) h.step();
  result.tap = { maxGrabPressure, maxBodyDeformation, events: h.events, stage: compactStage(h.lastFrame) };

  h = new Harness(LCD);
  h.begin();
  maxGrabPressure = 0;
  for (let i = 0; i < 105; i += 1) {
    const frame = h.step();
    maxGrabPressure = Math.max(maxGrabPressure, frame.dragPose.grabPressure);
  }
  h.end(SIZE / 2 - 58, SIZE / 2 + 6);
  result.hold = { maxGrabPressure, events: h.events, stage: compactStage(h.lastFrame) };

  h = new Harness(LCD);
  h.begin();
  for (let i = 0; i < 8; i += 1) h.step();
  h.move(SIZE / 2 + 20, SIZE / 2 - 18);
  for (let i = 0; i < 12; i += 1) h.step();
  h.move(SIZE / 2 + 96, SIZE / 2 + 24);
  let maxGripPull = 0;
  for (let i = 0; i < 32; i += 1) {
    const frame = h.step();
    maxGripPull = Math.max(maxGripPull, Math.hypot(frame.dragPose.gripPullX, frame.dragPose.gripPullY));
  }
  h.end(SIZE / 2 + 96, SIZE / 2 + 24);
  result.drag = { maxGripPull, events: h.events, stage: compactStage(h.lastFrame) };

  h = new Harness(LCD);
  h.begin();
  h.step(32);
  h.move(SIZE / 2 + 28, SIZE / 2 - 14);
  h.step(36);
  h.move(SIZE / 2 + 142, SIZE / 2 - 48);
  h.step(14);
  h.end(SIZE / 2 + 142, SIZE / 2 - 48);
  let maxFlickStretch = 0;
  for (let i = 0; i < 40; i += 1) maxFlickStretch = Math.max(maxFlickStretch, h.step().dragPose.flickStretch);
  result.flick = { maxFlickStretch, events: h.events, stage: compactStage(h.lastFrame) };

  h = new Harness(LCD);
  h.begin();
  for (let i = 0; i < 8; i += 1) h.step();
  h.move(SIZE - 8, SIZE / 2 + 18);
  let maxWallPressure = 0;
  let maxCornerBlend = 0;
  for (let i = 0; i < 75; i += 1) {
    const frame = h.step();
    maxWallPressure = Math.max(maxWallPressure, frame.dragPose.wallPressure);
    maxCornerBlend = Math.max(maxCornerBlend, frame.dragPose.cornerBlend);
  }
  result.wall = { maxWallPressure, maxCornerBlend, events: h.events, stage: compactStage(h.lastFrame) };
  return rounded(result);
}

const STORY_IDS = [
  "SIG_CAUGHT_YOU_LOOKING", "SIG_BLEP_INNOCENT", "SIG_FAILED_WINK", "SIG_GIANT_PROUD_PUFF",
  "SIG_FAKE_SNEEZE", "SIG_SNEEZE_THAT_DOESNT_HAPPEN", "SIG_HAPPY_SILENT_LAUGH", "SIG_RASPBERRY",
  "SIG_PANCAKE", "SIG_DANCE_CAUGHT", "SIG_SMUG_SIDE_EYE", "SIG_TALL_STRETCH", "SIG_PEA_SHRINK",
  "SIG_TONGUE_PEEK", "HAPPY_TINY_HOP", "SLEEPY_LONG_BLINK", "MICRO_MOUTH_TWITCH", "RARE_HICCUP",
  "POKE_3_AMUSED",
];
const ACROBAT_IDS = ["SPIN_360", "BACKFLIP", "FRONTFLIP", "CARTWHEEL_LEFT", "CARTWHEEL_RIGHT"];

function runPerformance(LCD, id, acrobat = false) {
  const h = new Harness(LCD);
  const ok = acrobat ? h.controller.trigger(id, CFG) !== false : h.controller.playStory(id);
  assert.strictEqual(ok, true, `${id} must be executable`);
  const duration = acrobat ? 4200 : ((LCD.ALL_STORIES || []).find((story) => story.id === id)?.durationMs || 5000) + 800;
  const metrics = createMetrics();
  let peak = null;
  let peakScore = -Infinity;
  for (let elapsed = 0; elapsed <= duration; elapsed += FRAME_MS) {
    const frame = h.step(FRAME_MS, false);
    sampleMetrics(metrics, frame);
    const score =
      Math.abs(frame.cloud.actingScaleX - 1) + Math.abs(frame.cloud.actingScaleY - 1) +
      Math.abs(frame.cloud.scale - CHARACTER_SCALE) + (frame.rig.mouth.mouthTongue || 0) +
      Math.abs(frame.cloud.performanceYaw || 0) / 360 + Math.abs(frame.cloud.performancePitch || 0) / 360 +
      Math.abs(frame.cloud.performanceRoll || 0) / 360;
    if (score > peakScore) {
      peakScore = score;
      peak = compactStage(frame);
    }
  }
  return rounded({ metrics, peak });
}

function runPerformanceSuite(LCD) {
  const stories = Object.fromEntries(STORY_IDS.map((id) => [id, runPerformance(LCD, id)]));
  const acrobatics = Object.fromEntries(ACROBAT_IDS.map((id) => [id, runPerformance(LCD, id, true)]));
  return { stories, acrobatics };
}

function runShowcase(LCD) {
  const h = new Harness(LCD);
  h.controller.setActingCycle("SHOWCASE");
  h.controller.setActingIntensity("EXPRESSIVE");
  assert.strictEqual(h.controller.playStory("DEMO_60S_ADORABILITY"), true);
  const marks = new Set([0, 7000, 13000, 20000, 28000, 34000, 42000, 48000, 56000]);
  const samples = {};
  const metrics = createMetrics();
  for (let elapsed = 0; elapsed <= 60000; elapsed += FRAME_MS) {
    const frame = h.step(FRAME_MS, false);
    sampleMetrics(metrics, frame);
    for (const mark of marks) {
      if (samples[mark] === undefined && elapsed >= mark) samples[mark] = compactStage(frame);
    }
  }
  return rounded({ samples, metrics });
}

function runNatural(LCD) {
  const h = new Harness(LCD);
  h.controller.setActingCycle("NATURAL");
  h.controller.setActingIntensity("EXPRESSIVE");
  const stories = [];
  const samples = [];
  const metrics = createMetrics();
  let lastStory = "";
  for (let elapsed = 0; elapsed <= 120000; elapsed += 50) {
    const frame = h.step(50, true);
    sampleMetrics(metrics, frame);
    const id = h.controller.mindTelemetry().storyId;
    if (id && id !== "NONE" && id !== "—" && id !== lastStory) {
      stories.push(id);
      lastStory = id;
    }
    if (elapsed % 1000 === 0) samples.push(compactStage(frame));
  }
  return rounded({ stories, samples, metrics });
}

function assertFormulaFixtures(LCD) {
  const pose = {
    blobScaleX: 0.42, blobScaleY: -0.32, bodyScaleX: 0.46, bodyScaleY: -0.44,
    bodyRotation: 8, eyeX: 3, eyeY: -2, leftEyeX: 1, leftEyeY: 0.5,
    rightEyeX: -1, rightEyeY: -0.5, eyeLid: 1, leftEyeTension: 1, rightEyeTension: 1,
    blobOpacity: 1, pupilScale: 1,
  };
  const ambient = { ...ZERO_AMBIENT, squashX: 0.03, squashY: -0.02 };
  const base = Core.buildJellyTarget(pose, ambient, { driftWeight: 1, jellyAmount: 1, rippleAmount: 1 });
  Core.applyDragToJellyTarget(base, pose, {
    x: 0, y: 0, rotation: 0, scaleX: 0.08, scaleY: -0.07,
    bodyScaleX: 0.3, bodyScaleY: -0.3, wallPressure: 0,
  });
  assert.strictEqual(Number(base.target.scaleX.toFixed(2)), 0.53, "authored jelly X must survive before tactile contribution");
  assert.strictEqual(Number(base.target.scaleY.toFixed(2)), -0.41, "authored jelly Y must survive before tactile contribution");
  assert.strictEqual(Number(base.target.bodyScaleX.toFixed(2)), 0.76, "authored body X must not be clamped with tactile contribution");
  assert.strictEqual(Number(base.target.bodyScaleY.toFixed(2)), -0.74, "authored body Y must not be clamped with tactile contribution");

  const physical = {
    x: 0, y: 0, depth: 0, yaw: 0, pitch: 0, rotation: 0, scaleX: 0, scaleY: 0,
    bodyX: 0, bodyY: 0, bodyRotation: 0, bodyScaleX: 0, bodyScaleY: 0,
    bodySkewX: 0, bodySkewY: 0, bodyOriginX: 0, bodyOriginY: 0.82, bodyDeformAngle: 0,
  };
  const rig = Core.buildRig(LCD, physical, pose, ZERO_AMBIENT, {}, {
    characterScale: CHARACTER_SCALE,
    calibration: LCD.DEFAULT_FACE_CALIBRATION,
  });
  assert.strictEqual(Number((rig.leftEye.x - rig.leftEye.socketX).toFixed(3)), 4, "gaze must move eye texture, not socket twice");
  assert.strictEqual(Number((rig.leftEye.y - rig.leftEye.socketY).toFixed(3)), -1.5, "vertical gaze must not move the socket");

  const velocity = Core.frameVelocity({ blob: { x: 10, y: 12 }, body: { x: 4, y: -2 } }, { x: 10, y: 5 }, 0.02, false);
  assert.deepStrictEqual(velocity, { x: 14, y: 10, vx: 200, vy: 250 }, "velocity must include root and body offsets");
  assert(Math.abs(Core.effectiveDragRadius({ blobScale: 0.2 }, { breath: 0.1 }, 0.68, 1) - 92 * 1.1 * 1.2 * 0.68) < 1e-9);
  assert(Core.touchHitRadius(466, { blob: { scale: 0.68 } }, 1) > 149, "touch hit radius must stay generous and independent of collision radius");

  const cloud = Core.buildCloudParams(LCD, rig, physical, {}, {
    cloudParams: {}, facing: LCD.NEUTRAL_CLOUD_FACING, motion: LCD.DEFAULT_MOTION_CONFIG,
    idleTime: 0, acceleration: 0,
  });
  assert.strictEqual(cloud.squash, 0, "absent cloud squash override must be neutral");
  assert.strictEqual(cloud.stretch, 0, "absent cloud stretch override must be neutral");
  assert.strictEqual(cloud.lean, 0, "absent cloud lean override must be neutral");
  assert.strictEqual(cloud.puff, LCD.DEFAULT_DEFORMATION.puff, "puff keeps the canonical optical default");
}

function assertSourceContracts() {
  const webHome = fs.readFileSync(path.join(WEB, "components/states/HomeState.tsx"), "utf8");
  const webCloud = fs.readFileSync(path.join(WEB, "components/blob/CloudCharacter.tsx"), "utf8");
  const host = fs.readFileSync(path.resolve(__dirname, "../src/components/character/cloudCanvasRuntime.ts"), "utf8");
  const preview = fs.readFileSync(path.resolve(__dirname, "../src/components/character/CloudPreview.tsx"), "utf8");
  const coreSource = fs.readFileSync(path.resolve(__dirname, "../src/components/character/cherriFrameCore.js"), "utf8");
  assert(webHome.includes("clamp(dsx, -0.55, 0.55)"), "web authored jelly X range source contract");
  assert(webHome.includes("clamp(d.bodyScaleX, -0.5, 0.5)"), "web authored body range source contract");
  assert(coreSource.includes("clamp(base.dsx, -0.55, 0.55)"), "mobile authored jelly X range source contract");
  assert(coreSource.includes("clamp(value(d.bodyScaleX), -0.5, 0.5)"), "mobile authored body range source contract");
  assert(webCloud.includes("Math.max(size * 0.32, size * BODY_FRACTION * 1.05 * scale)"));
  assert(host.includes("CherriFrameCore.touchHitRadius"));
  assert(host.includes("drag.begin(p.x, p.y"), "pointer-down must begin physical grab immediately");
  assert(host.includes("canvas.addEventListener(\"lostpointercapture\", onPointerEnd)"));
  assert(host.includes("var currentParams = {}"), "cloud settings must stay an override bucket");
  assert(host.includes("face: faceConfig"));
  assert(host.includes("showContactShadow: false"));
  assert(!host.includes("new LCD.PerformanceRunner"), "no legacy second performance runner");
  for (const key of ["behaviourId", "reactionId", "emotionId", "cloudSettings", "driverYaw", "driverPitch", "showPupils", "characterScale", "reducedMotion", "state", "expressionRecipe", "parityTrace", "physicsDebug"]) {
    assert(preview.includes(key), `CloudPreview dynamic config: ${key}`);
  }
  for (const command of ["setAutoMind", "setMood", "setActingCycle", "setActingIntensity", "playStory", "setOrientation", "setFaceOverride", "triggerPrimitive"]) {
    assert(host.includes(`command.type === \"${command}\"`), `runtime command update: ${command}`);
  }
}

const webLCD = createLCD(WEB);
const mobileLCD = createLCD(MOBILE);
assertFormulaFixtures(mobileLCD);
assertSourceContracts();

const webTouch = runTouchSuite(webLCD);
const mobileTouch = runTouchSuite(mobileLCD);
assert.deepStrictEqual(mobileTouch, webTouch, "touch frame stages must match canonical web modules");
assert(mobileTouch.tap.maxGrabPressure > 0.5 && mobileTouch.tap.maxBodyDeformation > 0.02, "tap must visibly enter physical compression");
assert(mobileTouch.tap.events.includes("TOUCH_TAP"), "sub-frame tap must reach Mind");
assert(mobileTouch.hold.maxGrabPressure > 0.7 && mobileTouch.hold.events.includes("GRAB_HOLD"), "hold must build pressure and reach Mind");
assert(mobileTouch.drag.maxGripPull > 0.5, "drag must produce local grip pull");
assert(mobileTouch.flick.maxFlickStretch > 0.005 && mobileTouch.flick.events.includes("FLICK"), "flick must carry inertia and reach Mind");
assert(mobileTouch.wall.maxWallPressure > 0.25 && mobileTouch.wall.events.includes("WALL_IMPACT"), "wall must produce local pressure and event");

const webPerformance = runPerformanceSuite(webLCD);
const mobilePerformance = runPerformanceSuite(mobileLCD);
assert.deepStrictEqual(mobilePerformance, webPerformance, "performance frame stages must match canonical web modules");
const stories = mobilePerformance.stories;
assert(stories.SIG_PANCAKE.metrics.maxActingScaleX > 1.18 && stories.SIG_PANCAKE.metrics.minActingScaleY < 0.85, "pancake silhouette must be wide and flat");
assert(stories.SIG_GIANT_PROUD_PUFF.metrics.maxActingPuff > 0.2 && stories.SIG_GIANT_PROUD_PUFF.metrics.maxCloudScale > 0.8, "proud puff must expand visibly");
assert(stories.SIG_TALL_STRETCH.metrics.maxActingScaleY > 1.15, "tall stretch must be visibly tall");
assert(stories.SIG_PEA_SHRINK.metrics.minCloudScale <= 0.52, "pea shrink must reach the small render clamp");
assert(stories.HAPPY_TINY_HOP.metrics.maxRootY > 8, "hop must visibly leave its neutral position");
assert(stories.SIG_BLEP_INNOCENT.metrics.maxTongue > 0.4, "blep tongue must be visible");
assert(stories.SIG_RASPBERRY.metrics.maxTongue > 0.4, "raspberry tongue must be visible");
assert(mobilePerformance.acrobatics.SPIN_360.metrics.maxPerformanceYaw > 300, "spin must complete a visible revolution");
assert(mobilePerformance.acrobatics.BACKFLIP.metrics.maxPerformancePitch > 260, "backflip must complete in pitch");
assert(mobilePerformance.acrobatics.FRONTFLIP.metrics.maxPerformancePitch > 260, "frontflip must complete in pitch");
assert(mobilePerformance.acrobatics.CARTWHEEL_LEFT.metrics.maxPerformanceRoll > 260, "left cartwheel must complete in roll");
assert(mobilePerformance.acrobatics.CARTWHEEL_RIGHT.metrics.maxPerformanceRoll > 260, "right cartwheel must complete in roll");

const webShowcase = runShowcase(webLCD);
const mobileShowcase = runShowcase(mobileLCD);
assert.deepStrictEqual(mobileShowcase, webShowcase, "60-second final frame inputs must match at all nine marks");

const webNatural = runNatural(webLCD);
const mobileNatural = runNatural(mobileLCD);
assert.deepStrictEqual(mobileNatural, webNatural, "120-second Natural/Expressive stages must match");
assert(mobileNatural.stories.length >= 5, "Natural/Expressive must show autonomous life over 120 seconds");

function touchSummary(touch) {
  return Object.fromEntries(Object.entries(touch).map(([id, value]) => [id, Object.fromEntries(Object.entries(value).filter(([key]) => key !== "stage"))]));
}

function performanceSummary(performance) {
  return {
    stories: Object.fromEntries(Object.entries(performance.stories).map(([id, value]) => [id, value.metrics])),
    acrobatics: Object.fromEntries(Object.entries(performance.acrobatics).map(([id, value]) => [id, value.metrics])),
  };
}

function showcaseSample(frame) {
  return {
    controller: {
      blobScale: frame.controller.blobScale,
      bodyScaleX: frame.controller.bodyScaleX,
      bodyScaleY: frame.controller.bodyScaleY,
      mouthTongue: frame.controller.mouthTongue,
      performanceYaw: frame.controller.blobPerformanceYaw,
      performancePitch: frame.controller.blobPerformancePitch,
      performanceRoll: frame.controller.blobPerformanceRoll,
    },
    cloud: {
      scale: frame.cloud.scale,
      scaleX: frame.cloud.scaleX,
      scaleY: frame.cloud.scaleY,
      actingScaleX: frame.cloud.actingScaleX,
      actingScaleY: frame.cloud.actingScaleY,
      actingPuff: frame.cloud.actingPuff,
      puff: frame.cloud.puff,
      squash: frame.cloud.squash,
      stretch: frame.cloud.stretch,
      facingYaw: frame.cloud.facingYaw,
      coreFacingYaw: frame.cloud.coreFacingYaw,
      shellFacingYaw: frame.cloud.shellFacingYaw,
      crownFacingYaw: frame.cloud.crownFacingYaw,
      massFacingYaw: frame.cloud.massFacingYaw,
    },
    lobeDeformationMagnitude: Math.max(...Object.values(frame.lobes).map((lobe) => Math.max(Math.abs(lobe.scaleX - 1), Math.abs(lobe.scaleY - 1)))),
  };
}

const result = rounded({
  canonicalSha: "7d26f8ba6b8709d38b071115a025ba0dfeaefbee",
  formulaFixtures: "PASS",
  sourceContracts: "PASS",
  touch: touchSummary(mobileTouch),
  performances: performanceSummary(mobilePerformance),
  showcase: {
    samples: Object.fromEntries(Object.entries(mobileShowcase.samples).map(([mark, frame]) => [mark, showcaseSample(frame)])),
    metrics: mobileShowcase.metrics,
  },
  naturalExpressive120s: {
    stories: mobileNatural.stories,
    metrics: mobileNatural.metrics,
    sampledStageCount: mobileNatural.samples.length,
  },
  comparisons: {
    touchStages: "MATCH",
    performanceStages: "MATCH",
    showcaseNineMarks: "MATCH",
    naturalExpressive120s: "MATCH",
  },
});
fs.mkdirSync(path.dirname(REPORT), { recursive: true });
fs.writeFileSync(REPORT, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({
  formulaFixtures: result.formulaFixtures,
  touch: result.touch,
  storyCount: Object.keys(result.performances.stories).length,
  acrobatCount: Object.keys(result.performances.acrobatics).length,
  showcaseMarks: Object.keys(result.showcase.samples).length,
  naturalStories: result.naturalExpressive120s.stories,
  comparisons: result.comparisons,
}, null, 2));
