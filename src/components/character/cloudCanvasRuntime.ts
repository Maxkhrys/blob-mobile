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

import { CloudColourConfig } from '../../domain/character/types';

export interface CloudRuntimeConfig {
  palette: CloudColourConfig;
  state?: string;
  emotionId?: string;
  driverYaw?: number;
  driverPitch?: number;
  showPupils?: boolean;
  size?: number;
  interactive?: boolean;
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
    var initialConfig = ${initialJson};

    var TAU = Math.PI * 2;
    var DEPTH_UNIT = 34;
    var FACE_RADIUS = 96;
    var BODY_FRACTION = 0.535;
    var BROW_CLEARANCE_RATIO = 2.4 / 466;
    var GAZE_TRAVEL_X = 0.28;
    var GAZE_TRAVEL_Y = 0.13;

    function clamp(v, a, b) {
      return Math.max(a, Math.min(b, v));
    }

    function parseHexColor(hex) {
      var clean = hex.replace("#", "");
      var full = clean.length === 3
        ? clean.split("").map(function(c) { return c + c; }).join("")
        : clean;
      var value = /^[\\da-f]{6}$/i.test(full) ? parseInt(full, 16) : 0xd8e6ff;
      return { r: value >> 16, g: (value >> 8) & 255, b: value & 255 };
    }

    function rgba(c, a) {
      return "rgba(" + c.r + "," + c.g + "," + c.b + "," + a + ")";
    }

    // --- GEOMETRY & DEFINITIONS ---
    var LOBE_DEFINITIONS = [
      { id: "bottomBelly", baseX: 0, baseY: 76, radiusX: 90, radiusY: 52, baseOpacity: 0.9, lagFactor: 0.88, stiffness: 95, damping: 11.5, breathPhase: 3.1, breathAmp: 0.05, depth: -1 },
      { id: "baseLeft", baseX: -92, baseY: 56, radiusX: 68, radiusY: 54, baseOpacity: 0.88, lagFactor: 0.72, stiffness: 110, damping: 12.0, breathPhase: 2.4, breathAmp: 0.045, depth: -1 },
      { id: "baseRight", baseX: 96, baseY: 54, radiusX: 72, radiusY: 56, baseOpacity: 0.88, lagFactor: 0.76, stiffness: 105, damping: 12.0, breathPhase: 3.8, breathAmp: 0.04, depth: -1 },
      { id: "core", baseX: 0, baseY: 4, radiusX: 94, radiusY: 74, baseOpacity: 0.98, lagFactor: 0.18, stiffness: 180, damping: 17.5, breathPhase: 0, breathAmp: 0.035, depth: 0 },
      { id: "leftCheek", baseX: -84, baseY: -10, radiusX: 66, radiusY: 58, baseOpacity: 0.94, lagFactor: 0.45, stiffness: 140, damping: 14.5, breathPhase: 0.8, breathAmp: 0.045, depth: 1 },
      { id: "rightCheek", baseX: 84, baseY: -10, radiusX: 66, radiusY: 58, baseOpacity: 0.94, lagFactor: 0.45, stiffness: 140, damping: 14.5, breathPhase: 1.6, breathAmp: 0.045, depth: 1 },
      { id: "topCrown", baseX: 0, baseY: -82, radiusX: 76, radiusY: 54, baseOpacity: 0.94, lagFactor: 0.58, stiffness: 130, damping: 13.5, breathPhase: 1.2, breathAmp: 0.04, depth: 2 },
      { id: "frontVeil", baseX: 0, baseY: 2, radiusX: 78, radiusY: 62, baseOpacity: 0.22, lagFactor: 0.14, stiffness: 190, damping: 18.0, breathPhase: 0, breathAmp: 0.025, depth: 10 }
    ];

    var LOBE_SUB_PUFFS = {
      topCrown: [
        { offsetX: -28, offsetY: -12, radiusRatio: 0.62, phaseOffset: 0.4 },
        { offsetX: 30, offsetY: -10, radiusRatio: 0.60, phaseOffset: 1.1 }
      ],
      leftCheek: [
        { offsetX: -24, offsetY: 10, radiusRatio: 0.58, phaseOffset: 0.8 }
      ],
      rightCheek: [
        { offsetX: 24, offsetY: 10, radiusRatio: 0.58, phaseOffset: 1.5 }
      ],
      baseLeft: [
        { offsetX: -16, offsetY: 18, radiusRatio: 0.52, phaseOffset: 2.1 }
      ],
      baseRight: [
        { offsetX: 16, offsetY: 18, radiusRatio: 0.52, phaseOffset: 2.7 }
      ]
    };

    var SUSPENDED_DROPLETS = [
      { x: -36, y: -28, radius: 2.8, driftSpeed: 0.7, driftPhase: 0.0, brightness: 0.8 },
      { x: 42, y: -22, radius: 2.2, driftSpeed: 0.9, driftPhase: 1.8, brightness: 0.75 },
      { x: -52, y: 18, radius: 2.4, driftSpeed: 0.8, driftPhase: 3.4, brightness: 0.7 },
      { x: 48, y: 24, radius: 2.6, driftSpeed: 0.65, driftPhase: 4.9, brightness: 0.7 },
      { x: -8, y: -48, radius: 2.0, driftSpeed: 1.1, driftPhase: 0.9, brightness: 0.65 },
      { x: 12, y: 44, radius: 2.5, driftSpeed: 0.75, driftPhase: 2.7, brightness: 0.6 },
      { x: -22, y: 36, radius: 1.8, driftSpeed: 1.0, driftPhase: 5.2, brightness: 0.55 },
      { x: 30, y: -42, radius: 1.9, driftSpeed: 0.85, driftPhase: 3.9, brightness: 0.5 }
    ];

    var FACE_PLACEMENT = {
      leftEye: { dx: -0.158, dy: -0.038, scale: 0.305, width: 281, height: 409 },
      rightEye: { dx: 0.163, dy: -0.034, scale: 0.305, width: 285, height: 426 },
      mouth: { dx: 0.003, dy: 0.114, scale: 0.238, width: 440, height: 176 }
    };

    function faceAnchor(id, screen) {
      var p = FACE_PLACEMENT[id];
      var bodyW = screen * BODY_FRACTION;
      var solidW = 598;
      var s = (bodyW / solidW) * p.scale;
      return {
        x: screen / 2 + p.dx * bodyW,
        y: screen / 2 + p.dy * bodyW,
        width: p.width * s,
        height: p.height * s
      };
    }

    // --- STAMP CACHE SYSTEM ---
    var stampCaches = {};

    function sprite(paint, size) {
      size = size || 128;
      var canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      var ctx = canvas.getContext("2d");
      ctx.translate(size / 2, size / 2);
      ctx.scale(size / 2, size / 2);
      paint(ctx);
      return canvas;
    }

