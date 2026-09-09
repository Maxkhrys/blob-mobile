import { canonicalScene } from "./canonicalScene.generated";
import { canonicalRuntime } from "./canonicalRuntime.generated";
import { cherriFrameCore } from "./cherriFrameCore.generated";
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
  parityTrace?: boolean;
  physicsDebug?: boolean;
  lcdprotoSourceSha?: string;
  expressionRecipe?: ExpressionRecipe | null;
  presentation?: "hardware" | "integrated";
  characterScale?: number;
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
    ${cherriFrameCore}
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
    if (!canvas.dataset) canvas.dataset = {};
    var ctx = canvas.getContext("2d");
    var size = 466;
    canvas.width = size;
    canvas.height = size;
    canvas.style.width = "100%";
    canvas.style.height = "100%";

    var controller = new LCD.BehaviourController();
    var autoMind = true;
    var ambient = new LCD.AmbientDrift();
    var physics = new LCD.BlobJellyPhysics();
    var drag = new LCD.BlobDragController();
    var lobeStates = LCD.createLobeStates();
    var wisps = createWispPool(24);

    var currentPalette = Object.assign(
      {
        body: "#c4a5ff",
        edge: "#c59ffe",
        innerGlow: "#ac90d5",
        coreTint: "#992fa7",
        glowIntensity: 1.15,
        density: 0.98,
        translucency: 0.8,
      },
      initialConfig.palette || {}
    );
    // Match web DEFAULT_CLOUD_SETTINGS: these are overrides, not a materialised
    // copy of DEFAULT_DEFORMATION. CloudCharacter intentionally treats absent
    // squash/stretch/lean as neutral while still falling back to the module's
    // optical/body defaults for the other fields.
    var currentParams = {};
    var motionConfig = Object.assign({}, LCD.DEFAULT_MOTION_CONFIG);
    var trailConfig = { enabled: true, trailStrength: 1, lifetime: 0.9, spawnRate: 1, fadeSpeed: 1, driftAmount: 1 };
    var faceConfig = { offsetX: 0, offsetY: 0, scale: 1 };

    function applyCloudSettings(settings) {
      settings = settings || {};
      currentParams = Object.assign({}, settings.params || {});
      motionConfig = Object.assign({}, LCD.DEFAULT_MOTION_CONFIG, settings.motion || {});
      trailConfig = Object.assign(
        { enabled: true, trailStrength: 1, lifetime: 0.9, spawnRate: 1, fadeSpeed: 1, driftAmount: 1 },
        settings.trails || {}
      );
      faceConfig = Object.assign({ offsetX: 0, offsetY: 0, scale: 1 }, settings.face || {});
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

    var characterScale = initialConfig.characterScale !== undefined ? initialConfig.characterScale : 0.68;
    var idleTime = 0;
    var lastFrame = null;
    var prevX = 0, prevY = 0, prevVx = 0, prevVy = 0;
    var facing = Object.assign({}, LCD.NEUTRAL_CLOUD_FACING || {
      facingYaw: 0, facingPitch: 0, performanceYaw: 0, performancePitch: 0, performanceRoll: 0
    });
    var sensor = new LCD.InteractionSensor();
    var cloudIdleWeight = 1;
    var physicalRadius = 92 * characterScale;
    var touchRadius = size * 0.32;
    var emission = 0;
    var sequence = 0;
    var lastIdleWisp = 0;
    var frame = null;
    var latestRig = null;
    var manualRecipe = initialConfig.expressionRecipe || null;
    var lastTriggerId = initialConfig.behaviourId || initialConfig.reactionId || null;
    var lastTelemetryAt = 0;
    var renderTimeMs = 0;
    var parityTrace = initialConfig.parityTrace === true;
    var contact = { grabbed: false, x: 0, y: 0 };
    var faceOverride = null;
    var syntheticTouchToken = 0;

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

    function playDeveloperAction(id) {
      if (!id) return;
      lastTriggerId = id;
      if (id === "PLAY_SHOWCASE" || id === "DEMO_60S_ADORABILITY") {
        if (controller.playStory) controller.playStory("DEMO_60S_ADORABILITY");
        else if (controller.playAdorabilityDemo) controller.playAdorabilityDemo();
        return;
      }
      if (id === "NEUTRAL") {
        if (controller.setOrientationLab) controller.setOrientationLab(null);
        return;
      }
      if (id === "TURN_LEFT") {
        if (controller.setOrientationLab) controller.setOrientationLab({ yaw: -72, pitch: 0 });
        return;
      }
      if (id === "TURN_RIGHT") {
        if (controller.setOrientationLab) controller.setOrientationLab({ yaw: 72, pitch: 0 });
        return;
      }
      if (id === "SPIN_360" || id === "BACKFLIP" || id === "FRONTFLIP" || id === "CARTWHEEL_LEFT" || id === "CARTWHEEL_RIGHT") {
        try { controller.trigger(id, behaviourConfig); } catch (e) {}
        return;
      }
      if (controller.playStory && controller.playStory(id)) return;
      triggerBehaviour(id);
    }

    function triggerBehaviour(id) {
      if (!id) return;
      lastTriggerId = id;
      var resolved = aliases[id] || id;
      try { controller.trigger(resolved, behaviourConfig); }
      catch (e) { try { controller.trigger(id, behaviourConfig); } catch (err) {} }
    }

    function resetRuntime(full) {
      controller = new LCD.BehaviourController();
      ambient = new LCD.AmbientDrift();
      physics = new LCD.BlobJellyPhysics();
      drag = new LCD.BlobDragController();
      sensor = new LCD.InteractionSensor();
      lobeStates = LCD.createLobeStates();
      clearWisps();
      idleTime = 0;
      lastFrame = null;
      prevX = 0;
      prevY = 0;
      prevVx = 0;
      prevVy = 0;
      facing = Object.assign({}, LCD.NEUTRAL_CLOUD_FACING || {
        facingYaw: 0, facingPitch: 0, performanceYaw: 0, performancePitch: 0, performanceRoll: 0
      });
      cloudIdleWeight = 1;
      physicalRadius = 92 * characterScale;
      touchRadius = size * 0.32;
      lastIdleWisp = 0;
      pointerId = null;
      isDragging = false;
      wasDragging = false;
      hasMovedPastThreshold = false;
      latestRig = null;
      contact = { grabbed: false, x: 0, y: 0 };
      if (full) {
        manualRecipe = null;
        faceOverride = null;
        lastTriggerId = null;
      }
      syntheticTouchToken += 1;
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

    function postBridgeMessage(message) {
      try {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify(message));
        } else if (window.parent && window.parent !== window) {
          window.parent.postMessage(message, "*");
        }
      } catch (e) {}
    }

    function postTelemetry(payload) {
      if (!initialConfig.debugTelemetry) return;
      postBridgeMessage({ type: "lcdprotoTelemetry", payload: payload });
    }

    if (initialConfig.behaviourId) triggerBehaviour(initialConfig.behaviourId);
    else if (initialConfig.reactionId) triggerBehaviour(initialConfig.reactionId);
    else if (initialConfig.emotionId) triggerBehaviour(initialConfig.emotionId);

    var pointerId = null;
    var downX = 0, downY = 0;
    var isDragging = false;
    var wasDragging = false;
    var hasMovedPastThreshold = false;
    var tapBlockedUntil = 0;
    var lastTapTime = 0;

    function getCanvasPoint(clientX, clientY) {
      var rect = canvas.getBoundingClientRect();
      return { x: ((clientX - rect.left) / Math.max(1, rect.width)) * size, y: ((clientY - rect.top) / Math.max(1, rect.height)) * size };
    }

    function onPointerDown(e) {
      if (initialConfig.interactive === false || initialConfig.active === false) return;
      var p = getCanvasPoint(e.clientX, e.clientY);
      var blobCenterX = size / 2 + (latestRig && latestRig.blob ? latestRig.blob.x : 0);
      var blobCenterY = size / 2 + (latestRig && latestRig.blob ? latestRig.blob.y : 0);
      if (Math.hypot(p.x - blobCenterX, p.y - blobCenterY) > touchRadius) return;
      pointerId = e.pointerId;
      downX = p.x;
      downY = p.y;
      isDragging = true;
      hasMovedPastThreshold = false;
      var relX = p.x - blobCenterX;
      var relY = p.y - blobCenterY;
      contact = { grabbed: true, x: p.x - size / 2, y: p.y - size / 2 };
      // Web starts the physical grab immediately. A stationary press therefore
      // enters the same pressure spring and local radial dent as a drag.
      drag.begin(p.x, p.y, e.timeStamp || performance.now(), relX, relY);
      sensor.contact(true, contact.x, contact.y, function(ev) { controller.notify(ev); });
      try { if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId); } catch (err) {}
      if (e.preventDefault) e.preventDefault();
    }

    function onPointerMove(e) {
      if (pointerId === null || e.pointerId !== pointerId) return;
      var p = getCanvasPoint(e.clientX, e.clientY);
      contact.x = p.x - size / 2;
      contact.y = p.y - size / 2;
      if (!hasMovedPastThreshold && Math.hypot(p.x - downX, p.y - downY) >= 4) {
        hasMovedPastThreshold = true;
      }
      drag.move(p.x, p.y, e.timeStamp || performance.now());
      if (e.preventDefault) e.preventDefault();
    }

    function onPointerEnd(e) {
      if (pointerId === null || e.pointerId !== pointerId) return;
      var p = getCanvasPoint(e.clientX, e.clientY);
      contact = { grabbed: false, x: p.x - size / 2, y: p.y - size / 2 };
      sensor.contact(false, contact.x, contact.y, function(ev) { controller.notify(ev); });
      pointerId = null;
      try { if (canvas.releasePointerCapture) canvas.releasePointerCapture(e.pointerId); } catch (err) {}
      if (isDragging) {
        isDragging = false;
        drag.end();
        if (hasMovedPastThreshold) tapBlockedUntil = performance.now() + 350;
      }
      if (!hasMovedPastThreshold) {
        var nowTime = performance.now();
        if (nowTime > tapBlockedUntil) {
          if (nowTime - lastTapTime < 340) {
            lastTapTime = 0;
            postBridgeMessage({ type: "cloudDoubleTap" });
          } else {
            lastTapTime = nowTime;
            setTimeout(function() {
              if (lastTapTime === nowTime) {
                postBridgeMessage({ type: "cloudTap" });
              }
            }, 350);
          }
        }
      }
      hasMovedPastThreshold = false;
    }

    canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerEnd);
    window.addEventListener("pointercancel", onPointerEnd);
    canvas.addEventListener("lostpointercapture", onPointerEnd);

    function tick(now) {
      var renderStartedAt = performance.now();
      frame = null;
      if (initialConfig.active === false || document.hidden) { lastFrame = null; return; }

      var firstFrame = lastFrame === null;
      var dtMs = firstFrame ? 16.67 : Math.min(100, Math.max(1, now - lastFrame));
      lastFrame = now;
      var step = dtMs / 1000;
      idleTime += step;

      controller.update(dtMs, behaviourConfig, autoMind);
      var d = controller.pose();
      if (faceOverride) d = Object.assign({}, d, faceOverride);

      var amb = initialConfig.reducedMotion
        ? { x: 0, y: 0, rotation: 0, breath: 0, squashX: 0, squashY: 0 }
        : ambient.update(dtMs, LCD.DEFAULT_IDLE, d.blobY || 0);

      cloudIdleWeight += ((drag.isGrabbed ? 0.25 : 1) - cloudIdleWeight) * (1 - Math.exp(-Math.min(dtMs, 50) / 180));
      // Mind yaw is unwrapped and unsclamped. driverYaw is an optional lab offset only.
      var emoteYaw = (d.blobYaw || 0) + normalizedTurn(initialConfig.driverYaw, 28);
      var emotePitch = (d.blobPitch || 0) + normalizedTurn(initialConfig.driverPitch, 18);
      var baseFrame = CherriFrameCore.buildJellyTarget(d, amb, {
        driftWeight: cloudIdleWeight,
        driverYaw: emoteYaw - (d.blobYaw || 0),
        driverPitch: emotePitch - (d.blobPitch || 0),
        jellyAmount: LCD.DEFAULT_IDLE.jellyAmount,
        rippleAmount: LCD.DEFAULT_IDLE.rippleAmount
      });
      var jellyTarget = baseFrame.target;
      physicalRadius = CherriFrameCore.effectiveDragRadius(
        d,
        amb,
        characterScale,
        currentParams.scale === undefined ? 1 : currentParams.scale
      );

      var dragPose = drag.step(dtMs, size, physicalRadius, jellyTarget.x, jellyTarget.y, true);
      sensor.update(dtMs, {
        grabbed: contact.grabbed,
        x: contact.x,
        y: contact.y,
        wallPressure: dragPose.wallPressure
      }, function(ev) {
        controller.notify(ev);
      });

      CherriFrameCore.applyDragToJellyTarget(baseFrame, d, dragPose);

      var physical = physics.update(dtMs, jellyTarget, true);

      var rig = CherriFrameCore.buildRig(LCD, physical, d, amb, dragPose, {
        characterScale: characterScale,
        calibration: LCD.DEFAULT_FACE_CALIBRATION
      });

      if (manualRecipe) applyExpressionRecipe(rig, manualRecipe);
      latestRig = rig;

      // CloudCharacter derives motion from the combined Blob + body offset,
      // not the root position alone. This is what drives lobe follow-through.
      var velocity = CherriFrameCore.frameVelocity(
        rig,
        { x: prevX, y: prevY },
        step,
        firstFrame
      );
      var vx = velocity.vx;
      var vy = velocity.vy;
      var speed = Math.hypot(vx, vy);
      var ax = (vx - prevVx) / Math.max(step, 1e-3);
      var ay = (vy - prevVy) / Math.max(step, 1e-3);
      var acceleration = Math.hypot(ax, ay);
      var oldVx = prevVx;
      var oldVy = prevVy;
      prevX = velocity.x;
      prevY = velocity.y;
      prevVx = vx;
      prevVy = vy;
      touchRadius = CherriFrameCore.touchHitRadius(
        size,
        rig,
        currentParams.scale === undefined ? 1 : currentParams.scale
      );

      // Facing × Performance. Eyes are the immediate copy; delayed layers lag.
      // Velocity still deforms lobes and sheds mist; it never authors heading.
      // Delays live in vendored applyCloudFacing (core 48ms, shell 105ms, crown 145ms, mass 165ms).
      var faceIn = { yaw: physical.yaw || 0, pitch: physical.pitch || 0 };
      var perfIn = {
        yaw: physical.performanceYaw || 0,
        pitch: physical.performancePitch || 0,
        roll: physical.performanceRoll || 0
      };
      LCD.applyCloudFacing(facing, faceIn, perfIn, step);
      canvas.dataset.finalYaw = (facing.facingYaw || 0).toFixed(3);
      canvas.dataset.finalPitch = (facing.facingPitch || 0).toFixed(3);
      canvas.dataset.performanceYaw = (facing.performanceYaw || 0).toFixed(3);
      canvas.dataset.performancePitch = (facing.performancePitch || 0).toFixed(3);
      canvas.dataset.performanceRoll = (facing.performanceRoll || 0).toFixed(3);
      canvas.dataset.coreYaw = (facing.coreFacingYaw || 0).toFixed(3);
      canvas.dataset.shellYaw = (facing.shellFacingYaw || 0).toFixed(3);
      canvas.dataset.crownYaw = (facing.crownFacingYaw || 0).toFixed(3);
      canvas.dataset.massYaw = (facing.massFacingYaw || 0).toFixed(3);
      canvas.dataset.facingOwner = "ACTED_RIG";
      canvas.dataset.motionId = (d && controller.mindTelemetry) ? (controller.mindTelemetry().storyId || "") : "";
      canvas.dataset.mouthTongue = String(rig.mouth.mouthTongue || 0);

      var motionForFrame = Object.assign({}, LCD.DEFAULT_MOTION_CONFIG, motionConfig);
      if (drag.isGrabbed) motionForFrame.lobeLag *= 1.18;
      else if ((dragPose.flickStretch || 0) > 0.02) motionForFrame.lobeLag *= 1.12;
      var cloudDeformParams = CherriFrameCore.buildCloudParams(
        LCD,
        rig,
        physical,
        dragPose,
        {
          cloudParams: currentParams,
          facing: facing,
          motion: motionForFrame,
          idleTime: initialConfig.reducedMotion ? 0 : idleTime,
          acceleration: acceleration
        }
      );
      var pressVal = cloudDeformParams.contactPressure;
      var grabPress = cloudDeformParams.grabPressure;
      canvas.dataset.actingScaleX = cloudDeformParams.actingScaleX.toFixed(3);
      canvas.dataset.actingScaleY = cloudDeformParams.actingScaleY.toFixed(3);
      canvas.dataset.actingPuff = cloudDeformParams.actingPuff.toFixed(3);

      var activeWisps = updateWisps(wisps, step, trailConfig.driftAmount === undefined ? 1 : trailConfig.driftAmount, trailConfig.fadeSpeed === undefined ? 1 : trailConfig.fadeSpeed);
      var trailStrength = Math.max(0, trailConfig.trailStrength === undefined ? 0.6 : trailConfig.trailStrength);
      var spawnRate = Math.max(0, trailConfig.spawnRate === undefined ? 1 : trailConfig.spawnRate);
      var velEnergy = speed > 95 ? clamp((speed - 95) / 140, 0, 1.3) : 0;
      var accelEnergy = acceleration > 850 ? clamp((acceleration - 850) / 2200, 0, 1) : 0;
      var prevSpeed = Math.hypot(oldVx, oldVy);
      var dot = speed > 10 && prevSpeed > 10 ? (vx * oldVx + vy * oldVy) / (speed * prevSpeed) : 1;
      var turnEnergy = dot < 0.6 && speed > 55 ? clamp((1 - dot) * 0.9, 0, 0.9) : 0;
      var justReleased = wasDragging && !isDragging;
      wasDragging = isDragging;
      var dynamicEnergy = velEnergy + accelEnergy + turnEnergy + (justReleased ? 1.8 : 0);
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
          var puffRadius = (14 + (seq % 3) * 3 + ((seq % 4) - 1.5) * 2) * cloudDeformParams.scale;
          var sideOffset = Math.sin(seq * 2.1) * 26 * cloudDeformParams.scale;
          var trailOffset = (72 + (seq % 3) * 14) * cloudDeformParams.scale;
          var spawnX = size / 2 + cloudDeformParams.x - nxVel * trailOffset - nyVel * sideOffset;
          var spawnY = size / 2 + cloudDeformParams.y - nyVel * trailOffset + nxVel * sideOffset;
          var spawned = spawnWisp(wisps, spawnX, spawnY, -vx * 0.12 + Math.sin(seq * 2.5) * 10, -vy * 0.12 - 8 + Math.cos(seq * 2.1) * 8, puffRadius, seq % 3 === 0 ? currentPalette.body : currentPalette.edge, (trailConfig.lifetime || 0.9) * (0.9 + (seq % 3) * 0.15), Math.min(0.7, 0.42 * trailStrength), seq);
          if (!spawned) break;
          activeWisps++;
        }
        emission = Math.min(emission, 2);
      } else {
        clearWisps();
        activeWisps = 0;
      }

      LCD.stepLobePhysics(lobeStates, cloudDeformParams, motionForFrame, vx / Math.max(0.01, cloudDeformParams.scale || 1), vy / Math.max(0.01, cloudDeformParams.scale || 1), initialConfig.reducedMotion ? 0 : idleTime, step);
      var lobeDeformationMagnitude = 0;
      Object.keys(lobeStates).forEach(function(id) {
        var lobe = lobeStates[id];
        lobeDeformationMagnitude = Math.max(
          lobeDeformationMagnitude,
          Math.abs((lobe.scaleX || 1) - 1),
          Math.abs((lobe.scaleY || 1) - 1)
        );
      });
      var renderPalette = currentPalette;
      if ((rig.blob.tintAmount || 0) > 0.01 && LCD.mixHexColor) {
        var tr = rig.blob.tintR != null ? rig.blob.tintR : 255;
        var tg = rig.blob.tintG != null ? rig.blob.tintG : 180;
        var tb = rig.blob.tintB != null ? rig.blob.tintB : 190;
        var tint = rig.blob.tintAmount;
        renderPalette = Object.assign({}, currentPalette, {
          body: LCD.mixHexColor(currentPalette.body, tr, tg, tb, tint),
          edge: LCD.mixHexColor(currentPalette.edge, tr, tg, tb, tint * 0.7),
          coreTint: LCD.mixHexColor(currentPalette.coreTint, tr, tg, tb, tint * 0.55),
          innerGlow: LCD.mixHexColor(currentPalette.innerGlow, tr, tg, tb, tint * 0.4),
        });
      }
      LCD.renderCloudBlob(ctx, {
        size: size,
        renderScale: 1,
        lobeStates: lobeStates,
        colour: renderPalette,
        wisps: wisps,
        showFace: true,
        rig: rig,
        idleTime: initialConfig.reducedMotion ? 0 : idleTime,
        params: cloudDeformParams,
        showPupils: initialConfig.showPupils || false,
        face: faceConfig,
        vx: vx,
        vy: vy,
        colourName: "purple",
        wallAngle: 0,
        wallScaleX: 1,
        wallScaleY: 1,
        safeRadius: Math.max(0, size / 2 - 170 * cloudDeformParams.scale),
        showContactShadow: false,
        debug: initialConfig.physicsDebug === true
      });
      Scene(ctx, rig, step, initialConfig.reducedMotion ? 0 : idleTime, initialConfig.displayMode || 'dark', initialConfig.screenColour || '#000000', initialConfig.presentation === 'integrated');
      renderTimeMs = performance.now() - renderStartedAt;

      if (initialConfig.debugTelemetry && now - lastTelemetryAt >= 250) {
        lastTelemetryAt = now;
        var mindTel = controller.mindTelemetry ? controller.mindTelemetry() : null;
        var truth = controller.poseTruthSnapshot ? controller.poseTruthSnapshot() : null;
        postTelemetry({
          fps: Math.round(1000 / Math.max(1, dtMs)),
          frameTimeMs: Math.round(dtMs * 10) / 10,
          renderTimeMs: Math.round(renderTimeMs * 100) / 100,
          state: initialConfig.state || "HOME",
          behaviourId: lastTriggerId,
          performanceId: null,
          performancePlaying: false,
          performanceTimeMs: 0,
          expressionRecipeId: manualRecipe ? manualRecipe.id : null,
          yaw: Math.round((rig.blob.yaw || 0) * 10) / 10,
          pitch: Math.round((rig.blob.pitch || 0) * 10) / 10,
          facingOwner: "ACTED_RIG",
          motionId: null,
          performanceYaw: Math.round((facing.performanceYaw || 0) * 10) / 10,
          performancePitch: Math.round((facing.performancePitch || 0) * 10) / 10,
          performanceRoll: Math.round((facing.performanceRoll || 0) * 10) / 10,
          gazeX: Math.round(cloudDeformParams.gazeX * 100) / 100,
          gazeY: Math.round(cloudDeformParams.gazeY * 100) / 100,
          velocityX: Math.round(vx * 10) / 10,
          velocityY: Math.round(vy * 10) / 10,
          speed: Math.round(speed * 10) / 10,
          dragging: isDragging,
          touching: contact.grabbed,
          touchMoved: hasMovedPastThreshold,
          grabPressure: Math.round(grabPress * 100) / 100,
          wallPressure: Math.round(pressVal * 100) / 100,
          contactX: dragPose.contactX || 0,
          contactY: dragPose.contactY || 0,
          contactDistance: dragPose.contactDistance || 0,
          contactRelX: dragPose.contactRelX || 0,
          contactRelY: dragPose.contactRelY || 0,
          influenceRadius: dragPose.influenceRadius || 58,
          gripPullX: dragPose.gripPullX || 0,
          gripPullY: dragPose.gripPullY || 0,
          accelX: dragPose.accelX || 0,
          accelY: dragPose.accelY || 0,
          cornerBlend: dragPose.cornerBlend || 0,
          flickStretch: dragPose.flickStretch || 0,
          faceShiftX: dragPose.faceShiftX || 0,
          faceShiftY: dragPose.faceShiftY || 0,
          dragFaceYaw: dragPose.faceYaw || 0,
          dragFacePitch: dragPose.facePitch || 0,
          wispCount: activeWisps,
          lobeDeformationMagnitude: Math.round(lobeDeformationMagnitude * 1000) / 1000,
          faceVisibility: Number(canvas.dataset.faceFront || 1),
          active: initialConfig.active !== false,
          reducedMotion: initialConfig.reducedMotion === true,
          parityTrace: parityTrace,
          lcdprotoSha: initialConfig.lcdprotoSourceSha || "7d26f8ba6b8709d38b071115a025ba0dfeaefbee",
          autoMind: autoMind,
          storyId: mindTel ? mindTel.storyId : null,
          phase: mindTel ? mindTel.phase : null,
          mood: mindTel ? mindTel.mood : null,
          cycle: mindTel ? mindTel.actingCycle : null,
          intensity: mindTel ? mindTel.actingIntensity : null,
          primitive: truth ? truth.primitiveId : null,
          cue: truth && truth.cue ? truth.cue.phase : null,
          actingAmount: truth ? truth.primitiveAmount : 0,
          blobScale: d.blobScale === undefined ? 1 : d.blobScale,
          mouthTongue: rig.mouth.mouthTongue || 0,
          mouthAction: truth && truth.cue ? (truth.cue.mouth || truth.cue.primitive || truth.cue.phase) : null,
          actingScaleX: Number(canvas.dataset.actingScaleX || 1),
          actingScaleY: Number(canvas.dataset.actingScaleY || 1),
          actingPuff: Number(canvas.dataset.actingPuff || 0),
          bodyScaleX: rig.body.scaleX,
          bodyScaleY: rig.body.scaleY,
          facingYaw: facing.facingYaw || 0,
          facingPitch: facing.facingPitch || 0,
          coreYaw: facing.coreFacingYaw || 0,
          corePitch: facing.coreFacingPitch || 0,
          shellYaw: facing.shellFacingYaw || 0,
          shellPitch: facing.shellFacingPitch || 0,
          crownYaw: facing.crownFacingYaw || 0,
          crownPitch: facing.crownFacingPitch || 0,
          massYaw: facing.massFacingYaw || 0,
          massPitch: facing.massFacingPitch || 0,
          recentStories: mindTel ? mindTel.recentStories : [],
          mind: mindTel,
          stages: parityTrace ? {
            controller: d,
            jellyTarget: jellyTarget,
            physics: physical,
            rig: rig,
            cloud: cloudDeformParams
          } : null
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
      if (props.characterScale !== undefined) characterScale = props.characterScale;
      if (props.driverYaw !== undefined) initialConfig.driverYaw = props.driverYaw;
      if (props.driverPitch !== undefined) initialConfig.driverPitch = props.driverPitch;
      if (props.showPupils !== undefined) initialConfig.showPupils = props.showPupils;
      if (props.interactive !== undefined) initialConfig.interactive = props.interactive;
      if (props.debugTelemetry !== undefined) initialConfig.debugTelemetry = props.debugTelemetry;
      if (props.parityTrace !== undefined) parityTrace = props.parityTrace === true;
      if (props.physicsDebug !== undefined) initialConfig.physicsDebug = props.physicsDebug;
      if (props.reducedMotion !== undefined) initialConfig.reducedMotion = props.reducedMotion === true;
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
        if (frame === null) frame = requestAnimationFrame(tick);
      } else if (command.type === "pause") {
        initialConfig.active = false;
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
      } else if (command.type === "triggerMotion" || command.type === "playSignature" || command.type === "playStory") {
        playDeveloperAction(command.id);
      } else if (command.type === "setAutoMind") {
        autoMind = command.enabled !== false;
      } else if (command.type === "setMood") {
        if (controller.forceMindMood && command.id) controller.forceMindMood(command.id);
      } else if (command.type === "setActingCycle") {
        if (controller.setActingCycle && command.id) controller.setActingCycle(command.id);
      } else if (command.type === "setActingIntensity") {
        if (controller.setActingIntensity && command.id) controller.setActingIntensity(command.id);
      } else if (command.type === "nextThought") {
        if (controller.thinkNow) controller.thinkNow();
      } else if (command.type === "playShowcase") {
        playDeveloperAction("DEMO_60S_ADORABILITY");
      } else if (command.type === "resetMind") {
        if (controller.reset) controller.reset();
        lastTriggerId = "RESET_MIND";
      } else if (command.type === "triggerBehaviour") {
        triggerBehaviour(command.id);
      } else if (command.type === "triggerPerformance") {
        playDeveloperAction(command.id);
      } else if (command.type === "triggerPrimitive") {
        if (controller.triggerPrimitive) {
          controller.triggerPrimitive(
            command.id,
            command.amount === undefined ? 1 : command.amount,
            command.direction === undefined ? 0 : command.direction
          );
          lastTriggerId = "PRIMITIVE:" + command.id;
        }
      } else if (command.type === "applyExpressionRecipe") {
        manualRecipe = command.recipe || null;
      } else if (command.type === "clearExpressionRecipe") {
        manualRecipe = null;
      } else if (command.type === "setParityTrace") {
        parityTrace = command.enabled === true;
      } else if (command.type === "setOrientation") {
        if (controller.setOrientationLab) {
          controller.setOrientationLab({ yaw: command.yaw || 0, pitch: command.pitch || 0 });
        }
      } else if (command.type === "setFaceOverride") {
        faceOverride = Object.assign({}, faceOverride || {}, command.values || {});
      } else if (command.type === "clearFaceOverride") {
        faceOverride = null;
      } else if (command.type === "runTouchTest") {
        runTouchTest(command.id);
      }
    };

    function syntheticBegin(x, y, relX, relY, at) {
      isDragging = true;
      hasMovedPastThreshold = false;
      contact = { grabbed: true, x: x - size / 2, y: y - size / 2 };
      drag.begin(x, y, at, relX, relY);
      sensor.contact(true, contact.x, contact.y, function(ev) { controller.notify(ev); });
    }

    function syntheticMove(x, y, at) {
      hasMovedPastThreshold = true;
      contact.x = x - size / 2;
      contact.y = y - size / 2;
      drag.move(x, y, at);
    }

    function syntheticEnd(x, y) {
      contact = { grabbed: false, x: x - size / 2, y: y - size / 2 };
      sensor.contact(false, contact.x, contact.y, function(ev) { controller.notify(ev); });
      isDragging = false;
      drag.end();
      hasMovedPastThreshold = false;
    }

    function runTouchTest(id) {
      var token = ++syntheticTouchToken;
      var nowTime = performance.now();
      var cx = size / 2 + (latestRig && latestRig.blob ? latestRig.blob.x : 0);
      var cy = size / 2 + (latestRig && latestRig.blob ? latestRig.blob.y : 0);
      var startX = cx - 58;
      var startY = cy + 6;
      syntheticBegin(startX, startY, startX - cx, startY - cy, nowTime);
      function later(delay, fn) {
        setTimeout(function() { if (token === syntheticTouchToken) fn(); }, delay);
      }
      if (id === "tap") {
        later(150, function() { syntheticEnd(startX, startY); });
      } else if (id === "hold") {
        later(950, function() { syntheticEnd(startX, startY); });
      } else if (id === "drag") {
        later(140, function() { syntheticMove(cx + 20, cy - 18, nowTime + 140); });
        later(320, function() { syntheticMove(cx + 96, cy + 24, nowTime + 320); });
        later(720, function() { syntheticEnd(cx + 96, cy + 24); });
      } else if (id === "flick") {
        later(32, function() { syntheticMove(cx + 28, cy - 14, nowTime + 32); });
        later(68, function() { syntheticMove(cx + 142, cy - 48, nowTime + 68); });
        later(82, function() { syntheticEnd(cx + 142, cy - 48); });
      } else if (id === "wall") {
        later(140, function() { syntheticMove(size - 8, cy + 18, nowTime + 140); });
        later(1100, function() { syntheticEnd(size - 8, cy + 18); });
      }
    }

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
        if (data.type && (data.type === "play" || data.type === "pause" || data.type === "reset" || data.type === "center" || data.type === "clearTrails" || data.type === "triggerBehaviour" || data.type === "triggerMotion" || data.type === "triggerPerformance" || data.type === "triggerPrimitive" || data.type === "applyExpressionRecipe" || data.type === "clearExpressionRecipe" || data.type === "setAutoMind" || data.type === "setMood" || data.type === "setActingCycle" || data.type === "setActingIntensity" || data.type === "nextThought" || data.type === "playShowcase" || data.type === "playStory" || data.type === "playSignature" || data.type === "resetMind" || data.type === "setParityTrace" || data.type === "setOrientation" || data.type === "runTouchTest" || data.type === "setFaceOverride" || data.type === "clearFaceOverride")) {
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
