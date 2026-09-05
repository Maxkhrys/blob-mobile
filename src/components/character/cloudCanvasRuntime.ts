import { canonicalScene } from "./canonicalScene.generated";
import { canonicalRuntime } from "./canonicalRuntime.generated";
import { CloudColourConfig } from "../../domain/character/types";

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
}

export function buildCloudHtml(initialConfig: CloudRuntimeConfig): string {
  const initialJson = JSON.stringify(initialConfig);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      user-select: none;
      touch-action: none;
    }
    html, body {
      width: 100%;
      height: 100%;
      background: transparent;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      touch-action: none;
    }
    canvas {
      display: block;
      background: transparent;
      touch-action: none;
      cursor: grab;
    }
    canvas:active {
      cursor: grabbing;
    }
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

    function createWispPool(count) {
      var pool = [];
      for (var i = 0; i < count; i++) {
        pool.push({
          active: false, x: 0, y: 0, vx: 0, vy: 0,
          radius: 24, targetRadius: 48, opacity: 0, initialOpacity: 0.5,
          age: 0, maxLife: 1.0, color: "#eaf3ff", angle: 0, shape: 0, curl: 0
        });
      }
      return pool;
    }

    function spawnWisp(pool, x, y, vx, vy, radius, color, lifetime, initialOpacity, seq) {
      for (var i = 0; i < pool.length; i++) {
        var w = pool[i];
        if (!w.active) {
          w.active = true;
          w.x = x; w.y = y; w.vx = vx; w.vy = vy;
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
        if (w.age >= w.maxLife) {
          w.active = false;
          w.opacity = 0;
          continue;
        }
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

    // --- CANVAS SETUP ---
    var canvas = document.getElementById("cloudCanvas");
    var ctx = canvas.getContext("2d");
    var size = 466; // native physical 466 x 466 display space
    canvas.width = size;
    canvas.height = size;
    canvas.style.width = "100%";
    canvas.style.height = "100%";

    // --- INITIALIZE CANONICAL UPSTREAM CONTROLLERS ---
    var controller = new LCD.BehaviourController();
    var ambient = new LCD.AmbientDrift();
    var physics = new LCD.BlobJellyPhysics();
    var drag = new LCD.BlobDragController();
    var lobeStates = LCD.createLobeStates();
    var wisps = createWispPool(24);

    var currentPalette = Object.assign({
      body: "#edf4ff", edge: "#ffffff", coreTint: "#627d98", innerGlow: "#ffffff",
      density: 1, translucency: 0.85, glowIntensity: 0.8
    }, initialConfig.palette || {});

    var currentParams = Object.assign({}, LCD.DEFAULT_DEFORMATION);
    var motionConfig = Object.assign({}, LCD.DEFAULT_MOTION_CONFIG);
    if (initialConfig.cloudSettings) {
      if (initialConfig.cloudSettings.params) Object.assign(currentParams, initialConfig.cloudSettings.params);
      if (initialConfig.cloudSettings.motion) Object.assign(motionConfig, initialConfig.cloudSettings.motion);
      if (initialConfig.cloudSettings.colour) {
        var col = initialConfig.cloudSettings.colour;
        if (col.glowIntensity !== undefined) currentPalette.glowIntensity = col.glowIntensity;
        if (col.density !== undefined) currentPalette.density = col.density;
        if (col.translucency !== undefined) currentPalette.translucency = col.translucency;
      }
    }
    document.body.style.background = initialConfig.screenColour || '#000000';

    var idleTime = 0;
    var lastFrame = null;
    var prevX = 0, prevY = 0;
    var emission = 0;
    var sequence = 0;
    var frame = null;
    var latestRig = null;

    var behaviourConfig = {
      gazePx: LCD.DEFAULT_IDLE.gazeDriftPx,
      squash: LCD.DEFAULT_IDLE.squashAmount,
      paceScale: LCD.DEFAULT_IDLE.activityPace,
      blinkIntervalMs: LCD.DEFAULT_IDLE.blinkInterval * 1000,
    };

    var aliases = {
      idle: 'REST',
      NEUTRAL: 'REST',
      happy: 'HAPPY_BOUNCE',
      excited: 'EXCITED_WIGGLE',
      curious: 'CURIOUS_TILT_LEFT',
      sleepy: 'SLEEPY_YAWN',
      surprised: 'SURPRISE_POP',
      angry: 'ANGRY_FLARE',
      sad: 'SAD_DOWNCAST'
    };

    function triggerBehaviour(id) {
      if (!id) return;
      var resolved = aliases[id] || id;
      try {
        controller.trigger(resolved, behaviourConfig);
      } catch (e) {
        try { controller.trigger(id, behaviourConfig); } catch (err) {}
      }
    }

    if (initialConfig.behaviourId) triggerBehaviour(initialConfig.behaviourId);
    else if (initialConfig.reactionId) triggerBehaviour(initialConfig.reactionId);
    else if (initialConfig.emotionId) triggerBehaviour(initialConfig.emotionId);

    // --- POINTER / TOUCH DRAGGING (CANONICAL BLOBDRAGCONTROLLER) ---
    var pointerId = null;
    var downX = 0, downY = 0;
    var isDragging = false;

    function getCanvasPoint(clientX, clientY) {
      var rect = canvas.getBoundingClientRect();
      return {
        x: ((clientX - rect.left) / Math.max(1, rect.width)) * size,
        y: ((clientY - rect.top) / Math.max(1, rect.height)) * size
      };
    }

    function onPointerDown(e) {
      if (initialConfig.interactive === false) return;
      var p = getCanvasPoint(e.clientX, e.clientY);
      var blobX = size / 2 + (latestRig && latestRig.blob ? latestRig.blob.x : 0);
      var blobY = size / 2 + (latestRig && latestRig.blob ? latestRig.blob.y : 0);
      // Generous circular touch target across the display
      if (Math.hypot(p.x - blobX, p.y - blobY) > 235) return;
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
      if (isDragging) {
        isDragging = false;
        drag.end();
      }
    }

    if (canvas && canvas.addEventListener) {
      canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
    }
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerEnd);
    window.addEventListener("pointercancel", onPointerEnd);

    // --- RENDER LOOP ---
    function tick(now) {
      frame = null;
      if (initialConfig.active === false || document.hidden) {
        lastFrame = null;
        return;
      }

      var dtMs = lastFrame === null ? 16.67 : Math.min(100, Math.max(1, now - lastFrame));
      lastFrame = now;
      var step = dtMs / 1000;
      idleTime += step;

      // 1. Upstream micro-behaviour controller (pose deltas across all 40+ channels)
      controller.update(dtMs, behaviourConfig, true);
      var d = controller.pose();

      // 2. Ambient breathing and drift (takes behaviour y for lag)
      var amb = ambient.update(dtMs, LCD.DEFAULT_IDLE, d.blobY || 0);

      // 3. Jelly target composition
      var jellyTarget = {
        x: amb.x + (d.blobX || 0),
        y: amb.y + (d.blobY || 0),
        depth: (d.blobDepth || 0),
        yaw: (d.blobYaw || 0) + (initialConfig.driverYaw || 0),
        pitch: (d.blobPitch || 0) + (initialConfig.driverPitch || 0),
        rotation: amb.rotation + (d.blobRotation || 0),
        scaleX: clamp((d.blobScaleX || 0) + amb.squashX, -0.1, 0.1),
        scaleY: clamp((d.blobScaleY || 0) + amb.squashY, -0.1, 0.1),
        bodyX: d.bodyX || 0,
        bodyY: d.bodyY || 0,
        bodyRotation: d.bodyRotation || 0,
        bodyScaleX: clamp(d.bodyScaleX || 0, -0.34, 0.34),
        bodyScaleY: clamp(d.bodyScaleY || 0, -0.34, 0.34),
        bodySkewX: d.bodySkewX || 0,
        bodySkewY: d.bodySkewY || 0,
        bodyOriginX: d.bodyOriginX || 0,
        bodyOriginY: d.bodyOriginY || 0.82,
        bodyDeformAngle: d.bodyDeformAngle || 0,
        jellyAmount: LCD.DEFAULT_IDLE.jellyAmount,
        rippleAmount: LCD.DEFAULT_IDLE.rippleAmount,
      };

      // 4. Drag step: grab springs, wall collision, and soft volume expansion
      var characterRadius = 0.5;
      var blobScaleNow = (1 + amb.breath) * (1 + (d.blobScale || 0));
      var dragPose = drag.step(
        dtMs,
        size,
        size * 0.535 * characterRadius * blobScaleNow,
        jellyTarget.x,
        jellyTarget.y
      );
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

      // 5. Jelly physical simulation
      var physical = physics.update(dtMs, jellyTarget);

      // 6. Build rig via canonical applyCalibration
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
          browLift: (d.leftEyeTension !== undefined ? d.leftEyeTension - 1 : 0),
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
          browLift: (d.rightEyeTension !== undefined ? d.rightEyeTension - 1 : 0),
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
      latestRig = rig;

      // 7. Cloud deformation parameters matching CloudCharacter.tsx
      var pressVal = clamp(rig.body.contactPressure || 0, 0, 1);
      var cnx = rig.body.contactX || 0;
      var cny = rig.body.contactY || 0;
      var pRight = pressVal * Math.max(0, cnx);
      var pLeft = pressVal * Math.max(0, -cnx);
      var pDown = pressVal * Math.max(0, cny);
      var pUp = pressVal * Math.max(0, -cny);

      var cloudDeformParams = Object.assign({}, LCD.DEFAULT_DEFORMATION, currentParams, {
        squash: clamp((currentParams.squash || 0) + Math.max(0, 1 - rig.body.scaleY) * 2.2 + pressVal * Math.abs(cny) * 0.7, 0, 0.95),
        stretch: clamp((currentParams.stretch || 0) + Math.max(0, rig.body.scaleY - 1) * 2.2 + pressVal * Math.abs(cnx) * 0.6, 0, 0.95),
        lean: (currentParams.lean || 0) + rig.body.skewX * 1.6 - cnx * pressVal * 20,
        leftBulge: (currentParams.leftBulge || 0) + pRight * 26 - pLeft * 12,
        rightBulge: (currentParams.rightBulge || 0) + pLeft * 26 - pRight * 12,
        topBulge: (currentParams.topBulge || 0) + pDown * 15 - pUp * 8,
        bottomSag: (currentParams.bottomSag || 0) + pUp * 15 - pDown * 8,
        gazeX: clamp(rig.leftEye.x / 9, -1, 1),
        gazeY: clamp(rig.leftEye.y / 7, -1, 1),
        x: rig.blob.x,
        y: rig.blob.y,
        turnYaw: rig.blob.yaw,
        turnPitch: rig.blob.pitch,
      });

      // 8. Wisps / trails update
      var vx = (rig.blob.x - prevX) / Math.max(step, 1e-3);
      var vy = (rig.blob.y - prevY) / Math.max(step, 1e-3);
      prevX = rig.blob.x;
      prevY = rig.blob.y;
      var speed = Math.hypot(vx, vy);

      updateWisps(wisps, step, motionConfig.driftSpeed || 1, 1.2);
      if (isDragging || speed > 22) {
        emission += step * (speed * 0.08 + 2);
        while (emission >= 1) {
          emission -= 1;
          var speedNorm = Math.max(speed, 1e-3);
          var nxVel = speed > 5 ? vx / speedNorm : 0;
          var nyVel = speed > 5 ? vy / speedNorm : -1;
          var seq = sequence++;
          var puffRadius = (14 + (seq % 3) * 3) * (currentParams.scale || 1);
          var sideOffset = Math.sin(seq * 2.1) * 24 * (currentParams.scale || 1);
          var trailOffset = (65 + (seq % 3) * 12) * (currentParams.scale || 1);
          var spawnX = size / 2 + rig.blob.x - nxVel * trailOffset - nyVel * sideOffset;
          var spawnY = size / 2 + rig.blob.y - nyVel * trailOffset + nxVel * sideOffset;
          spawnWisp(wisps, spawnX, spawnY, -vx * 0.1, -vy * 0.1 - 6, puffRadius, seq % 3 === 0 ? currentPalette.body : currentPalette.edge, 0.9, 0.45, seq);
        }
      }

      // 9. Step Lobe Physics
      LCD.stepLobePhysics(
        lobeStates,
        cloudDeformParams,
        motionConfig,
        vx / (cloudDeformParams.scale || 1),
        vy / (cloudDeformParams.scale || 1),
        idleTime,
        step
      );

      // 10. Render Frame
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
        wallAngle: 0,
        wallScaleX: 1,
        wallScaleY: 1,
        safeRadius: 233,
        debug: false
      });

      Scene(ctx, rig, step, initialConfig.reducedMotion ? 0 : idleTime, initialConfig.displayMode || 'dark', initialConfig.screenColour || '#000000');
      frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);

    // --- PROPS & BRIDGE UPDATES ---
    var lastTriggerId = null;
    window.updateCloudProps = function(props) {
      if (!props) return;
      if (props.active !== undefined && props.active !== initialConfig.active) {
        initialConfig.active = props.active;
        if (props.active && frame === null) frame = requestAnimationFrame(tick);
      }
      var targetTrigger = props.behaviourId || props.reactionId;
      if (targetTrigger && (targetTrigger !== lastTriggerId || (props.reactionToken !== undefined && props.reactionToken !== initialConfig.reactionToken))) {
        lastTriggerId = targetTrigger;
        initialConfig.reactionToken = props.reactionToken;
        triggerBehaviour(targetTrigger);
      } else if (props.emotionId && props.emotionId !== initialConfig.emotionId) {
        initialConfig.emotionId = props.emotionId;
        triggerBehaviour(props.emotionId);
      }
      if (props.palette) {
        currentPalette = Object.assign({}, currentPalette, props.palette);
      }
      if (props.cloudSettings) {
        if (props.cloudSettings.params) Object.assign(currentParams, props.cloudSettings.params);
        if (props.cloudSettings.motion) Object.assign(motionConfig, props.cloudSettings.motion);
        if (props.cloudSettings.colour) {
          var col = props.cloudSettings.colour;
          if (col.glowIntensity !== undefined) currentPalette.glowIntensity = col.glowIntensity;
          if (col.density !== undefined) currentPalette.density = col.density;
          if (col.translucency !== undefined) currentPalette.translucency = col.translucency;
        }
      }
      if (props.driverYaw !== undefined) initialConfig.driverYaw = props.driverYaw;
      if (props.driverPitch !== undefined) initialConfig.driverPitch = props.driverPitch;
      if (props.showPupils !== undefined) initialConfig.showPupils = props.showPupils;
      if (props.interactive !== undefined) initialConfig.interactive = props.interactive;
      if (props.screenColour) {
        initialConfig.screenColour = props.screenColour;
        document.body.style.background = props.screenColour;
      }
      if (props.displayMode) initialConfig.displayMode = props.displayMode;
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
        window.updateCloudProps(data);
      } catch (e) {}
    };

    window.addEventListener("message", window.handleBridgeMessage);
    document.addEventListener("message", window.handleBridgeMessage);

    document.addEventListener('visibilitychange', function() {
      if (!document.hidden && frame === null && initialConfig.active !== false) {
        frame = requestAnimationFrame(tick);
      }
    });
    window.addEventListener('pagehide', function() { cancelAnimationFrame(frame); });

  })();
  </script>
</body>
</html>`;
}