    function getStamps(c, p) {
      var key = c.body + "|" + c.edge + "|" + c.coreTint + "|" + c.innerGlow + "|" + p.lightAngle + "|" + p.lightStrength + "|" + c.translucency + "|v2";
      if (stampCaches[key]) return stampCaches[key];

      var body = parseHexColor(c.body);
      var edge = parseHexColor(c.edge);
      var core = parseHexColor(c.coreTint);
      var rad = (p.lightAngle * Math.PI) / 180;
      var lx = Math.cos(rad);
      var ly = Math.sin(rad);

      var makeMass = function(dense) {
        return sprite(function(s) {
          var volume = s.createRadialGradient(lx * 0.28, ly * 0.28, 0.02, 0, 0, 1);
          volume.addColorStop(0, rgba(edge, 1));
          volume.addColorStop(0.48, rgba(body, dense ? 1 : 0.98));
          volume.addColorStop(0.78, rgba(body, dense ? 0.96 : 0.9));
          volume.addColorStop(0.92, rgba(body, 0.42 * c.translucency));
          volume.addColorStop(1, rgba(body, 0));
          s.fillStyle = volume;
          s.fillRect(-1, -1, 2, 2);

          s.globalCompositeOperation = "source-atop";
          var shade = s.createLinearGradient(lx, ly, -lx, -ly);
          shade.addColorStop(0, "rgba(255,255,255,0)");
          shade.addColorStop(0.35, "rgba(255,255,255,0)");
          shade.addColorStop(0.58, rgba(core, p.lightStrength * 0.22));
          shade.addColorStop(0.84, rgba(core, p.lightStrength * 0.62));
          shade.addColorStop(1.0, rgba(core, p.lightStrength * 0.82));
          s.fillStyle = shade;
          s.fillRect(-1, -1, 2, 2);
        });
      };

      var makeRearMass = function() {
        return sprite(function(s) {
          var volume = s.createRadialGradient(lx * 0.22, ly * 0.22, 0.04, 0, 0, 1);
          volume.addColorStop(0, rgba(edge, 0.92));
          volume.addColorStop(0.35, rgba(body, 0.92));
          volume.addColorStop(0.68, rgba(body, 0.82));
          volume.addColorStop(0.88, rgba(body, 0.38 * c.translucency));
          volume.addColorStop(1, rgba(body, 0));
          s.fillStyle = volume;
          s.fillRect(-1, -1, 2, 2);

          s.globalCompositeOperation = "source-atop";
          var shade = s.createLinearGradient(lx, ly, -lx, -ly);
          shade.addColorStop(0, "rgba(255,255,255,0.15)");
          shade.addColorStop(0.45, "rgba(255,255,255,0)");
          shade.addColorStop(0.8, rgba(core, p.lightStrength * 0.45));
          shade.addColorStop(1.0, rgba(core, p.lightStrength * 0.65));
          s.fillStyle = shade;
          s.fillRect(-1, -1, 2, 2);
        });
      };

      var makeCrevice = function() {
        return sprite(function(s) {
          var g = s.createRadialGradient(0, 0, 0, 0, 0, 1);
          g.addColorStop(0, rgba(core, clamp(p.lightStrength * 0.42, 0.22, 0.52)));
          g.addColorStop(0.42, rgba(core, clamp(p.lightStrength * 0.24, 0.1, 0.32)));
          g.addColorStop(0.78, rgba(core, 0.03));
          g.addColorStop(1, rgba(core, 0));
          s.fillStyle = g;
          s.fillRect(-1, -1, 2, 2);
        }, 64);
      };

      var makeUnderside = function() {
        return sprite(function(s) {
          var g = s.createRadialGradient(0, 0.2, 0.1, 0, 0, 1);
          g.addColorStop(0, rgba(core, 0.32));
          g.addColorStop(0.55, rgba(core, 0.12));
          g.addColorStop(1, rgba(core, 0));
          s.fillStyle = g;
          s.fillRect(-1, -1, 2, 2);
        }, 128);
      };

      var soft = function(color, middle) {
        return sprite(function(s) {
          var rgb = parseHexColor(color);
          var g = s.createRadialGradient(0, 0, 0, 0, 0, 1);
          g.addColorStop(0, rgba(rgb, 1));
          g.addColorStop(0.4, rgba(rgb, middle));
          g.addColorStop(1, rgba(rgb, 0));
          s.fillStyle = g;
          s.fillRect(-1, -1, 2, 2);
        }, 64);
      };

      var stamps = {
        mass: makeMass(false),
        rearMass: makeRearMass(),
        crevice: makeCrevice(),
        underside: makeUnderside(),
        core: sprite(function(s) {
          var g = s.createRadialGradient(lx * 0.28, ly * 0.28, 0.02, 0, 0, 1);
          g.addColorStop(0, rgba(edge, 1));
          g.addColorStop(0.5, rgba(body, 0.96));
          g.addColorStop(0.78, rgba(body, 0.56));
          g.addColorStop(1, rgba(body, 0));
          s.fillStyle = g;
          s.fillRect(-1, -1, 2, 2);
          s.globalCompositeOperation = "source-atop";
          var shade = s.createLinearGradient(lx, ly, -lx, -ly);
          shade.addColorStop(0, "rgba(255,255,255,0)");
          shade.addColorStop(0.45, "rgba(255,255,255,0)");
          shade.addColorStop(0.72, rgba(core, p.lightStrength * 0.35));
          shade.addColorStop(1.0, rgba(core, p.lightStrength * 0.58));
          s.fillStyle = shade;
          s.fillRect(-1, -1, 2, 2);
        }),
        mist: soft(c.edge, 0.42),
        smoke: sprite(function(s) {
          var g = s.createRadialGradient(0, 0, 0, 0, 0, 1);
          g.addColorStop(0, rgba(edge, 0.92));
          g.addColorStop(0.28, rgba(body, 0.76));
          g.addColorStop(0.6, rgba(body, 0.38));
          g.addColorStop(0.85, rgba(edge, 0.1));
          g.addColorStop(1, rgba(body, 0));
          s.fillStyle = g;
          s.fillRect(-1, -1, 2, 2);
        }, 64),
        glow: soft(c.innerGlow, 0.3),
        shadow: soft("#080b10", 0.42)
      };

      stampCaches[key] = stamps;
      return stamps;
    }

    function stamp(ctx, image, x, y, rx, ry, alpha, rotation) {
      rotation = rotation || 0;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.globalAlpha *= clamp(alpha, 0, 1);
      ctx.drawImage(image, -rx, -ry, rx * 2, ry * 2);
      ctx.restore();
    }

    // --- WISPS & MIST TRAILS ---
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

    // --- LOBE PHYSICS ---
    function createLobeStates() {
      var states = {};
      for (var i = 0; i < LOBE_DEFINITIONS.length; i++) {
        var def = LOBE_DEFINITIONS[i];
        states[def.id] = {
          x: def.baseX, y: def.baseY,
          vx: 0, vy: 0,
          scaleX: 1, scaleY: 1,
          opacity: def.baseOpacity, rotation: 0
        };
      }
      return states;
    }

