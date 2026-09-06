import { canonicalScene } from "./canonicalScene.generated";
import { canonicalRuntime } from "./canonicalRuntime.generated";
import { CloudColourConfig } from "../../domain/character/types";
import type { ExpressionRecipe } from "../../domain/devlab/types";

export interface CloudRuntimeConfig {
  palette: CloudColourConfig;
  screenColour?: string;
  displayMode?: "dark" | "warm" | "brown";
  active?: boolean;
  reducedMotion?: boolean;
  reactionId?: string;
  reactionToken?: number;
  behaviourId?: string;
  state?: string;
  emotionId?: string;
  driverYaw?: number;
  driverPitch?: number;
  showPupils?: boolean;
  size?: number;
  interactive?: boolean;
  cloudSettings?: any;
  debugTelemetry?: boolean;
  lcdprotoSourceSha?: string;
  expressionRecipe?: ExpressionRecipe | null;
  presentation?: "hardware" | "integrated";
}

export function buildCloudHtml(initialConfig: CloudRuntimeConfig): string {
  const initialJson = JSON.stringify(initialConfig);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-touch-callout: none; -webkit-user-select: none; user-select: none; touch-action: none; }
    html, body { width: 100%; height: 100%; background: transparent; overflow: hidden; display: flex; align-items: center; justify-content: center; touch-action: none; }
    canvas { display: block; background: transparent; touch-action: none; cursor: grab; }
    canvas:active { cursor: grabbing; }
  </style>
