import { canonicalScene } from "./canonicalScene.generated";
import { canonicalRuntime } from "./canonicalRuntime.generated";
/**
 * Canonical Cloud Character HTML5 Canvas Runtime
 * Synchronized with LCDPROTO:
 * - components/experimental/cloud-blob/cloudRenderer.ts
 * - components/experimental/cloud-blob/cloudLobeSystem.ts
 * - components/experimental/cloud-blob/cloudMistTrails.ts
 * - components/blob/CloudCharacter.tsx
 * - components/blob/faceRenderer.ts
 * - lib/blobRig.ts
 */

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
    }
    html, body {
      width: 100%;
      height: 100%;
      background: transparent;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    canvas {
      display: block;
      background: transparent;
      touch-action: none;
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

    function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
    var renderCloudBlob = LCD.renderCloudBlob;
    var createLobeStates = LCD.createLobeStates;
    var stepLobePhysics = LCD.stepLobePhysics;
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

    // --- SIMULATION LOOP & RIG BLENDING ---
    var canvas = document.getElementById("cloudCanvas");
    var ctx = canvas.getContext("2d");

    var size = 466; // native LCDPROTO 466 space
    var dpr = 1; // Match physical 466 x 466 display; avoid 9x overdraw.
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = "100%";
    canvas.style.height = "100%";

    var currentPalette = initialConfig.palette || {
      body: "#edf4ff", edge: "#ffffff", coreTint: "#627d98", innerGlow: "#ffffff",
      density: 1, translucency: 0.85, glowIntensity: 0.8
    };

    var currentParams = Object.assign({}, LCD.DEFAULT_DEFORMATION);
    var motionConfig = Object.assign({}, LCD.DEFAULT_MOTION_CONFIG);
    document.body.style.background = initialConfig.screenColour || '#000000';
    var lobeStates = createLobeStates();
    var wisps = createWispPool(24);

    var currentRig = LCD.recipeToBlobRig(LCD.getCoreExpression('NEUTRAL'));
    var targetRig = JSON.parse(JSON.stringify(currentRig));
    var performance = (LCD.CloudPerformance && typeof LCD.CloudPerformance === 'function') ? new LCD.CloudPerformance() : null;
    var reactionStarted = 0, reactionClip = null, reactionExpression = null;
    var reactionDuration = 0;
    var bodyPose = Object.assign({}, LCD.DEFAULT_BODY_POSE);
    var idleTime = 0;
    var lastFrame = null;
    var prevX = 0, prevY = 0;
    var prevVx = 0, prevVy = 0;
    var emission = 0;
    var sequence = 0;
    var lastIdleWisp = 0;

    var turnYaw = 0;
    var turnPitch = 0;
    var turnVelYaw = 0;
    var turnVelPitch = 0;
    var intentX = 0;
    var intentY = 0;
    var gazeLeadX = 0;
    var gazeLeadY = 0;
    var yawIntent = 0;
    var pitchIntent = 0;

    // Pointer Drag Spring
    var dragActive = false;
    var dragTargetX = 0;
    var dragTargetY = 0;
    var dragX = 0, dragY = 0;
    var dragVx = 0, dragVy = 0;

    var aliases = {idle:'NEUTRAL',REST:'NEUTRAL',happy:'HAPPY',HAPPY_EYES:'HAPPY',excited:'EXCITED',EXCITED_EYES:'EXCITED',curious:'CURIOUS',CURIOUS_WIDE:'CURIOUS',CURIOUS_TILT_LEFT:'CURIOUS',sleepy:'SLEEPY',SLEEPY_EYES:'SLEEPY',surprised:'SURPRISED',SURPRISE_POP:'SURPRISED'};
    var lastExpressionId = null;
    function applyEmotionToTarget(id) {
      var resolvedId = aliases[id] || id;
      if(resolvedId === lastExpressionId) return;
      lastExpressionId = resolvedId;
      var recipe = LCD.getCoreExpression ? LCD.getCoreExpression(resolvedId) : null;
      if (recipe) targetRig = LCD.recipeToBlobRig(recipe);
    }
    function beginReaction(id) {
      reactionClip = (LCD.CORE_PERFORMANCES && LCD.CORE_PERFORMANCES.find(function(c){return c.id===id})) || null;
      reactionExpression = reactionClip ? reactionClip.defaultExpressionId : id;
      reactionStarted = idleTime;
      reactionDuration = reactionClip ? reactionClip.durationMs + 450 : 2400;
      if (performance && typeof performance.trigger === 'function') {
        try { performance.trigger(id); } catch(e) {}
      }
    }
    applyEmotionToTarget(initialConfig.emotionId || 'NEUTRAL');
    if(initialConfig.reactionId) beginReaction(initialConfig.reactionId);
    if(initialConfig.behaviourId) beginReaction(initialConfig.behaviourId);

    // Blend rig towards target rig
    function blendRig(current, target, rate) {
      for (var k in target) {
        if (typeof target[k] === "number") {
          current[k] += (target[k] - current[k]) * rate;
        } else if (typeof target[k] === "object" && target[k] !== null) {
          blendRig(current[k], target[k], rate);
        }
      }
    }

    var lead = function(current, target, tau, step) {
      return current + (target - current) * (1 - Math.exp(-step / Math.max(tau, 1e-3)));
    };

    function tick(now) {
      frame = null;
      if (initialConfig.active === false || document.hidden) { lastFrame = null; return; }

      var dt = lastFrame === null ? 1 / 60 : (now - lastFrame) / 1000;
      lastFrame = now;
      var step = clamp(dt, 0, 0.05);
      idleTime += step;

      var elapsed = (idleTime - reactionStarted) * 1000;
      bodyPose = {};
      var perfRig = null;
      if (performance) {
        try { perfRig = performance.update(step * 1000, true); } catch(e) {}
      }
      if (reactionExpression && elapsed <= reactionDuration) {
        if (perfRig) {
          targetRig = perfRig;
          if (perfRig.body) {
            bodyPose = {
              x: perfRig.blob ? perfRig.blob.x : 0,
              y: perfRig.blob ? perfRig.blob.y : 0,
              scaleX: perfRig.body ? perfRig.body.scaleX - 1 : 0,
              scaleY: perfRig.body ? perfRig.body.scaleY - 1 : 0,
            };
          }
        } else if(reactionClip) {
          var sample = LCD.sampleClipAt(reactionClip, elapsed);
          bodyPose = initialConfig.reducedMotion ? {} : sample.body;
          applyEmotionToTarget(sample.activeExpressionId);
        } else {
          applyEmotionToTarget(reactionExpression);
        }
      } else {
        reactionExpression = null;
        if (perfRig && (!initialConfig.emotionId || initialConfig.emotionId === 'idle' || initialConfig.emotionId === 'NEUTRAL')) {
          targetRig = perfRig;
        } else {
          applyEmotionToTarget(initialConfig.emotionId || 'NEUTRAL');
        }
      }
      // Blend current facial rig
      blendRig(currentRig, targetRig, 1 - Math.exp(-9 * step));

      // Pointer drag spring physics
      var springK = dragActive ? 180 : 95;
      var springD = dragActive ? 16 : 12;
      var fDragX = -springK * (dragX - dragTargetX) - springD * dragVx;
      var fDragY = -springK * (dragY - dragTargetY) - springD * dragVy;
      dragVx += fDragX * step;
      dragVy += fDragY * step;
      dragX += dragVx * step;
      dragY += dragVy * step;

      // Ambient float and drift
      var ambientX = initialConfig.reducedMotion ? 0 : Math.sin(idleTime * 0.45) * motionConfig.driftAmount;
      var ambientY = initialConfig.reducedMotion ? 0 : Math.sin(idleTime * 0.8) * motionConfig.floatAmount;

      var totalX = dragX + ambientX + (bodyPose.x || 0);
      var totalY = dragY + ambientY + (bodyPose.y || 0);

      var vx = (totalX - prevX) / Math.max(step, 1e-3);
      var vy = (totalY - prevY) / Math.max(step, 1e-3);
      prevX = totalX;
      prevY = totalY;

      var speed = Math.hypot(vx, vy);
      var ax = (vx - prevVx) / Math.max(step, 1e-3);
      var ay = (vy - prevVy) / Math.max(step, 1e-3);
      var acceleration = Math.hypot(ax, ay);
      prevVx = vx;
      prevVy = vy;

      // 3D Turn Intent & Heading
      var predictedVx = vx + ax * 0.09;
      var predictedVy = vy + ay * 0.09;
      var MOVE_FLOOR = 13;
      var intentActive = speed > MOVE_FLOOR;
      var targetIntentX = intentActive ? clamp(predictedVx / 95, -1, 1) : 0;
      var targetIntentY = intentActive ? clamp(predictedVy / 130, -1, 1) : 0;

      // Driver turn offset override from mobile proximity heading
      if (initialConfig.driverYaw) {
        targetIntentX = clamp(targetIntentX + initialConfig.driverYaw, -1, 1);
      }
      if (initialConfig.driverPitch) {
        targetIntentY = clamp(targetIntentY + initialConfig.driverPitch, -1, 1);
      }

      var attack = 0.055;
      var release = 0.34;
      intentX = lead(intentX, targetIntentX, Math.abs(targetIntentX) > Math.abs(intentX) ? attack : release, step);
      intentY = lead(intentY, targetIntentY, Math.abs(targetIntentY) > Math.abs(intentY) ? attack : release, step);

      gazeLeadX = lead(gazeLeadX, intentX * 1.12, 0.045, step);
      gazeLeadY = lead(gazeLeadY, intentY * 0.7, 0.06, step);

      yawIntent = lead(yawIntent, intentX, 0.11, step);
      pitchIntent = lead(pitchIntent, intentY, 0.13, step);

      var desiredYaw = clamp(yawIntent * 26, -26, 26);
      var desiredPitch = clamp(pitchIntent * 15, -16, 16);

      var turnSpringK = 125;
      var turnSpringD = 16.5;
      var fYaw = -turnSpringK * (turnYaw - desiredYaw) - turnSpringD * turnVelYaw;
      turnVelYaw += fYaw * step;
      turnYaw += turnVelYaw * step;

      var fPitch = -turnSpringK * (turnPitch - desiredPitch) - turnSpringD * turnVelPitch;
      turnVelPitch += fPitch * step;
      turnPitch += turnVelPitch * step;

      currentParams.turnYaw = clamp(turnYaw, -45, 45);
      currentParams.turnPitch = clamp(turnPitch, -30, 30);

      var turnGazeX = clamp(gazeLeadX, -1, 1);
      var turnGazeY = clamp(gazeLeadY, -1, 1);
      var turnWeight = Math.min(1, Math.abs(turnGazeX) * 1.35);
      currentParams.gazeX = clamp(currentRig.leftEye.x / 9 * (1 - turnWeight) + turnGazeX, -1, 1);
      currentParams.gazeY = clamp(currentRig.leftEye.y / 7 * (1 - Math.min(1, Math.abs(turnGazeY) * 1.35)) + turnGazeY, -1, 1);

      currentParams.x = totalX;
      currentParams.y = totalY;
      currentParams.scale = currentRig.blob.scale;
      currentParams.rotation = bodyPose.rotation || 0;
      currentParams.squash = bodyPose.squash || 0;
      currentParams.stretch = bodyPose.stretch || 0;
      currentParams.lean = bodyPose.lean || 0;
      currentParams.puff = bodyPose.puff || 0;

      // Step Lobe Physics
      stepLobePhysics(lobeStates, currentParams, motionConfig, vx / currentParams.scale, vy / currentParams.scale, initialConfig.reducedMotion ? 0 : idleTime, step);

      // Mist Trails & Wisps
      var activeWisps = updateWisps(wisps, step, 1, 1);

      if (step > 0) {
        var velEnergy = speed > 95 ? clamp((speed - 95) / 140, 0, 1.3) : 0;
        var accelEnergy = acceleration > 850 ? clamp((acceleration - 850) / 2200, 0, 1.0) : 0;
        var dynamicEnergy = velEnergy + accelEnergy + (dragActive ? 0.8 : 0);

        var idleWisp = false;
        if (!dragActive && speed < 15 && idleTime - lastIdleWisp > 11.0) {
          if (Math.sin(idleTime * 0.65) > 0.985) {
            idleWisp = true;
            lastIdleWisp = idleTime;
          }
        }

        emission = dynamicEnergy > 0 ? emission + dynamicEnergy * 6 * step : (idleWisp ? 1 : 0);
        var cap = dragActive ? 16 : (speed > 160 ? 14 : 6);

        while (emission >= 1 && activeWisps < cap) {
          emission -= 1;
          var speedNorm = Math.max(1, speed);
          var nxVel = speed > 5 ? vx / speedNorm : 0;
          var nyVel = speed > 5 ? vy / speedNorm : -1;

          var seq = sequence++;
          var radiusJitter = ((seq % 4) - 1.5) * 2;
          var puffRadius = (14 + (seq % 3) * 3 + radiusJitter) * currentParams.scale;
          var sideOffset = Math.sin(seq * 2.1) * 26 * currentParams.scale;
          var trailOffset = (72 + (seq % 3) * 14) * currentParams.scale;

          var spawnX = size / 2 + currentParams.x - nxVel * trailOffset - nyVel * sideOffset;
          var spawnY = size / 2 + currentParams.y - nyVel * trailOffset + nxVel * sideOffset;

          var smokeVx = -vx * 0.12 + Math.sin(seq * 2.5) * 10;
          var smokeVy = -vy * 0.12 - 8 + Math.cos(seq * 2.1) * 8;

          spawnWisp(
            wisps,
            spawnX, spawnY,
            smokeVx, smokeVy,
            puffRadius,
            seq % 3 === 0 ? currentPalette.body : currentPalette.edge,
            0.95 * (0.9 + (seq % 3) * 0.15),
            0.42,
            seq
          );
        }
        emission = Math.min(emission, 2);
      }

      // Render Frame
      renderCloudBlob(ctx, {
        size: size,
        renderScale: dpr,
        lobeStates: lobeStates,
        colour: currentPalette,
        wisps: wisps,
        showFace: true,
        rig: currentRig,
        idleTime: initialConfig.reducedMotion ? 0 : idleTime,
        params: currentParams,
        showPupils: initialConfig.showPupils || false,
        vx: vx,
        vy: vy, colourName: "blue", wallAngle: 0, wallScaleX: 1, wallScaleY: 1, safeRadius: 233, debug: false
      });
      var sceneRig = JSON.parse(JSON.stringify(currentRig));
      sceneRig.blob.x = currentParams.x; sceneRig.blob.y = currentParams.y;
      sceneRig.blob.yaw = currentParams.turnYaw;
      sceneRig.body.scaleX = 1 + Math.max(0,currentParams.squash)*.22;
      sceneRig.body.scaleY = 1 + Math.max(0,currentParams.stretch)*.2;
      Scene(ctx,sceneRig,step,initialConfig.reducedMotion ? 0 : idleTime,initialConfig.displayMode||'dark',initialConfig.screenColour||'#000000');
      frame = requestAnimationFrame(tick);
    }

    var frame = requestAnimationFrame(tick);

    // --- TOUCH & POINTER INTERACTIONS ---
    var isTouching = false;
    var touchStartX = 0, touchStartY = 0;

    function getCanvasPoint(clientX, clientY) {
      var rect = canvas.getBoundingClientRect();
      return {
        x: ((clientX - rect.left) / rect.width) * size - size / 2,
        y: ((clientY - rect.top) / rect.height) * size - size / 2
      };
    }

    function onPointerDown(e) {
      if (initialConfig.interactive === false) return;
      var p = getCanvasPoint(e.clientX, e.clientY);
      var dist = Math.hypot(p.x - dragX, p.y - dragY);
      if (dist < 140) {
        isTouching = true;
        dragActive = true;
        touchStartX = p.x - dragX;
        touchStartY = p.y - dragY;
        e.preventDefault();
      }
    }

    function onPointerMove(e) {
      if (!isTouching) return;
      var p = getCanvasPoint(e.clientX, e.clientY);
      dragTargetX = clamp(p.x - touchStartX, -120, 120);
      dragTargetY = clamp(p.y - touchStartY, -120, 120);
      e.preventDefault();
    }

    function onPointerEnd(e) {
      if (!isTouching) return;
      isTouching = false;
      dragActive = false;
      dragTargetX = 0;
      dragTargetY = 0;
    }

    window.addEventListener("pointerdown", onPointerDown, { passive: false });
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerEnd);
    window.addEventListener("pointercancel", onPointerEnd);

    // --- WINDOW BRIDGE API ---
    window.updateCloudProps = function(props) {
      if (!props) return;
      if (props.screenColour) { initialConfig.screenColour=props.screenColour; document.body.style.background = props.screenColour; }
      if(props.displayMode) initialConfig.displayMode=props.displayMode;
      if (props.active !== undefined) {
        initialConfig.active = props.active;
        if(props.active && frame===null) frame=requestAnimationFrame(tick);
      }
      if (props.reducedMotion !== undefined) initialConfig.reducedMotion = props.reducedMotion;
      if (props.reactionToken !== undefined && props.reactionToken !== initialConfig.reactionToken) {
        initialConfig.reactionToken = props.reactionToken;
        if(props.reactionId) beginReaction(props.reactionId);
        if(props.behaviourId) beginReaction(props.behaviourId);
      } else if (props.behaviourId) {
        beginReaction(props.behaviourId);
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
      if(props.state && props.state !== initialConfig.state) {
        initialConfig.state=props.state;
        var stateConfig=LCD.STATE_EMOTION_MAP[props.state];
        if(props.state!=='HOME' && stateConfig) beginReaction(stateConfig.performanceId);
        else {reactionExpression=null;reactionClip=null;}
      }
      if (props.emotionId) {
        initialConfig.emotionId = props.emotionId;
        applyEmotionToTarget(props.emotionId);
      }
      if (props.driverYaw !== undefined) {
        initialConfig.driverYaw = props.driverYaw;
      }
      if (props.driverPitch !== undefined) {
        initialConfig.driverPitch = props.driverPitch;
      }
      if (props.showPupils !== undefined) {
        initialConfig.showPupils = props.showPupils;
      }
      if (props.interactive !== undefined) {
        initialConfig.interactive = props.interactive;
      }
    };

    document.addEventListener('visibilitychange', function(){if(!document.hidden && frame===null && initialConfig.active!==false) frame=requestAnimationFrame(tick);});
    window.addEventListener('pagehide', function(){ cancelAnimationFrame(frame); });

    function handleBridgeMessage(event) {
      try {
        var data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (!data) return;
        if (data.type === "dragStart" || data.type === "dragMove") {
          dragActive = true;
          isTouching = true;
          dragTargetX = clamp(data.x, -140, 140);
          dragTargetY = clamp(data.y, -140, 140);
          return;
        }
        if (data.type === "dragEnd") {
          dragActive = false;
          isTouching = false;
          dragTargetX = 0;
          dragTargetY = 0;
          return;
        }
        window.updateCloudProps(data);
      } catch (e) {}
    }
    window.addEventListener("message", handleBridgeMessage);
    document.addEventListener("message", handleBridgeMessage);

  })();
  </script>
</body>
</html>`;
}