    function computeLobeTarget(def, params, motion, cvx, cvy, idleTime) {
      var puff = params.puff || 0;
      var squash = params.squash || 0;
      var stretch = params.stretch || 0;
      var lean = params.lean || 0;

      var tx = def.baseX;
      var ty = def.baseY;

      var calm = 0.35 + 0.65 * Math.pow(Math.sin(idleTime * 0.16), 2);
      var breathCycle = Math.sin(idleTime * 1.2 + def.breathPhase) * def.breathAmp * calm;
      var breathScale = 1 + breathCycle;

      if (squash > 0) {
        if (def.id === "topCrown") ty += squash * 24;
        else if (def.id === "baseLeft") { tx -= squash * 18; ty += squash * 8; }
        else if (def.id === "baseRight") { tx += squash * 18; ty += squash * 8; }
        else if (def.id === "bottomBelly") ty += squash * 12;
        else if (def.id === "leftCheek" || def.id === "rightCheek") {
          tx += (def.id === "leftCheek" ? -1 : 1) * squash * 12;
          ty += squash * 10;
        }
      }

      if (stretch > 0) {
        if (def.id === "topCrown") ty -= stretch * 30;
        else if (def.id === "bottomBelly") ty -= stretch * 10;
        else if (def.id === "baseLeft" || def.id === "baseRight") tx *= (1 - stretch * 0.16);
        else if (def.id === "leftCheek" || def.id === "rightCheek") {
          tx *= (1 - stretch * 0.14);
          ty -= stretch * 16;
        }
      }

      if (Math.abs(lean) > 0.001) {
        var leanRatio = lean / 30;
        if (def.id === "topCrown") { tx += leanRatio * 28; ty += Math.abs(leanRatio) * 4; }
        else if (def.id === "leftCheek" || def.id === "rightCheek") tx += leanRatio * 20;
        else if (def.id === "baseLeft") tx += (leanRatio > 0 ? -leanRatio * 8 : leanRatio * 16);
        else if (def.id === "baseRight") tx += (leanRatio < 0 ? -leanRatio * 8 : leanRatio * 16);
      }

      var turnYaw = params.turnYaw || 0;
      var turnPitch = params.turnPitch || 0;
      var yawRatio = clamp(turnYaw / 28, -1, 1);
      var pitchRatio = clamp(turnPitch / 18, -1, 1);

      if (Math.abs(yawRatio) > 0.01 || Math.abs(pitchRatio) > 0.01) {
        if (def.id === "topCrown") { tx += yawRatio * 20; ty += pitchRatio * 10; }
        else if (def.id === "leftCheek") { tx += (yawRatio < 0 ? yawRatio * 14 : yawRatio * 18); ty += pitchRatio * 6; }
        else if (def.id === "rightCheek") { tx += (yawRatio > 0 ? yawRatio * 14 : yawRatio * 18); ty += pitchRatio * 6; }
        else if (def.id === "bottomBelly") { tx -= yawRatio * 8; ty += pitchRatio * 10; }
        else if (def.id === "baseLeft") tx += (yawRatio < 0 ? yawRatio * 8 : yawRatio * 12);
        else if (def.id === "baseRight") tx += (yawRatio > 0 ? yawRatio * 8 : yawRatio * 12);
      }

      var lagStrength = def.lagFactor * motion.lobeLag * 0.09;
      var maxLobeOffset = def.radiusX * 0.48;
      tx -= clamp(cvx * lagStrength, -maxLobeOffset, maxLobeOffset);
      ty -= clamp(cvy * lagStrength, -maxLobeOffset, maxLobeOffset);

      var sx = breathScale * (1 + puff * 0.3);
      var sy = breathScale * (1 + puff * 0.3);
      var isCore = def.id === "core" || def.id === "frontVeil";

      if (squash > 0) {
        sx *= (1 + squash * 0.3 * (isCore ? 0.22 : 0.8));
        sy *= (1 - squash * 0.24 * (isCore ? 0.22 : 0.8));
      }
      if (stretch > 0) {
        sx *= (1 - stretch * 0.2 * (isCore ? 0.22 : 0.85));
        sy *= (1 + stretch * 0.36 * (isCore ? 0.22 : 0.85));
      }

      var rot = (lean * 0.38 * (1 - def.lagFactor * 0.45) * Math.PI) / 180;
      var opacity = def.baseOpacity * (1 - puff * 0.12);

      return {
        targetX: tx, targetY: ty,
        targetScaleX: sx, targetScaleY: sy,
        targetOpacity: opacity, targetRotation: rot
      };
    }

    function stepLobePhysics(states, params, motion, cvx, cvy, idleTime, dt) {
      var clampedDt = clamp(dt, 0, 0.05);
      var steps = Math.max(1, Math.ceil(clampedDt * 120));
      var h = clampedDt / steps;

      for (var i = 0; i < LOBE_DEFINITIONS.length; i++) {
        var def = LOBE_DEFINITIONS[i];
        var state = states[def.id];
        if (!state) continue;

        var t = computeLobeTarget(def, params, motion, cvx, cvy, idleTime);
        var stiffness = def.stiffness * (motion.springStiffness / 145);
        var damping = def.damping * (motion.springDamping / 14.5);

        for (var j = 0; j < steps; j++) {
          var fx = -stiffness * (state.x - t.targetX) - damping * state.vx;
          state.vx += fx * h;
          state.x += state.vx * h;

          var fy = -stiffness * (state.y - t.targetY) - damping * state.vy;
          state.vy += fy * h;
          state.y += state.vy * h;
        }

        var rate = 1 - Math.exp(-12 * clampedDt);
        state.scaleX += (t.targetScaleX - state.scaleX) * rate;
        state.scaleY += (t.targetScaleY - state.scaleY) * rate;
        state.opacity += (t.targetOpacity - state.opacity) * rate;
        state.rotation += (t.targetRotation - state.rotation) * rate;
      }
    }

    // --- FACE RENDERER & 3D PROJECTION ---
    function projectFeature(ox, oy, yawRad, pitchRad) {
      var theta = Math.asin(clamp(ox / FACE_RADIUS, -1, 1));
      var turned = theta + yawRad;
      var x = FACE_RADIUS * Math.sin(turned);
      var facing = Math.cos(turned);

      var phi = Math.asin(clamp(oy / FACE_RADIUS, -1, 1));
      var turnedY = phi + pitchRad;
      var y = FACE_RADIUS * Math.sin(turnedY);

      return { x: x, y: y, facing: clamp(facing, -1, 1) };
    }

    function eyeGeometry(anchorWidth, anchorHeight, t) {
      var socketScaleX = clamp(t.eyeSocketScaleX, 0.72, 1.35);
      var socketScaleY = clamp(t.eyeSocketScaleY, 0.72, 1.35);
      var socketWidth = anchorWidth * socketScaleX;
      var socketHeight = anchorHeight * socketScaleY;
      var width = socketWidth * 0.86;
      var height = socketHeight * 0.96;
      var gazeX = clamp(t.x, -socketWidth * 0.26, socketWidth * 0.26);
      var gazeY = clamp(t.y, -socketHeight * 0.2, socketHeight * 0.14);

      return {
        width: width,
        height: height,
        centerX: clamp(gazeX, -width * GAZE_TRAVEL_X, width * GAZE_TRAVEL_X),
        centerY: clamp(gazeY * 0.72, -height * GAZE_TRAVEL_Y, height * GAZE_TRAVEL_Y),
        open: clamp(t.eyeOpen, 0, 1)
      };
    }

    var scratchCanvas = null;
    var scratchCtx = null;
    function acquireScratch(width, height) {
      if (!scratchCanvas) {
        scratchCanvas = document.createElement("canvas");
        scratchCtx = scratchCanvas.getContext("2d");
      }
      if (scratchCanvas.width < width || scratchCanvas.height < height) {
        scratchCanvas.width = Math.max(scratchCanvas.width, width);
        scratchCanvas.height = Math.max(scratchCanvas.height, height);
      }
      scratchCtx.setTransform(1, 0, 0, 1, 0, 0);
      scratchCtx.clearRect(0, 0, width, height);
      scratchCtx.globalCompositeOperation = "source-over";
      return scratchCtx;
    }

    function drawSupersampled(ctx, bounds, paint) {
      var ss = 2;
      var bufferW = Math.max(1, Math.ceil(bounds.width * ss));
      var bufferH = Math.max(1, Math.ceil(bounds.height * ss));
      var s = acquireScratch(bufferW, bufferH);
      if (!s) return false;

      s.save();
      s.scale(ss, ss);
      s.translate(-bounds.x, -bounds.y);
      paint(s);
      s.restore();

      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(scratchCanvas, 0, 0, bufferW, bufferH, bounds.x, bounds.y, bounds.width, bounds.height);
      ctx.restore();
      return true;
    }