</head>
<body>
  <canvas id="cloudCanvas"></canvas>
  <script>
  (function() {
    ${canonicalRuntime}
    ${canonicalScene}
    var initialConfig = ${initialJson};

    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function normalizedTurn(v, maxDeg) {
      var n = Number(v || 0);
      return Math.abs(n) <= 1.001 ? n * maxDeg : clamp(n, -maxDeg, maxDeg);
    }

    function createWispPool(count) {
      var pool = [];
      for (var i = 0; i < count; i++) {
        pool.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, radius: 24, targetRadius: 48, opacity: 0, initialOpacity: 0.5, age: 0, maxLife: 1.0, color: "#eaf3ff", angle: 0, shape: 0, curl: 0 });
      }
      return pool;
    }

    function clearWisps() {
      for (var i = 0; i < wisps.length; i++) {
        wisps[i].active = false;
        wisps[i].opacity = 0;
      }
      emission = 0;
    }

    function spawnWisp(pool, x, y, vx, vy, radius, color, lifetime, initialOpacity, seq) {
      for (var i = 0; i < pool.length; i++) {
        var w = pool[i];
        if (!w.active) {
          w.active = true; w.x = x; w.y = y; w.vx = vx; w.vy = vy;
          w.radius = radius;
          w.targetRadius = radius * (1.6 + (seq % 3) * 0.25);
          w.age = 0;
          w.maxLife = Math.max(0.4, Math.min(1.4, lifetime));
          w.initialOpacity = Math.max(0, Math.min(0.75, initialOpacity));
          w.opacity = 0;
          w.color = color;
          w.angle = Math.atan2(vy, vx) + ((seq % 5) - 2) * 0.18;
          w.shape = seq % 3;
          w.curl = ((seq % 7) - 3) * 0.35;
          return true;
        }
      }
      return false;
    }

    function updateWisps(pool, dt, drift, fadeSpeed) {
      var active = 0;
      for (var i = 0; i < pool.length; i++) {
        var w = pool[i];
        if (!w.active) continue;
        w.age += dt * Math.max(0.1, fadeSpeed);
        if (w.age >= w.maxLife) { w.active = false; w.opacity = 0; continue; }
        var p = w.age / w.maxLife;
        var h = Math.max(0, dt);
        var decay = Math.exp(-2.6 * h);
        w.vx *= decay;
        w.vy = w.vy * decay - 10 * drift * h;
        w.x += (w.vx + Math.sin(p * Math.PI * 1.5) * w.curl * 7) * h;
        w.y += w.vy * h;
        w.angle += w.curl * h * 0.35;
        w.radius += (w.targetRadius - w.radius) * (1 - Math.exp(-2.8 * h));
        var fadeIn = Math.min(1, p / 0.15);
        var fadeOut = Math.pow(1 - p, 1.45);
        w.opacity = w.initialOpacity * fadeIn * fadeOut;
        active++;
      }
      return active;
    }

    var canvas = document.getElementById("cloudCanvas");
    var ctx = canvas.getContext("2d");
    var size = 466;
    canvas.width = size;
    canvas.height = size;
    canvas.style.width = "100%";
    canvas.style.height = "100%";

    var controller = new LCD.BehaviourController();
    var ambient = new LCD.AmbientDrift();
    var physics = new LCD.BlobJellyPhysics();
    var drag = new LCD.BlobDragController();
    var performanceRunner = new LCD.PerformanceRunner();
    var lobeStates = LCD.createLobeStates();
    var wisps = createWispPool(24);

    var currentPalette = Object.assign({ body: "#edf4ff", edge: "#ffffff", coreTint: "#627d98", innerGlow: "#ffffff", density: 1, translucency: 0.85, glowIntensity: 0.8 }, initialConfig.palette || {});
    var currentParams = Object.assign({}, LCD.DEFAULT_DEFORMATION);
    var motionConfig = Object.assign({}, LCD.DEFAULT_MOTION_CONFIG);
    var trailConfig = { enabled: true, trailStrength: 0.6, lifetime: 0.9, spawnRate: 1, fadeSpeed: 1, driftAmount: 1 };
    var faceConfig = { offsetX: 0, offsetY: 0, scale: 1 };

    function applyCloudSettings(settings) {
      if (!settings) return;
      if (settings.params) Object.assign(currentParams, settings.params);
      if (settings.motion) Object.assign(motionConfig, settings.motion);
      if (settings.trails) Object.assign(trailConfig, settings.trails);
      if (settings.face) Object.assign(faceConfig, settings.face);
      if (settings.colour) {
        var col = settings.colour;
        if (col.glowIntensity !== undefined) currentPalette.glowIntensity = col.glowIntensity;
        if (col.density !== undefined) currentPalette.density = col.density;
        if (col.translucency !== undefined) currentPalette.translucency = col.translucency;
      }
    }
    applyCloudSettings(initialConfig.cloudSettings);
    if (initialConfig.presentation === "integrated") {
      document.body.style.background = "transparent";
    } else {
      document.body.style.background = initialConfig.screenColour || "#000000";
    }

    var idleTime = 0;
    var lastFrame = null;
    var prevX = 0, prevY = 0, prevVx = 0, prevVy = 0;
    var turnYaw = 0, turnPitch = 0, turnVelYaw = 0, turnVelPitch = 0;
    var hitRadius = 170;
    var emission = 0;
    var sequence = 0;
    var lastIdleWisp = 0;
    var frame = null;
    var latestRig = null;
    var manualRecipe = initialConfig.expressionRecipe || null;
    var lastTriggerId = initialConfig.behaviourId || initialConfig.reactionId || null;
    var lastPerformanceExpression = null;
    var lastTelemetryAt = 0;

    var behaviourConfig = {
      gazePx: LCD.DEFAULT_IDLE.gazeDriftPx,
      squash: LCD.DEFAULT_IDLE.squashAmount,
      paceScale: LCD.DEFAULT_IDLE.activityPace,
      blinkIntervalMs: LCD.DEFAULT_IDLE.blinkInterval * 1000,
    };

    var aliases = {
      idle: 'REST', NEUTRAL: 'REST', happy: 'HAPPY_BOUNCE', excited: 'EXCITED_WIGGLE',
      curious: 'CURIOUS_TILT_LEFT', sleepy: 'SLEEPY_YAWN', surprised: 'SURPRISE_POP',
      angry: 'ANGRY_FLARE', sad: 'SAD_DOWNCAST'
    };

    function triggerBehaviour(id) {
      if (!id) return;
      lastTriggerId = id;
      var resolved = aliases[id] || id;
      try { controller.trigger(resolved, behaviourConfig); }
      catch (e) { try { controller.trigger(id, behaviourConfig); } catch (err) {} }
    }

    function triggerPerformance(id) {
      if (!id || !LCD.CORE_PERFORMANCE_MAP) return;
      var clip = LCD.CORE_PERFORMANCE_MAP[id];
      if (!clip) return;
      performanceRunner.loadClip(clip, true);
      lastPerformanceExpression = null;
    }

    function resetRuntime(full) {
      controller = new LCD.BehaviourController();
      ambient = new LCD.AmbientDrift();
      physics = new LCD.BlobJellyPhysics();
      drag = new LCD.BlobDragController();
      performanceRunner = new LCD.PerformanceRunner();
      lobeStates = LCD.createLobeStates();
      clearWisps();
      idleTime = 0;
      lastFrame = null;
      prevX = 0;
      prevY = 0;
      prevVx = 0;
      prevVy = 0;
      turnYaw = 0;
      turnPitch = 0;
      turnVelYaw = 0;
      turnVelPitch = 0;
      hitRadius = 170;
      lastIdleWisp = 0;
      pointerId = null;
      isDragging = false;
      latestRig = null;
      lastPerformanceExpression = null;
      if (full) {
        manualRecipe = null;
        lastTriggerId = null;
      }
    }

    function applyFacePlacement(rig) {
      var x = faceConfig.offsetX || 0;
      var y = faceConfig.offsetY || 0;
      var s = faceConfig.scale || 1;
      var eyes = [rig.leftEye, rig.rightEye];
      for (var i = 0; i < eyes.length; i++) {
        eyes[i].x += x;
        eyes[i].y += y;
        eyes[i].socketX += x;
        eyes[i].socketY += y;
        eyes[i].scaleX *= s;
        eyes[i].scaleY *= s;
        eyes[i].eyeSocketScaleX *= s;
        eyes[i].eyeSocketScaleY *= s;
      }
      rig.mouth.x += x;
      rig.mouth.y += y;
      rig.mouth.scaleX *= s;
      rig.mouth.scaleY *= s;
    }

    function applyExpressionRecipe(rig, recipe) {
      if (!recipe) return;
      var cal = LCD.DEFAULT_FACE_CALIBRATION;
      function eye(target, source, c) {
        target.x = source.socketX + c.x;
        target.y = source.socketY + c.y;
        target.socketX = source.socketX + c.x;
        target.socketY = source.socketY + c.y;
        target.scaleX = source.width * c.scale;
        target.scaleY = source.height * c.scale;
        target.eyeSocketScaleX = source.width * c.scale;
        target.eyeSocketScaleY = source.height * c.scale;
        target.eyeOpen = source.open;
        target.browLift = source.browLift;
        target.browRotation = source.browTilt;
        target.lidBias = source.lidBias || 0;
      }
      eye(rig.leftEye, recipe.leftEye, cal.leftEye);
      eye(rig.rightEye, recipe.rightEye, cal.rightEye);
      rig.mouth.x = recipe.mouth.x + cal.mouth.x;
      rig.mouth.y = recipe.mouth.y + cal.mouth.y;
      rig.mouth.scaleX = recipe.mouth.width * cal.mouth.scale;
      rig.mouth.scaleY = recipe.mouth.height * cal.mouth.scale;
      rig.mouth.mouthCurve = recipe.mouth.curve;
      rig.mouth.mouthD = recipe.mouth.dAmount;
      rig.mouth.mouthO = recipe.mouth.oAmount;
      rig.mouth.mouthCrescent = recipe.mouth.crescentSmileAmount || 0;
    }

    function postTelemetry(payload) {
      if (!initialConfig.debugTelemetry) return;
      var message = { type: "lcdprotoTelemetry", payload: payload };
      try {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify(message));
        } else if (window.parent && window.parent !== window) {
          window.parent.postMessage(message, "*");
        }
      } catch (e) {}
    }

    if (initialConfig.behaviourId) triggerBehaviour(initialConfig.behaviourId);
    else if (initialConfig.reactionId) triggerBehaviour(initialConfig.reactionId);
    else if (initialConfig.emotionId) triggerBehaviour(initialConfig.emotionId);

    var pointerId = null;
    var downX = 0, downY = 0;
    var isDragging = false;

    function getCanvasPoint(clientX, clientY) {
      var rect = canvas.getBoundingClientRect();
      return { x: ((clientX - rect.left) / Math.max(1, rect.width)) * size, y: ((clientY - rect.top) / Math.max(1, rect.height)) * size };
    }

    function onPointerDown(e) {
      if (initialConfig.interactive === false || initialConfig.active === false) return;
      var p = getCanvasPoint(e.clientX, e.clientY);
      var blobX = size / 2 + (latestRig && latestRig.blob ? latestRig.blob.x : 0);
      var blobY = size / 2 + (latestRig && latestRig.blob ? latestRig.blob.y : 0);
      if (Math.hypot(p.x - blobX, p.y - blobY) > hitRadius * 0.84) return;
      pointerId = e.pointerId;
      downX = p.x;
      downY = p.y;
      isDragging = false;
      try { if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId); } catch (err) {}
      if (e.preventDefault) e.preventDefault();
    }

    function onPointerMove(e) {
      if (pointerId === null || e.pointerId !== pointerId) return;
      var p = getCanvasPoint(e.clientX, e.clientY);
      if (!isDragging) {
        if (Math.hypot(p.x - downX, p.y - downY) < 3) return;
        isDragging = true;
        drag.begin(downX, downY, performance.now());
      }
      drag.move(p.x, p.y, performance.now());
      if (e.preventDefault) e.preventDefault();
    }

    function onPointerEnd(e) {
      if (pointerId === null || e.pointerId !== pointerId) return;
      pointerId = null;
      try { if (canvas.releasePointerCapture) canvas.releasePointerCapture(e.pointerId); } catch (err) {}
      if (isDragging) { isDragging = false; drag.end(); }
    }

    canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerEnd);
    window.addEventListener("pointercancel", onPointerEnd);

    function tick(now) {
      frame = null;
      if (initialConfig.active === false || document.hidden) { lastFrame = null; return; }

      var dtMs = lastFrame === null ? 16.67 : Math.min(100, Math.max(1, now - lastFrame));
      lastFrame = now;
      var step = dtMs / 1000;
      idleTime += step;

      controller.update(dtMs, behaviourConfig, true);
      var d = controller.pose();
      var performanceSample = performanceRunner.update(dtMs);
      var performanceBody = performanceSample.body || {};
      if (performanceSample.activeExpressionId && performanceSample.activeExpressionId !== lastPerformanceExpression) {
        lastPerformanceExpression = performanceSample.activeExpressionId;
        triggerBehaviour(performanceSample.activeExpressionId);
      }

      var amb = ambient.update(dtMs, LCD.DEFAULT_IDLE, d.blobY || 0);
      var defaultFloat = Math.max(0.01, LCD.DEFAULT_MOTION_CONFIG.floatAmount || 4.5);
      var defaultDrift = Math.max(0.01, LCD.DEFAULT_MOTION_CONFIG.driftAmount || 2.5);
      var ambientScaleY = initialConfig.reducedMotion ? 0 : clamp((motionConfig.floatAmount || 0) / defaultFloat, 0, 2.4);
      var ambientScaleX = initialConfig.reducedMotion ? 0 : clamp((motionConfig.driftAmount || 0) / defaultDrift, 0, 2.4);
      var performanceScaleX = (performanceBody.scaleX === undefined ? 1 : performanceBody.scaleX) - 1;
      var performanceScaleY = (performanceBody.scaleY === undefined ? 1 : performanceBody.scaleY) - 1;

      var jellyTarget = {
        x: amb.x * ambientScaleX + (d.blobX || 0) + (performanceBody.x || 0),
        y: amb.y * ambientScaleY + (d.blobY || 0) + (performanceBody.y || 0),
        depth: (d.blobDepth || 0) + (performanceBody.depth || 0),
        yaw: (d.blobYaw || 0) + (performanceBody.yaw || 0),
        pitch: (d.blobPitch || 0) + (performanceBody.pitch || 0),
        rotation: amb.rotation * Math.max(ambientScaleX, ambientScaleY) + (d.blobRotation || 0) + (performanceBody.rotation || 0),
        scaleX: clamp((d.blobScaleX || 0) + amb.squashX * ambientScaleY, -0.1, 0.1),
        scaleY: clamp((d.blobScaleY || 0) + amb.squashY * ambientScaleY, -0.1, 0.1),
        bodyX: d.bodyX || 0,
        bodyY: d.bodyY || 0,
        bodyRotation: d.bodyRotation || 0,
        bodyScaleX: clamp((d.bodyScaleX || 0) + performanceScaleX, -0.3, 0.3),
        bodyScaleY: clamp((d.bodyScaleY || 0) + performanceScaleY, -0.3, 0.3),
        bodySkewX: (d.bodySkewX || 0) + (performanceBody.skewX || 0),
        bodySkewY: (d.bodySkewY || 0) + (performanceBody.skewY || 0),
        bodyOriginX: d.bodyOriginX || 0,
        bodyOriginY: d.bodyOriginY || 0.82,
        bodyDeformAngle: d.bodyDeformAngle || 0,
        jellyAmount: LCD.DEFAULT_IDLE.jellyAmount,
        rippleAmount: LCD.DEFAULT_IDLE.rippleAmount,
      };

      var rootScale = clamp((currentParams.scale || 1) * (1 + amb.breath) * (1 + (d.blobScale || 0)), 0.4, 1.3);
      var rootScaleX = clamp(1 + jellyTarget.scaleX * 0.38, 0.78, 1.22);
      var rootScaleY = clamp(1 + jellyTarget.scaleY * 0.38, 0.78, 1.22);
      hitRadius = 170 * rootScale * Math.max(rootScaleX, rootScaleY) * (1 + Math.max(0, currentParams.puff || 0) * 0.3) * clamp(currentParams.lobeSoftness || 1, 0.75, 1.3);
      hitRadius = Math.min(hitRadius, size / 2 - 5);

      var dragPose = drag.step(dtMs, size, hitRadius, jellyTarget.x, jellyTarget.y);
      jellyTarget.x += dragPose.x;
      jellyTarget.y += dragPose.y;
      jellyTarget.rotation += dragPose.rotation;
      jellyTarget.scaleX = clamp(jellyTarget.scaleX + dragPose.scaleX, -0.1, 0.1);
      jellyTarget.scaleY = clamp(jellyTarget.scaleY + dragPose.scaleY, -0.1, 0.1);
      jellyTarget.bodyDeformAngle = dragPose.wallPressure > 0.01 ? dragPose.deformAngle - (d.bodyRotation || 0) : 0;
      jellyTarget.bodyScaleX = clamp(jellyTarget.bodyScaleX + dragPose.bodyScaleX, -0.34, 0.34);
      jellyTarget.bodyScaleY = clamp(jellyTarget.bodyScaleY + dragPose.bodyScaleY, -0.34, 0.34);
      var contactX = dragPose.contactX;
      var contactY = dragPose.contactY;
      var contactPressure = dragPose.wallPressure;
      jellyTarget.bodySkewX += dragPose.skewX;
      jellyTarget.bodySkewY += dragPose.skewY;

      var physical = physics.update(dtMs, jellyTarget);
      var vx = (physical.x - prevX) / Math.max(step, 1e-3);
      var vy = (physical.y - prevY) / Math.max(step, 1e-3);
      var speed = Math.hypot(vx, vy);
      var acceleration = Math.hypot(vx - prevVx, vy - prevVy) / Math.max(step, 1e-3);
      prevX = physical.x;
      prevY = physical.y;
      prevVx = vx;
      prevVy = vy;

      var desiredYaw = speed > 5 ? clamp(vx * 0.08, -26, 26) : 0;
      var desiredPitch = speed > 5 ? clamp(vy * 0.05, -16, 16) : 0;
      var springK = 125;
      var springD = 16.5;
      var fYaw = -springK * (turnYaw - desiredYaw) - springD * turnVelYaw;
      turnVelYaw += fYaw * step;
      turnYaw += turnVelYaw * step;
      var fPitch = -springK * (turnPitch - desiredPitch) - springD * turnVelPitch;
      turnVelPitch += fPitch * step;
      turnPitch += turnVelPitch * step;

      physical.yaw = (physical.yaw || 0) + turnYaw + normalizedTurn(initialConfig.driverYaw, 28);
      physical.pitch = (physical.pitch || 0) + turnPitch + normalizedTurn(initialConfig.driverPitch, 18);

      var rig = LCD.applyCalibration({
        blob: Object.assign({}, LCD.NEUTRAL_BLOB, {
          x: physical.x,
          y: physical.y,
          depth: physical.depth,
          yaw: physical.yaw,
          pitch: physical.pitch,
          scale: (1 + amb.breath) * (1 + (d.blobScale || 0)),
          scaleX: 1,
          scaleY: 1,
          rotation: physical.rotation + (d.blobSpin || 0),
          opacity: d.blobOpacity !== undefined ? d.blobOpacity : 1,
          faceStyle: d.faceStyle || 0,
        }),
        body: Object.assign({}, LCD.NEUTRAL_ELEMENT, {
          x: physical.bodyX,
          y: physical.bodyY,
          rotation: physical.bodyRotation,
          skewX: physical.bodySkewX,
          skewY: physical.bodySkewY,
          originX: physical.bodyOriginX,
          originY: physical.bodyOriginY,
          deformAngle: physical.bodyDeformAngle,
          scaleX: 1 + clamp(physical.scaleX, -0.1, 0.1) + clamp(physical.bodyScaleX, -0.34, 0.34),
          scaleY: 1 + clamp(physical.scaleY, -0.1, 0.1) + clamp(physical.bodyScaleY, -0.34, 0.34),
          contactX: contactX,
          contactY: contactY,
          contactPressure: contactPressure,
          rippleTop: physical.rippleTop,
          rippleUpper: physical.rippleUpper,
          rippleLower: physical.rippleLower,
          rippleBottom: physical.rippleBottom,
        }),
        leftEye: Object.assign({}, LCD.NEUTRAL_ELEMENT, {
          x: (d.eyeX || 0) + (d.leftEyeX || 0),
          y: (d.eyeY || 0) + (d.leftEyeY || 0),
          socketX: (d.eyeX || 0) + (d.leftEyeX || 0),
          socketY: (d.eyeY || 0) + (d.leftEyeY || 0),
          eyeOpen: (d.eyeLid !== undefined ? d.eyeLid : 1) * (d.leftEyeTension !== undefined ? d.leftEyeTension : 1),
          eyeSocketScaleX: 1 + (d.leftEyeScaleX || 0),
          eyeSocketScaleY: 1 + (d.leftEyeScaleY || 0),
          browLift: d.leftEyeTension !== undefined ? d.leftEyeTension - 1 : 0,
          browRotation: d.leftBrowRotation || 0,
          pupilX: d.leftPupilX || 0,
          pupilY: d.leftPupilY || 0,
          pupilScale: d.pupilScale !== undefined ? d.pupilScale : 1,
          lidBias: d.leftLidBias || 0,
          eyeStyle: d.leftEyeStyle !== undefined ? d.leftEyeStyle : -1,
          scaleX: 1 + (d.leftEyeScaleX || 0),
          scaleY: 1 + (d.leftEyeScaleY || 0),
          rotation: d.leftEyeRotation || 0,
        }),
        rightEye: Object.assign({}, LCD.NEUTRAL_ELEMENT, {
          x: (d.eyeX || 0) + (d.rightEyeX || 0),
          y: (d.eyeY || 0) + (d.rightEyeY || 0),
          socketX: (d.eyeX || 0) + (d.rightEyeX || 0),
          socketY: (d.eyeY || 0) + (d.rightEyeY || 0),
          eyeOpen: (d.eyeLid !== undefined ? d.eyeLid : 1) * (d.rightEyeTension !== undefined ? d.rightEyeTension : 1),
          eyeSocketScaleX: 1 + (d.rightEyeScaleX || 0),
          eyeSocketScaleY: 1 + (d.rightEyeScaleY || 0),
          browLift: d.rightEyeTension !== undefined ? d.rightEyeTension - 1 : 0,
          browRotation: d.rightBrowRotation || 0,
          pupilX: d.rightPupilX || 0,
          pupilY: d.rightPupilY || 0,
          pupilScale: d.pupilScale !== undefined ? d.pupilScale : 1,
          lidBias: d.rightLidBias || 0,
          eyeStyle: d.rightEyeStyle !== undefined ? d.rightEyeStyle : -1,
          scaleX: 1 + (d.rightEyeScaleX || 0),
          scaleY: 1 + (d.rightEyeScaleY || 0),
          rotation: d.rightEyeRotation || 0,
        }),
        mouth: Object.assign({}, LCD.NEUTRAL_ELEMENT, {
          x: d.mouthX || 0,
          y: d.mouthY || 0,
          scaleX: 1 + (d.mouthScaleX || 0),
          scaleY: 1 + (d.mouthScaleY || 0),
          rotation: d.mouthRotation || 0,
          opacity: d.mouthOpacity !== undefined ? d.mouthOpacity : 1,
          mouthCurve: d.mouthCurve !== undefined ? d.mouthCurve : 0.82,
          mouthO: d.mouthO || 0,
          mouthD: d.mouthD || 0,
          mouthCrescent: d.mouthCrescent || 0,
        })
      }, LCD.DEFAULT_FACE_CALIBRATION);

      if (manualRecipe) applyExpressionRecipe(rig, manualRecipe);
      applyFacePlacement(rig);
      latestRig = rig;

      var pressVal = clamp(rig.body.contactPressure || 0, 0, 1);
      var cnx = rig.body.contactX || 0;
      var cny = rig.body.contactY || 0;
      var pRight = pressVal * Math.max(0, cnx);
      var pLeft = pressVal * Math.max(0, -cnx);
      var pDown = pressVal * Math.max(0, cny);
      var pUp = pressVal * Math.max(0, -cny);
      var motionGazeX = speed > 18 ? clamp(vx / 140, -1, 1) : 0;
      var motionGazeY = speed > 18 ? clamp(vy / 110, -1, 1) : 0;
      var baseGazeX = clamp(rig.leftEye.x / 9, -1, 1);
      var baseGazeY = clamp(rig.leftEye.y / 7, -1, 1);
      var cloudDeformParams = Object.assign({}, LCD.DEFAULT_DEFORMATION, currentParams, {
        squash: clamp((currentParams.squash || 0) + (performanceBody.squash || 0) + Math.max(0, 1 - rig.body.scaleY) * 1.4 + pressVal * Math.abs(cny) * 0.7 + (acceleration > 450 ? clamp((acceleration - 450) / 5500, 0, 0.08) : 0), 0, 0.95),
        stretch: clamp((currentParams.stretch || 0) + (performanceBody.stretch || 0) + Math.max(0, rig.body.scaleY - 1) * 1.4 + pressVal * Math.abs(cnx) * 0.6 + Math.min(0.14, speed * 0.0003), 0, 0.95),
        lean: (currentParams.lean || 0) + (performanceBody.lean || 0) + rig.body.skewX * 0.5 - cnx * pressVal * 20 + clamp(vx * 0.022, -12, 12),
        leftBulge: (currentParams.leftBulge || 0) + pRight * 26 - pLeft * 12,
        rightBulge: (currentParams.rightBulge || 0) + pLeft * 26 - pRight * 12,
        topBulge: (currentParams.topBulge || 0) + pDown * 15 - pUp * 8,
        bottomSag: (currentParams.bottomSag || 0) + pUp * 15 - pDown * 8,
        gazeX: clamp(baseGazeX * 0.45 + motionGazeX * 0.65, -1, 1),
        gazeY: clamp(baseGazeY * 0.45 + motionGazeY * 0.65, -1, 1),
        x: rig.blob.x,
        y: rig.blob.y,
        turnYaw: rig.blob.yaw,
        turnPitch: rig.blob.pitch,
      });

      var activeWisps = updateWisps(wisps, step, trailConfig.driftAmount === undefined ? 1 : trailConfig.driftAmount, trailConfig.fadeSpeed === undefined ? 1 : trailConfig.fadeSpeed);
      var trailStrength = Math.max(0, trailConfig.trailStrength === undefined ? 0.6 : trailConfig.trailStrength);
      var spawnRate = Math.max(0, trailConfig.spawnRate === undefined ? 1 : trailConfig.spawnRate);
      var velEnergy = speed > 95 ? clamp((speed - 95) / 140, 0, 1.3) : 0;
      var accelEnergy = acceleration > 850 ? clamp((acceleration - 850) / 2200, 0, 1) : 0;
      var prevSpeed = Math.hypot(prevVx, prevVy);
      var dot = speed > 10 && prevSpeed > 10 ? (vx * prevVx + vy * prevVy) / (speed * prevSpeed) : 1;
      var turnEnergy = dot < 0.6 && speed > 55 ? clamp((1 - dot) * 0.9, 0, 0.9) : 0;
      var dynamicEnergy = velEnergy + accelEnergy + turnEnergy + (isDragging ? 0.18 : 0);
      var idleWisp = false;
      if (!isDragging && speed < 15 && idleTime - lastIdleWisp > 11 && Math.sin(idleTime * 0.65) > 0.985) {
        idleWisp = true;
        lastIdleWisp = idleTime;
      }
      if (trailConfig.enabled !== false && trailStrength > 0) {
        emission = dynamicEnergy > 0 ? emission + dynamicEnergy * 6 * step * spawnRate : (idleWisp ? 1 : emission);
        var cap = isDragging ? 16 : (speed > 160 ? 14 : (speed > 50 ? 8 : 4));
        while (emission >= 1 && activeWisps < cap) {
          emission -= 1;
          var speedNorm = Math.max(speed, 1);
          var nxVel = speed > 5 ? vx / speedNorm : 0;
          var nyVel = speed > 5 ? vy / speedNorm : -1;
          var seq = sequence++;
          var puffRadius = (14 + (seq % 3) * 3 + ((seq % 4) - 1.5) * 2) * (currentParams.scale || 1);
          var sideOffset = Math.sin(seq * 2.1) * 26 * (currentParams.scale || 1);
          var trailOffset = (72 + (seq % 3) * 14) * (currentParams.scale || 1);
          var spawnX = size / 2 + rig.blob.x - nxVel * trailOffset - nyVel * sideOffset;
          var spawnY = size / 2 + rig.blob.y - nyVel * trailOffset + nxVel * sideOffset;
          if (spawnWisp(wisps, spawnX, spawnY, -vx * 0.12 + Math.sin(seq * 2.5) * 10, -vy * 0.12 - 8 + Math.cos(seq * 2.1) * 8, puffRadius, seq % 3 === 0 ? currentPalette.body : currentPalette.edge, (trailConfig.lifetime || 0.9) * (0.9 + (seq % 3) * 0.15), Math.min(0.7, 0.42 * trailStrength), seq)) activeWisps++;
        }
        emission = Math.min(emission, 2);
      } else {
        clearWisps();
        activeWisps = 0;
      }

      LCD.stepLobePhysics(lobeStates, cloudDeformParams, motionConfig, vx / Math.max(0.01, cloudDeformParams.scale || 1), vy / Math.max(0.01, cloudDeformParams.scale || 1), initialConfig.reducedMotion ? 0 : idleTime, step);
      LCD.renderCloudBlob(ctx, {
        size: size,
        renderScale: 1,
        lobeStates: lobeStates,
        colour: currentPalette,
        wisps: wisps,
        showFace: true,
        rig: rig,
        idleTime: initialConfig.reducedMotion ? 0 : idleTime,
        params: cloudDeformParams,
        showPupils: initialConfig.showPupils || false,
        vx: vx,
        vy: vy,
        colourName: "blue",
        wallAngle: (dragPose.deformAngle * Math.PI) / 180 - ((cloudDeformParams.rotation || 0) * Math.PI) / 180,
        wallScaleX: 1 + dragPose.bodyScaleX * 0.55,
        wallScaleY: 1 + dragPose.bodyScaleY,
        safeRadius: Math.max(0, size / 2 - hitRadius),
        debug: false
      });
      Scene(ctx, rig, step, initialConfig.reducedMotion ? 0 : idleTime, initialConfig.displayMode || 'dark', initialConfig.screenColour || '#000000', initialConfig.presentation === 'integrated');

      if (initialConfig.debugTelemetry && now - lastTelemetryAt >= 250) {
        lastTelemetryAt = now;
        var playback = performanceRunner.getPlaybackState();
        postTelemetry({
          fps: Math.round(1000 / Math.max(1, dtMs)),
          frameTimeMs: Math.round(dtMs * 10) / 10,
          state: initialConfig.state || "HOME",
          behaviourId: lastTriggerId,
          performanceId: playback.clipId,
          performancePlaying: playback.isPlaying,
          performanceTimeMs: Math.round(playback.currentTimeMs),
          expressionRecipeId: manualRecipe ? manualRecipe.id : null,
          yaw: Math.round((rig.blob.yaw || 0) * 10) / 10,
          pitch: Math.round((rig.blob.pitch || 0) * 10) / 10,
          gazeX: Math.round(cloudDeformParams.gazeX * 100) / 100,
          gazeY: Math.round(cloudDeformParams.gazeY * 100) / 100,
          velocityX: Math.round(vx * 10) / 10,
          velocityY: Math.round(vy * 10) / 10,
          speed: Math.round(speed * 10) / 10,
          dragging: isDragging,
          wallPressure: Math.round(contactPressure * 100) / 100,
          wispCount: activeWisps,
          active: initialConfig.active !== false,
          lcdprotoSha: initialConfig.lcdprotoSourceSha || "unknown"
        });
      }
      frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);

    window.updateCloudProps = function(props) {
      if (!props) return;
      if (props.active !== undefined && props.active !== initialConfig.active) {
        initialConfig.active = props.active;
        if (props.active && frame === null) frame = requestAnimationFrame(tick);
      }
      var targetTrigger = props.behaviourId || props.reactionId;
      if (targetTrigger && (targetTrigger !== lastTriggerId || (props.reactionToken !== undefined && props.reactionToken !== initialConfig.reactionToken))) {
        initialConfig.reactionToken = props.reactionToken;
        triggerBehaviour(targetTrigger);
      } else if (props.emotionId && props.emotionId !== initialConfig.emotionId) {
        initialConfig.emotionId = props.emotionId;
        triggerBehaviour(props.emotionId);
      }
      if (props.palette) currentPalette = Object.assign({}, currentPalette, props.palette);
      if (props.cloudSettings) applyCloudSettings(props.cloudSettings);
      if (props.driverYaw !== undefined) initialConfig.driverYaw = props.driverYaw;
      if (props.driverPitch !== undefined) initialConfig.driverPitch = props.driverPitch;
      if (props.showPupils !== undefined) initialConfig.showPupils = props.showPupils;
      if (props.interactive !== undefined) initialConfig.interactive = props.interactive;
      if (props.debugTelemetry !== undefined) initialConfig.debugTelemetry = props.debugTelemetry;
      if (props.state !== undefined) initialConfig.state = props.state;
      if (props.lcdprotoSourceSha) initialConfig.lcdprotoSourceSha = props.lcdprotoSourceSha;
      if (props.expressionRecipe !== undefined) manualRecipe = props.expressionRecipe;
      if (props.presentation !== undefined) {
        initialConfig.presentation = props.presentation;
        if (props.presentation === "integrated") {
          document.body.style.background = "transparent";
        } else if (props.screenColour || initialConfig.screenColour) {
          document.body.style.background = props.screenColour || initialConfig.screenColour || "#000000";
        }
      }
      if (props.screenColour) {
        initialConfig.screenColour = props.screenColour;
        if (initialConfig.presentation !== "integrated") {
          document.body.style.background = props.screenColour;
        }
      }
      if (props.displayMode) initialConfig.displayMode = props.displayMode;
    };

    window.handleDevLabCommand = function(command) {
      if (!command || !command.type) return;
      if (command.type === "play") {
        initialConfig.active = true;
        performanceRunner.play();
        if (frame === null) frame = requestAnimationFrame(tick);
      } else if (command.type === "pause") {
        initialConfig.active = false;
        performanceRunner.pause();
      } else if (command.type === "reset") {
        resetRuntime(true);
        initialConfig.active = true;
        if (frame === null) frame = requestAnimationFrame(tick);
      } else if (command.type === "center") {
        resetRuntime(false);
        initialConfig.active = true;
        if (frame === null) frame = requestAnimationFrame(tick);
      } else if (command.type === "clearTrails") {
        clearWisps();
      } else if (command.type === "triggerBehaviour") {
        triggerBehaviour(command.id);
      } else if (command.type === "triggerPerformance") {
        triggerPerformance(command.id);
      } else if (command.type === "applyExpressionRecipe") {
        manualRecipe = command.recipe || null;
      } else if (command.type === "clearExpressionRecipe") {
        manualRecipe = null;
      }
    };

    window.handleBridgeMessage = function(event) {
      try {
        var data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (!data) return;
        if (data.type === "dragStart") {
          drag.begin(size / 2 + (data.x || 0), size / 2 + (data.y || 0), performance.now());
          return;
        }
        if (data.type === "dragMove") {
          drag.move(size / 2 + (data.x || 0), size / 2 + (data.y || 0), performance.now());
          return;
        }
        if (data.type === "dragEnd") {
          drag.end();
          return;
        }
        if (data.type && (data.type === "play" || data.type === "pause" || data.type === "reset" || data.type === "center" || data.type === "clearTrails" || data.type === "triggerBehaviour" || data.type === "triggerPerformance" || data.type === "applyExpressionRecipe" || data.type === "clearExpressionRecipe")) {
          window.handleDevLabCommand(data);
          return;
        }
        window.updateCloudProps(data);
      } catch (e) {}
    };

    window.addEventListener("message", window.handleBridgeMessage);
    document.addEventListener("message", window.handleBridgeMessage);
    document.addEventListener('visibilitychange', function() {
      if (!document.hidden && frame === null && initialConfig.active !== false) frame = requestAnimationFrame(tick);
    });
    window.addEventListener('pagehide', function() {
      if (frame !== null) cancelAnimationFrame(frame);
    });
  })();
  </script>
</body>
</html>`;
}