    function drawProceduralEye(ctx, eye, showPupil, pupilX, pupilY, pupilScale, lidBias) {
      if (eye.open <= 0.004) return;
      var gap = eye.height * eye.open;
      var top = eye.centerY - gap / 2;
      var bottom = eye.centerY + gap / 2;
      var lidTilt = clamp(lidBias || 0, -1, 1) * eye.height * 0.16;

      var band = new Path2D();
      band.moveTo(eye.centerX - eye.width, top + lidTilt);
      band.quadraticCurveTo(eye.centerX, top - lidTilt * 0.22, eye.centerX + eye.width, top - lidTilt);
      band.lineTo(eye.centerX + eye.width, bottom - lidTilt);
      band.quadraticCurveTo(eye.centerX, bottom + lidTilt * 0.18, eye.centerX - eye.width, bottom + lidTilt);
      band.closePath();

      var mass = new Path2D();
      mass.ellipse(eye.centerX, eye.centerY, eye.width * 0.5, eye.height * 0.5, 0, 0, TAU);

      var pad = 2;
      var painted = drawSupersampled(ctx, {
        x: eye.centerX - eye.width - pad,
        y: eye.centerY - eye.height - pad,
        width: eye.width * 2 + pad * 2,
        height: eye.height * 2 + pad * 2
      }, function(target) {
        target.fillStyle = "#010204";
        target.fill(band);
        target.globalCompositeOperation = "source-in";
        target.fill(mass);

        if (showPupil) {
          target.globalCompositeOperation = "source-atop";
          target.beginPath();
          target.arc(
            eye.centerX + clamp(pupilX || 0, -eye.width * 0.22, eye.width * 0.22),
            eye.centerY + clamp(pupilY || 0, -eye.height * 0.16, eye.height * 0.16),
            Math.max(0.8, Math.min(1.7, eye.width * 0.06 * clamp(pupilScale || 1, 0.55, 1.45))),
            0,
            TAU
          );
          target.fillStyle = "rgba(255, 255, 255, 0.9)";
          target.fill();
        }
      });

      if (!painted) {
        ctx.save();
        ctx.clip(band);
        ctx.fillStyle = "#010204";
        ctx.fill(mass);
        ctx.restore();
      }
    }

    function drawEyebrow(ctx, eye, browLift, browRotation, clearance) {
      var halfWidth = eye.width * 0.46;
      var thickness = clamp(eye.width * 0.13, 1.6, 2.8);
      var halfThickness = thickness / 2;
      var arch = clamp((browLift + 0.05) * eye.height * 0.22, -1.2, 1.4);

      var look = clamp(eye.centerX / Math.max(eye.width * GAZE_TRAVEL_X, 0.001), -1, 1);
      var offsetX = eye.centerX * 0.18;
      var tilt = clamp(look * 4.5 + (browRotation || 0), -11, 11);
      var radians = (tilt * Math.PI) / 180;

      var eyeTop = eye.centerY - eye.height * 0.5;
      var browY = eyeTop - eye.height * 0.2 - (browLift || 0) * eye.height * 0.22 + eye.centerY * 0.1;
      var reach = halfThickness * Math.abs(Math.cos(radians)) + (halfWidth + halfThickness) * Math.abs(Math.sin(radians)) + Math.max(0, -arch);
      browY = Math.min(browY, eyeTop - clearance - reach);

      ctx.save();
      ctx.translate(offsetX, browY);
      ctx.rotate(radians);
      var controlY = -arch;
      ctx.beginPath();
      ctx.moveTo(-halfWidth, -halfThickness);
      ctx.quadraticCurveTo(0, controlY - halfThickness, halfWidth, -halfThickness);
      ctx.quadraticCurveTo(halfWidth + halfThickness, -halfThickness, halfWidth + halfThickness, 0);
      ctx.quadraticCurveTo(halfWidth + halfThickness, halfThickness, halfWidth, halfThickness);
      ctx.quadraticCurveTo(0, controlY + halfThickness, -halfWidth, halfThickness);
      ctx.quadraticCurveTo(-halfWidth - halfThickness, halfThickness, -halfWidth - halfThickness, 0);
      ctx.quadraticCurveTo(-halfWidth - halfThickness, -halfThickness, -halfWidth, -halfThickness);
      ctx.closePath();
      ctx.fillStyle = "#010204";
      ctx.fill();
      ctx.restore();
    }

    function fillMouth(ctx, path, height, midStop, bounds) {
      var surface = function(target) {
        var gradient = target.createLinearGradient(0, -height, 0, height);
        gradient.addColorStop(0, "#020203");
        gradient.addColorStop(midStop, "#050506");
        gradient.addColorStop(1, "#182a3a");
        return gradient;
      };

      var painted = drawSupersampled(ctx, bounds, function(target) {
        target.fillStyle = surface(target);
        target.fill(path);
      });
      if (painted) return;

      ctx.fillStyle = surface(ctx);
      ctx.fill(path);
    }

    function drawMouthShape(ctx, width, height, curve, oAmount, dAmount, cAmount) {
      var o = clamp(oAmount || 0, 0, 1);
      var d = clamp(dAmount || 0, 0, 1);
      var c = clamp(cAmount || 0, 0, 1);

      if (d > 0.02) {
        var halfWidth = width * (0.48 - o * 0.06);
        var top = -height * (0.18 + curve * 0.035);
        var bottom = height * (0.16 + d * 0.62 + o * 0.08);
        var corner = height * (0.06 + d * 0.06);
        var path = new Path2D();
        path.moveTo(-halfWidth, top);
        path.quadraticCurveTo(0, top - height * 0.035, halfWidth, top);
        path.lineTo(halfWidth, bottom - corner);
        path.bezierCurveTo(halfWidth * 0.96, bottom + height * 0.03, halfWidth * 0.48, bottom + height * 0.075, 0, bottom + height * 0.045);
        path.bezierCurveTo(-halfWidth * 0.48, bottom + height * 0.075, -halfWidth * 0.96, bottom + height * 0.03, -halfWidth, bottom - corner);
        path.closePath();

        fillMouth(ctx, path, height, 0.72, {
          x: -halfWidth - height * 0.25,
          y: top - height * 0.2,
          width: halfWidth * 2 + height * 0.5,
          height: bottom - top + height * 0.4
        });
        return;
      }

      var crescentWidth = width * (0.42 + c * 0.04);
      var neutralWidth = width * (0.5 - o * 0.08);
      var halfW = (1 - c) * neutralWidth + c * crescentWidth;

      var baseThickness = Math.max(1.8, height * (0.2 + o * 0.045));
      var loopDepth = height * 0.42 * o;
      var bend = curve * height * 0.5 * (1 - o);
      var endY = -curve * height * 0.08 * (1 - o);

      var cornerThickness = baseThickness * (1 - c);
      var cornerReach = Math.max(0, baseThickness * 1.35 * (1 - c));
      var topEnd = endY - cornerThickness;
      var bottomEnd = endY + cornerThickness;

      var neutralTopCenter = endY + bend - baseThickness - loopDepth;
      var crescentTopCenter = endY + bend * 0.18 - cornerThickness * 0.4;
      var topCenter = (1 - c) * neutralTopCenter + c * crescentTopCenter;

      var neutralBottomCenter = endY + bend + baseThickness + loopDepth;
      var crescentBottomCenter = endY + bend * 0.28 + height * (0.46 + c * 0.28);
      var bottomCenter = (1 - c) * neutralBottomCenter + c * crescentBottomCenter;

      var mpath = new Path2D();
      mpath.moveTo(-halfW, topEnd);
      mpath.quadraticCurveTo(0, topCenter, halfW, topEnd);

      if (c < 0.96) {
        mpath.bezierCurveTo(halfW + cornerReach, topEnd, halfW + cornerReach, bottomEnd, halfW, bottomEnd);
      } else {
        mpath.lineTo(halfW, bottomEnd);
      }

      mpath.quadraticCurveTo(0, bottomCenter, -halfW, bottomEnd);

      if (c < 0.96) {
        mpath.bezierCurveTo(-halfW - cornerReach, bottomEnd, -halfW - cornerReach, topEnd, -halfW, topEnd);
      } else {
        mpath.closePath();
      }

      var spanTop = Math.min(topEnd, topCenter) - 2;
      var spanBottom = Math.max(bottomEnd, bottomCenter) + 2;
      fillMouth(ctx, mpath, height, 0.7, {
        x: -halfW - cornerReach - 2,
        y: spanTop,
        width: (halfW + cornerReach + 2) * 2,
        height: spanBottom - spanTop
      });
    }

    function drawFace(ctx, o, stamps) {
      var size = o.size;
      var rig = o.rig;
      var p = o.params;
      var core = o.lobeStates.core;

      var yaw = clamp(p.turnYaw || 0, -45, 45);
      var pitch = clamp(p.turnPitch || 0, -30, 30);
      var yawRad = (yaw * Math.PI) / 180;
      var pitchRad = (pitch * Math.PI) / 180;
      var yawSin = Math.sin(yawRad);
      var pitchSin = Math.sin(pitchRad);

      var faceTurnX = yawSin * 30;
      var faceTurnY = pitchSin * 20 - Math.abs(yawSin) * 5;
      var faceYawWidth = clamp(0.82 + Math.cos(yawRad) * 0.18, 0.72, 1);
      var facePitchHeight = clamp(0.88 + Math.abs(Math.cos(pitchRad)) * 0.12, 0.86, 1);

      var profileAmount = Math.max(0, Math.abs(yawSin) - 0.78);
      var faceVisibility = clamp(1 - profileAmount * 2.0, 0.35, 1);

      ctx.save();
      ctx.translate(core.x + faceTurnX, core.y - 6 + faceTurnY);
      ctx.rotate(core.rotation * 0.65 + yawSin * 0.08);
      ctx.scale(
        (1 + (core.scaleX - 1) * 0.56) * 1.02 * faceYawWidth,
        (1 + (core.scaleY - 1) * 0.56) * 1.02 * facePitchHeight
      );
      ctx.globalAlpha *= faceVisibility;

      // Render Eyes
      var eyeIds = ["leftEye", "rightEye"];
      for (var i = 0; i < eyeIds.length; i++) {
        var id = eyeIds[i];
        var a = faceAnchor(id, size);
        var t = Object.assign({}, rig[id]);
        var isLeft = id === "leftEye";

        var baseX = a.x - size / 2;
        var baseY = a.y - size / 2;
        var projected = projectFeature(baseX, baseY, yawRad, pitchRad);

        var facing = clamp(projected.facing, 0.2, 1);
        var restFacing = Math.cos(Math.asin(clamp(baseX / FACE_RADIUS, -1, 1)));
        var prominence = clamp(facing / Math.max(restFacing, 0.2), 0.6, 1.25);

        var eyeScaleX = clamp(0.82 + (prominence - 1) * 0.55, 0.82, 1.1);
        var eyeScaleY = clamp(0.95 + (prominence - 1) * 0.18, 0.95, 1.06);
        var eyeOpenMod = clamp(0.92 + (prominence - 1) * 0.3, 0.9, 1.12);
        var eyeAlphaMod = clamp(0.84 + (prominence - 1) * 0.5, 0.84, 1);
        var browAngleMod = (isLeft ? 1 : -1) * yawSin * 4;

        t.eyeOpen *= eyeOpenMod;
        var eye = eyeGeometry(a.width * eyeScaleX, a.height * eyeScaleY, t);

        var gazeTravelX = eye.width * 0.33;
        var gazeTravelY = eye.height * 0.16;
        eye.centerX = clamp(eye.centerX + p.gazeX * gazeTravelX, -gazeTravelX, gazeTravelX);
        eye.centerY = clamp(eye.centerY + p.gazeY * gazeTravelY, -gazeTravelY, gazeTravelY);

        ctx.save();
        ctx.translate(projected.x, projected.y);
        ctx.globalAlpha *= t.opacity * eyeAlphaMod;

        // Brow
        ctx.save();
        ctx.globalAlpha *= 0.88;
        drawEyebrow(ctx, eye, t.browLift, t.browRotation + browAngleMod, size * BROW_CLEARANCE_RATIO);
        ctx.restore();

        // Eye oval
        ctx.rotate((t.rotation * Math.PI) / 180);
        drawProceduralEye(ctx, eye, o.showPupils || false, t.pupilX, t.pupilY, t.pupilScale, t.lidBias);
        ctx.restore();
      }

      // Render Mouth
      var ma = faceAnchor("mouth", size);
      var mt = rig.mouth;
      var mouthProjected = projectFeature(ma.x - size / 2, ma.y - size / 2, yawRad, pitchRad);
      var mouthPerspX = clamp(0.86 + Math.cos(yawRad) * 0.14, 0.82, 1);

      ctx.save();
      ctx.translate(mouthProjected.x + mt.x + yawSin * 5, mouthProjected.y + mt.y);
      ctx.globalAlpha *= mt.opacity;
      drawMouthShape(
        ctx,
        ma.width * 0.95 * clamp(mt.scaleX * mouthPerspX, 0.55, 1.18),
        ma.height * 1.08 * clamp(mt.scaleY, 0.7, 1.24),
        clamp(mt.mouthCurve, -1, 1),
        mt.mouthO,
        mt.mouthD,
        mt.mouthCrescent
      );
      ctx.restore();

      ctx.restore();
    }

    // --- MAIN CLOUD RENDERER ---
    function renderCloudBlob(ctx, o) {
      var size = o.size;
      var renderScale = o.renderScale;
      var p = o.params;
      var lobeStates = o.lobeStates;
      var colour = o.colour;
      var t = o.idleTime;

      var s = getStamps(colour, p);

      ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
      ctx.clearRect(0, 0, size, size);
      ctx.save();
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, TAU);
      ctx.clip();

      // Wisps (smoke & mist)
      for (var wi = 0; wi < o.wisps.length; wi++) {
        var w = o.wisps[wi];
        if (!w.active) continue;
        var elongation = w.shape === 2 ? 1.1 : 1.45;
        stamp(ctx, s.smoke, w.x, w.y, w.radius * elongation, w.radius * 0.78, w.opacity, w.angle);
        if (w.shape !== 0) {
          stamp(
            ctx,
            s.mist,
            w.x + Math.cos(w.angle + w.curl) * w.radius * 0.45,
            w.y + Math.sin(w.angle + w.curl) * w.radius * 0.45,
            w.radius * 1.1,
            w.radius * 0.55,
            w.opacity * 0.65,
            w.angle + w.curl
          );
        }
      }

      // Ground shadow
      var altitude = Math.max(0, -p.y);
      var shadowFade = clamp(1 - altitude / 130, 0, 1);
      if (shadowFade > 0.01) {
        var shHeight = clamp(1 - p.y / 160, 0.45, 1.35);
        stamp(
          ctx,
          s.shadow,
          size / 2 + p.x * 0.4,
          size / 2 + 130 * p.scale + Math.max(0, p.y) * 0.4,
          95 * p.scale * shHeight,
          13 * p.scale,
          (0.22 / shHeight) * shadowFade
        );
      }

      var yaw = clamp(p.turnYaw || 0, -45, 45);
      var pitch = clamp(p.turnPitch || 0, -30, 30);
      var yawRad = (yaw * Math.PI) / 180;
      var pitchRad = (pitch * Math.PI) / 180;
      var yawSin = Math.sin(yawRad);
      var yawCos = Math.cos(yawRad);
      var pitchSin = Math.sin(pitchRad);
      var pitchCos = Math.cos(pitchRad);

      var bodyYawWidth = clamp(0.94 + Math.abs(yawCos) * 0.06, 0.94, 1);
      var bodyPitchHeight = clamp(0.96 + Math.abs(pitchCos) * 0.04, 0.96, 1);

      ctx.save();
      ctx.translate(size / 2 + p.x, size / 2 + p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.scale(p.scale * p.scaleX * bodyYawWidth, p.scale * p.scaleY * bodyPitchHeight);
      ctx.globalAlpha = o.rig.blob.opacity;

      var lightParallaxX = clamp((p.x / (size / 2)) * 0.22, -0.25, 0.25);
      var worldRotRad = (p.rotation * Math.PI) / 180;
      var lightFollowRotation = -worldRotRad * 0.65 + lightParallaxX;

      var getLobePose = function(def) {
        var l = lobeStates[def.id] || { x: def.baseX, y: def.baseY, scaleX: 1, scaleY: 1, opacity: 1, rotation: 0 };
        var depth = def.depth || 0;
        var parallaxY = depth * pitchSin * 18 - (depth > 0 ? Math.abs(yawSin) * 5 : 0);
        var pullLagX = clamp(-o.vx * 0.02, -14, 14);
        var pullLagY = clamp(-o.vy * 0.02, -14, 14);

        var bz = depth * DEPTH_UNIT;
        var bx = def.baseX;
        var rotatedX = bx * yawCos + bz * yawSin;
        var rotatedZ = -bx * yawSin + bz * yawCos;
        var projectionShift = rotatedX - bx;

        var x = l.x + projectionShift + pullLagX;
        var y = l.y + parallaxY + pullLagY;

        var zNorm = clamp(rotatedZ / (DEPTH_UNIT * 2.4), -1, 1);
        var depthScale = clamp(1 + zNorm * 0.11, 0.86, 1.14);
        var softness = clamp(p.lobeSoftness, 0.75, 1.3);

        return {
          x: x, y: y,
          rx: def.radiusX * l.scaleX * softness * depthScale,
          ry: def.radiusY * l.scaleY * softness * depthScale,
          opacity: l.opacity,
          rotation: l.rotation,
          scaleX: l.scaleX,
          scaleY: l.scaleY,
          depth: depth,
          z: rotatedZ,
          zNorm: zNorm
        };
      };

      var shellLobes = [];
      for (var li = 0; li < LOBE_DEFINITIONS.length; li++) {
        var d = LOBE_DEFINITIONS[li];
        if (d.id !== "frontVeil" && d.id !== "core") {
          shellLobes.push({ def: d, pose: getLobePose(d) });
        }
      }
      shellLobes.sort(function(a, b) { return a.pose.z - b.pose.z; });

      var corePose = getLobePose(LOBE_DEFINITIONS.find(function(d) { return d.id === "core"; }));
      var bottomBellyDef = LOBE_DEFINITIONS.find(function(d) { return d.id === "bottomBelly"; });
      var bottomBellyPose = bottomBellyDef ? getLobePose(bottomBellyDef) : null;
      var leftCheekDef = LOBE_DEFINITIONS.find(function(d) { return d.id === "leftCheek"; });
      var rightCheekDef = LOBE_DEFINITIONS.find(function(d) { return d.id === "rightCheek"; });
      var crownDef = LOBE_DEFINITIONS.find(function(d) { return d.id === "topCrown"; });
      var leftCheekPose = leftCheekDef ? getLobePose(leftCheekDef) : null;
      var rightCheekPose = rightCheekDef ? getLobePose(rightCheekDef) : null;
      var crownPose = crownDef ? getLobePose(crownDef) : null;

      // 1. Rear lobes (z < 0)
      for (var ri = 0; ri < shellLobes.length; ri++) {
        var entry = shellLobes[ri];
        if (entry.pose.z >= 0) continue;
        var rdef = entry.def;
        var rpose = entry.pose;
        var rl = lobeStates[rdef.id];
        var rsubs = LOBE_SUB_PUFFS[rdef.id];
        if (rsubs && p.fluffiness > 0.05) {
          for (var rsi = 0; rsi < rsubs.length; rsi++) {
            var rsub = rsubs[rsi];
            var rbreathe = Math.sin(t * 1.1 + (rsub.phaseOffset || 0)) * 0.7;
            stamp(
              ctx, s.rearMass,
              rpose.x + rsub.offsetX * p.fluffiness * rl.scaleX,
              rpose.y + (rsub.offsetY * p.fluffiness + rbreathe) * rl.scaleY,
              rpose.rx * rsub.radiusRatio,
              rpose.ry * rsub.radiusRatio,
              rl.opacity * 0.85,
              rpose.rotation + lightFollowRotation
            );
          }
        }
        stamp(
          ctx, s.rearMass,
          rpose.x, rpose.y,
          rpose.rx, rpose.ry,
          Math.min(1, rl.opacity * colour.density * 1.05 * (1 - rpose.zNorm * 0.06)),
          rpose.rotation + lightFollowRotation
        );
      }

      // 2. Connective core bridge
      if (bottomBellyPose) {
        stamp(
          ctx, s.mass,
          (corePose.x + bottomBellyPose.x) * 0.5,
          (corePose.y + bottomBellyPose.y) * 0.5,
          118 * corePose.scaleX,
          72 * corePose.scaleY,
          0.94,
          lightFollowRotation
        );
      }

      // 3. Underside AO shadow
      var trueBottomY = bottomBellyPose ? corePose.y * 0.35 + bottomBellyPose.y * 0.65 : corePose.y + 24;
      stamp(ctx, s.underside, corePose.x, trueBottomY, 116 * corePose.scaleX, 34 * corePose.scaleY, 0.38);

      // 4. Central Core
      stamp(
        ctx, s.core,
        corePose.x, corePose.y + 10,
        126 * corePose.scaleX, 100 * corePose.scaleY,
        clamp(p.coreDensity * colour.density, 0, 1),
        lightFollowRotation
      );
      stamp(ctx, s.glow, corePose.x, corePose.y + 12, 80, 70, colour.glowIntensity * 0.16, lightFollowRotation);

      // 5. Crevice shadows
      if (leftCheekPose && Math.hypot(leftCheekPose.x - corePose.x, leftCheekPose.y - corePose.y) < 95) {
        stamp(ctx, s.crevice, leftCheekPose.x * 0.5 + corePose.x * 0.5, leftCheekPose.y * 0.5 + corePose.y * 0.5 + 4, 38, 34, 0.35);
      }
      if (rightCheekPose && Math.hypot(rightCheekPose.x - corePose.x, rightCheekPose.y - corePose.y) < 95) {
        stamp(ctx, s.crevice, rightCheekPose.x * 0.5 + corePose.x * 0.5, rightCheekPose.y * 0.5 + corePose.y * 0.5 + 4, 38, 34, 0.35);
      }
      if (crownPose && Math.hypot(crownPose.x - corePose.x, crownPose.y - corePose.y) < 90) {
        stamp(ctx, s.crevice, crownPose.x * 0.5 + corePose.x * 0.5, crownPose.y * 0.5 + corePose.y * 0.5 + 8, 44, 30, 0.35);
      }

      // 6. Front Lobes (z >= 0)
      for (var fi = 0; fi < shellLobes.length; fi++) {
        var fentry = shellLobes[fi];
        if (fentry.pose.z < 0) continue;
        var fdef = fentry.def;
        var fpose = fentry.pose;
        var fl = lobeStates[fdef.id];
        var fsubs = LOBE_SUB_PUFFS[fdef.id];
        if (fsubs && p.fluffiness > 0.05) {
          for (var fsi = 0; fsi < fsubs.length; fsi++) {
            var fsub = fsubs[fsi];
            var fbreathe = Math.sin(t * 1.1 + (fsub.phaseOffset || 0)) * 0.7;
            stamp(
              ctx, s.mass,
              fpose.x + fsub.offsetX * p.fluffiness * fl.scaleX,
              fpose.y + (fsub.offsetY * p.fluffiness + fbreathe) * fl.scaleY,
              fpose.rx * fsub.radiusRatio,
              fpose.ry * fsub.radiusRatio,
              fl.opacity * 0.88,
              fpose.rotation + lightFollowRotation
            );
          }
        }
        stamp(
          ctx, s.mass,
          fpose.x, fpose.y,
          fpose.rx, fpose.ry,
          Math.min(1, fl.opacity * colour.density * 1.08 * (1 + fpose.zNorm * 0.05)),
          fpose.rotation + lightFollowRotation
        );
      }

      // 7. Internal life motes
      for (var di = 0; di < SUSPENDED_DROPLETS.length; di++) {
        var drop = SUSPENDED_DROPLETS[di];
        var shimmer = 0.5 + 0.5 * Math.sin(t * drop.driftSpeed + drop.driftPhase);
        if (shimmer < 0.05) continue;
        var dropDepth = drop.radius > 2.0 ? 0.8 : -0.6;
        var dropX = corePose.x + drop.x * 1.35 + dropDepth * yawSin * 14;
        var dropY = corePose.y + drop.y * 1.1 + dropDepth * pitchSin * 10;
        stamp(ctx, s.mist, dropX, dropY, drop.radius * 7, drop.radius * 7, shimmer * drop.brightness * 0.16);

        ctx.save();
        ctx.globalAlpha *= shimmer * drop.brightness * 0.22;
        ctx.fillStyle = colour.edge;
        ctx.beginPath();
        ctx.arc(dropX, dropY, drop.radius * 0.55, 0, TAU);
        ctx.fill();
        ctx.restore();
      }

      // 8. Cheek blush (if active)
      if (p.cheekBlush > 0 && leftCheekPose && rightCheekPose) {
        ctx.save();
        ctx.fillStyle = "#e8999f";
        ctx.globalAlpha *= p.cheekBlush * 0.15;
        ctx.beginPath();
        ctx.ellipse(leftCheekPose.x + 18, leftCheekPose.y + 16, 17, 8, 0, 0, TAU);
        ctx.ellipse(rightCheekPose.x - 18, rightCheekPose.y + 16, 17, 8, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }

      // 9. Facial depth embedding bed
      stamp(ctx, s.core, corePose.x, corePose.y + 8, 96 * corePose.scaleX, 74 * corePose.scaleY, 0.42);
      stamp(ctx, s.mist, corePose.x, corePose.y + 26, 88, 44, Math.max(0.08, p.faceEmbedDepth * 0.2));
      stamp(ctx, s.core, corePose.x, corePose.y - 4, 74 * corePose.scaleX, 54 * corePose.scaleY, 0.2 + p.faceEmbedDepth * 0.35);

      // 10. Crisp production face
      drawFace(ctx, o, s);

      // 11. Soft mist veils across face field
      stamp(ctx, s.mist, corePose.x, corePose.y + 2, 108 * corePose.scaleX, 76 * corePose.scaleY, 0.06 + p.faceEmbedDepth * 0.12);
      stamp(ctx, s.mist, corePose.x, corePose.y + 10, 76 * corePose.scaleX, 50 * corePose.scaleY, 0.04 + p.faceEmbedDepth * 0.08);

      ctx.restore();

      // Antialiased round panel clip
      ctx.save();
      ctx.globalCompositeOperation = "destination-in";
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, TAU);
      ctx.fillStyle = "#000";
      ctx.fill();
      ctx.restore();
    }

    // --- SIMULATION LOOP & RIG BLENDING ---
    var canvas = document.getElementById("cloudCanvas");
    var ctx = canvas.getContext("2d");

    var size = 466; // native LCDPROTO 466 space
    var dpr = Math.min(window.devicePixelRatio || 2, 3);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = "100%";
    canvas.style.height = "100%";

    var currentPalette = initialConfig.palette || {
      body: "#edf4ff", edge: "#ffffff", coreTint: "#627d98", innerGlow: "#ffffff",
      density: 1, translucency: 0.85, glowIntensity: 0.8
    };

    var currentParams = {
      scale: 1.0, scaleX: 1.0, scaleY: 1.0, rotation: 0,
      x: 0, y: 0, squash: 0, stretch: 0, lean: 0, puff: 0,
      leftBulge: 0, rightBulge: 0, topBulge: 0, bottomSag: 0,
      coreDensity: 0.95, lobeSoftness: 1.0, faceEmbedDepth: 0.12, fluffiness: 1.2,
      lightStrength: 1.0, lightAngle: -45, cheekBlush: 0.35, cloudBrows: true,
      gazeX: 0, gazeY: 0, turnYaw: 0, turnPitch: 0
    };

    var motionConfig = {
      floatAmount: 4.5, driftAmount: 2.5, wobbleAmount: 0, lobeLag: 1.0,
      springStiffness: 145, springDamping: 14.5
    };

    var lobeStates = createLobeStates();
    var wisps = createWispPool(24);

    var currentRig = {
      blob: { x: 0, y: 0, scale: 1, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1 },
      leftEye: { x: 0, y: 0, rotation: 0, opacity: 1, eyeOpen: 1, eyeSocketScaleX: 1, eyeSocketScaleY: 1, pupilX: 0, pupilY: 0, pupilScale: 1, lidBias: 0, browLift: 0, browRotation: 0 },
      rightEye: { x: 0, y: 0, rotation: 0, opacity: 1, eyeOpen: 1, eyeSocketScaleX: 1, eyeSocketScaleY: 1, pupilX: 0, pupilY: 0, pupilScale: 1, lidBias: 0, browLift: 0, browRotation: 0 },
      mouth: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, mouthCurve: 0.12, mouthO: 0, mouthD: 0, mouthCrescent: 0.2 }
    };

    var targetRig = JSON.parse(JSON.stringify(currentRig));

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

    function applyEmotionToTarget(emotionId) {
      // Neutral baseline
      targetRig.blob.scale = 1.0;
      targetRig.blob.rotation = 0;
      targetRig.leftEye.eyeOpen = 1.0;
      targetRig.leftEye.eyeSocketScaleX = 1.0;
      targetRig.leftEye.eyeSocketScaleY = 1.0;
      targetRig.leftEye.browLift = 0;
      targetRig.leftEye.browRotation = 0;
      targetRig.leftEye.lidBias = 0;
      targetRig.leftEye.x = 0;
      targetRig.leftEye.y = 0;

      targetRig.rightEye.eyeOpen = 1.0;
      targetRig.rightEye.eyeSocketScaleX = 1.0;
      targetRig.rightEye.eyeSocketScaleY = 1.0;
      targetRig.rightEye.browLift = 0;
      targetRig.rightEye.browRotation = 0;
      targetRig.rightEye.lidBias = 0;
      targetRig.rightEye.x = 0;
      targetRig.rightEye.y = 0;

      targetRig.mouth.mouthCurve = 0.14;
      targetRig.mouth.mouthO = 0;
      targetRig.mouth.mouthD = 0;
      targetRig.mouth.mouthCrescent = 0.25;
      targetRig.mouth.x = 0;
      targetRig.mouth.y = 0;
      targetRig.mouth.scaleX = 1.0;
      targetRig.mouth.scaleY = 1.0;

      currentParams.cheekBlush = 0.25;

      switch(emotionId) {
        case "HAPPY_EYES":
        case "happy":
        case "LAUGH_SQUISH":
          targetRig.leftEye.browLift = 0.52;
          targetRig.rightEye.browLift = 0.52;
          targetRig.leftEye.browRotation = -3;
          targetRig.rightEye.browRotation = 3;
          targetRig.mouth.mouthCurve = 0.42;
          targetRig.mouth.mouthCrescent = 0.85;
          targetRig.blob.scale = 1.06;
          currentParams.cheekBlush = 0.65;
          break;
        case "EXCITED_EYES":
        case "excited":
        case "EXCITED_WIGGLE":
          targetRig.leftEye.eyeSocketScaleX = 1.12;
          targetRig.leftEye.eyeSocketScaleY = 1.12;
          targetRig.rightEye.eyeSocketScaleX = 1.12;
          targetRig.rightEye.eyeSocketScaleY = 1.12;
          targetRig.leftEye.browLift = 0.58;
          targetRig.rightEye.browLift = 0.58;
          targetRig.mouth.mouthO = 0.35;
          targetRig.mouth.mouthD = 0.45;
          targetRig.mouth.mouthCurve = 0.22;
          targetRig.blob.scale = 1.08;
          currentParams.cheekBlush = 0.55;
          break;
        case "SLEEPY_EYES":
        case "sleepy":
          targetRig.leftEye.eyeOpen = 0.35;
          targetRig.rightEye.eyeOpen = 0.35;
          targetRig.leftEye.browLift = -0.15;
          targetRig.rightEye.browLift = -0.15;
          targetRig.leftEye.browRotation = 1.5;
          targetRig.rightEye.browRotation = -1.5;
          targetRig.mouth.mouthCurve = 0.04;
          targetRig.mouth.mouthCrescent = 0.05;
          targetRig.blob.scale = 0.98;
          currentParams.cheekBlush = 0.15;
          break;
        case "CURIOUS_TILT_LEFT":
        case "curious":
          targetRig.leftEye.x = -3.5;
          targetRig.rightEye.x = -3.5;
          targetRig.leftEye.browLift = 0.45;
          targetRig.rightEye.browLift = -0.12;
          targetRig.leftEye.browRotation = -4;
          targetRig.rightEye.browRotation = -1;
          targetRig.mouth.mouthCurve = 0.18;
          targetRig.mouth.x = -2;
          targetRig.blob.rotation = -4.5;
          break;
        case "CURIOUS_TILT_RIGHT":
          targetRig.leftEye.x = 3.5;
          targetRig.rightEye.x = 3.5;
          targetRig.leftEye.browLift = -0.12;
          targetRig.rightEye.browLift = 0.45;
          targetRig.leftEye.browRotation = 1;
          targetRig.rightEye.browRotation = 4;
          targetRig.mouth.mouthCurve = 0.18;
          targetRig.mouth.x = 2;
          targetRig.blob.rotation = 4.5;
          break;
        case "SURPRISE_POP":
        case "surprised":
          targetRig.leftEye.eyeOpen = 1.15;
          targetRig.rightEye.eyeOpen = 1.15;
          targetRig.leftEye.eyeSocketScaleX = 1.12;
          targetRig.leftEye.eyeSocketScaleY = 1.18;
          targetRig.rightEye.eyeSocketScaleX = 1.12;
          targetRig.rightEye.eyeSocketScaleY = 1.18;
          targetRig.leftEye.browLift = 0.72;
          targetRig.rightEye.browLift = 0.72;
          targetRig.mouth.mouthO = 0.68;
          targetRig.mouth.mouthD = 0.15;
          targetRig.mouth.mouthCurve = 0;
          targetRig.blob.scale = 1.09;
          break;
        case "LOOK_UP":
          targetRig.leftEye.y = -4;
          targetRig.rightEye.y = -4;
          targetRig.leftEye.browLift = 0.35;
          targetRig.rightEye.browLift = 0.35;
          targetRig.mouth.mouthCurve = 0.16;
          break;
        case "LOOK_DOWN":
          targetRig.leftEye.y = 3.5;
          targetRig.rightEye.y = 3.5;
          targetRig.leftEye.browLift = -0.1;
          targetRig.rightEye.browLift = -0.1;
          targetRig.mouth.mouthCurve = -0.05;
          break;
        case "HAPPY_WIGGLE":
          targetRig.mouth.mouthCurve = 0.4;
          targetRig.mouth.mouthCrescent = 0.8;
          targetRig.leftEye.browLift = 0.5;
          targetRig.rightEye.browLift = 0.5;
          targetRig.blob.scale = 1.08;
          break;
        case "BOUNCE_HIGH":
          targetRig.mouth.mouthD = 0.5;
          targetRig.mouth.mouthCurve = 0.3;
          targetRig.leftEye.eyeSocketScaleX = 1.1;
          targetRig.leftEye.eyeSocketScaleY = 1.1;
          targetRig.blob.scale = 1.12;
          break;
        case "SAD_DROOP":
          targetRig.leftEye.browLift = -0.2;
          targetRig.rightEye.browLift = -0.2;
          targetRig.leftEye.browRotation = 3.5;
          targetRig.rightEye.browRotation = -3.5;
          targetRig.mouth.mouthCurve = -0.3;
          targetRig.mouth.mouthCrescent = 0;
          targetRig.blob.scale = 0.94;
          break;
        case "WARM_GLOW":
          targetRig.mouth.mouthCurve = 0.25;
          targetRig.mouth.mouthCrescent = 0.45;
          targetRig.leftEye.browLift = 0.2;
          targetRig.rightEye.browLift = 0.2;
          currentParams.cheekBlush = 0.55;
          break;
        default:
          // Idle default
          break;
      }
    }

    if (initialConfig.emotionId) {
      applyEmotionToTarget(initialConfig.emotionId);
    }

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
      requestAnimationFrame(tick);

      var dt = lastFrame === null ? 1 / 60 : (now - lastFrame) / 1000;
      lastFrame = now;
      var step = clamp(dt, 0, 0.05);
      idleTime += step;

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
      var ambientX = Math.sin(idleTime * 0.45) * motionConfig.driftAmount;
      var ambientY = Math.sin(idleTime * 0.8) * motionConfig.floatAmount;

      var totalX = dragX + ambientX;
      var totalY = dragY + ambientY;

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
      currentParams.rotation = currentRig.blob.rotation;

      // Step Lobe Physics
      stepLobePhysics(lobeStates, currentParams, motionConfig, vx / currentParams.scale, vy / currentParams.scale, idleTime, step);

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
        idleTime: idleTime,
        params: currentParams,
        showPupils: initialConfig.showPupils || false,
        vx: vx,
        vy: vy
      });
    }

    requestAnimationFrame(tick);

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
      if (props.palette) {
        currentPalette = Object.assign({}, currentPalette, props.palette);
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

    // React Native message event listener
    window.addEventListener("message", function(event) {
      try {
        var data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        window.updateCloudProps(data);
      } catch (e) {}
    });
    document.addEventListener("message", function(event) {
      try {
        var data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        window.updateCloudProps(data);
      } catch (e) {}
    });

  })();
  </script>
</body>
</html>`;
}
