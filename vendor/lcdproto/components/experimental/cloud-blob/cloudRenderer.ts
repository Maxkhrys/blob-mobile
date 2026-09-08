/** Seven authored masses, six secondary billows, cached alpha stamps. No blur. */
import {
  LOBE_DEFINITIONS,
  LOBE_SUB_PUFFS,
  SUSPENDED_DROPLETS,
} from "./cloudLobeSystem";
import type {
  CloudColourConfig,
  CloudDeformationParams,
  CloudWisp,
  LobeState,
} from "./cloudTypes";
import { faceAnchor, type BlobColour, type BlobRig } from "@/lib/blobRig";
import {
  composeOrientation,
  normalizeVec3,
  rotateVec3,
  type Mat3,
  type Vec3,
} from "@/lib/orientation";
import {
  eyeGeometry,
  drawEyebrow,
  drawProceduralEye,
  drawMouthShape,
  BROW_CLEARANCE_RATIO,
} from "@/components/blob/faceRenderer";

import type { CloudFaceSettings } from "@/lib/characters";

export interface RenderOptions {
  size: number;
  renderScale: number;
  lobeStates: Record<string, LobeState>;
  colour: CloudColourConfig;
  wisps: CloudWisp[];
  showFace: boolean;
  rig: BlobRig;
  colourName: BlobColour;
  idleTime: number;
  params: CloudDeformationParams;
  wallAngle: number;
  wallScaleX: number;
  wallScaleY: number;
  debug: boolean;
  vx: number;
  vy: number;
  safeRadius: number;
  face?: CloudFaceSettings;
  showPupils?: boolean;
  showContactShadow?: boolean;
}
const TAU = Math.PI * 2;
/** 466-space distance between authored depth tiers, for the 2.5D rotation. */
const DEPTH_UNIT = 34;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export function parseHexColor(hex: string) {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const value = /^[\da-f]{6}$/i.test(full) ? parseInt(full, 16) : 0xd8e6ff;
  return { r: value >> 16, g: (value >> 8) & 255, b: value & 255 };
}

export function mixHexColor(
  hex: string,
  r: number,
  g: number,
  b: number,
  amount: number
): string {
  const c = parseHexColor(hex);
  const t = Math.max(0, Math.min(1, amount));
  const nr = Math.round(c.r + (r - c.r) * t);
  const ng = Math.round(c.g + (g - c.g) * t);
  const nb = Math.round(c.b + (b - c.b) * t);
  return `#${nr.toString(16).padStart(2, "0")}${ng.toString(16).padStart(2, "0")}${nb.toString(16).padStart(2, "0")}`;
}
const rgba = (c: ReturnType<typeof parseHexColor>, a: number) =>
  `rgba(${c.r},${c.g},${c.b},${a})`;
interface Stamps {
  key: string;
  mass: HTMLCanvasElement;
  rearMass: HTMLCanvasElement;
  crevice: HTMLCanvasElement;
  crestRim: HTMLCanvasElement;
  underside: HTMLCanvasElement;
  core: HTMLCanvasElement;
  mist: HTMLCanvasElement;
  smoke: HTMLCanvasElement;
  glow: HTMLCanvasElement;
  shadow: HTMLCanvasElement;
  builds: number;
}
const caches = new WeakMap<CanvasRenderingContext2D, Stamps>();
function sprite(paint: (ctx: CanvasRenderingContext2D) => void, size = 128) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.translate(size / 2, size / 2);
  ctx.scale(size / 2, size / 2);
  paint(ctx);
  return canvas;
}
function getStamps(
  ctx: CanvasRenderingContext2D,
  c: CloudColourConfig,
  p: CloudDeformationParams,
) {
  const key = `${c.body}|${c.edge}|${c.coreTint}|${c.innerGlow}|${p.lightAngle}|${p.lightStrength}|${c.translucency}|v2`;
  const old = caches.get(ctx);
  if (old?.key === key) return old;
  const body = parseHexColor(c.body),
    edge = parseHexColor(c.edge),
    core = parseHexColor(c.coreTint);
  const rad = (p.lightAngle * Math.PI) / 180;
  const lx = Math.cos(rad),
    ly = Math.sin(rad);

  // Front & Mid Volumetric Lobe: Selective crisp edge, forward scattering, and terminator form shadow
  const makeMass = (dense: boolean) =>
    sprite((s) => {
      const volume = s.createRadialGradient(
        lx * 0.28,
        ly * 0.28,
        0.02,
        0,
        0,
        1,
      );
      volume.addColorStop(0, rgba(edge, 1));
      volume.addColorStop(0.48, rgba(body, dense ? 1 : 0.98));
      volume.addColorStop(0.78, rgba(body, dense ? 0.96 : 0.9));
      volume.addColorStop(0.92, rgba(body, 0.42 * c.translucency));
      volume.addColorStop(1, rgba(body, 0));
      s.fillStyle = volume;
      s.fillRect(-1, -1, 2, 2);

      s.globalCompositeOperation = "source-atop";
      // Rich spherical form shadow on the unlit side
      const shade = s.createLinearGradient(lx, ly, -lx, -ly);
      shade.addColorStop(0, "rgba(255,255,255,0)");
      shade.addColorStop(0.35, "rgba(255,255,255,0)");
      shade.addColorStop(0.58, rgba(core, p.lightStrength * 0.22));
      shade.addColorStop(0.84, rgba(core, p.lightStrength * 0.62));
      shade.addColorStop(1.0, rgba(core, p.lightStrength * 0.82));
      s.fillStyle = shade;
      s.fillRect(-1, -1, 2, 2);
    });

  // Rear Grounded Masses: Softer atmospheric tone that recedes gracefully behind the core
  const makeRearMass = () =>
    sprite((s) => {
      const volume = s.createRadialGradient(
        lx * 0.22,
        ly * 0.22,
        0.04,
        0,
        0,
        1,
      );
      volume.addColorStop(0, rgba(edge, 0.92));
      volume.addColorStop(0.35, rgba(body, 0.92));
      volume.addColorStop(0.68, rgba(body, 0.82));
      volume.addColorStop(0.88, rgba(body, 0.38 * c.translucency));
      volume.addColorStop(1, rgba(body, 0));
      s.fillStyle = volume;
      s.fillRect(-1, -1, 2, 2);

      s.globalCompositeOperation = "source-atop";
      const shade = s.createLinearGradient(lx, ly, -lx, -ly);
      shade.addColorStop(0, "rgba(255,255,255,0.15)");
      shade.addColorStop(0.45, "rgba(255,255,255,0)");
      shade.addColorStop(0.8, rgba(core, p.lightStrength * 0.45));
      shade.addColorStop(1.0, rgba(core, p.lightStrength * 0.65));
      s.fillStyle = shade;
      s.fillRect(-1, -1, 2, 2);
    });

  // Crevice Ambient Occlusion: Defined darkening between overlapping billows
  const makeCrevice = () =>
    sprite((s) => {
      const g = s.createRadialGradient(0, 0, 0, 0, 0, 1);
      g.addColorStop(0, rgba(core, clamp(p.lightStrength * 0.42, 0.22, 0.52)));
      g.addColorStop(0.42, rgba(core, clamp(p.lightStrength * 0.24, 0.1, 0.32)));
      g.addColorStop(0.78, rgba(core, 0.03));
      g.addColorStop(1, rgba(core, 0));
      s.fillStyle = g;
      s.fillRect(-1, -1, 2, 2);
    }, 64);

  // Top Crest Rim Light: Radiant rim accent catching directional light on crown/shoulders
  const makeCrestRim = () =>
    sprite((s) => {
      const g = s.createRadialGradient(lx * 0.5, ly * 0.5, 0.05, 0, 0, 1);
      g.addColorStop(0, rgba(edge, 0.5));
      g.addColorStop(0.35, rgba(edge, 0.2));
      g.addColorStop(0.7, rgba(edge, 0.04));
      g.addColorStop(1, rgba(edge, 0));
      s.fillStyle = g;
      s.fillRect(-1, -1, 2, 2);
    }, 64);

  // Global Underside Ambient Shadow: Anchors the bottom mass
  const makeUnderside = () =>
    sprite((s) => {
      const g = s.createRadialGradient(0, 0.2, 0.1, 0, 0, 1);
      g.addColorStop(0, rgba(core, 0.32));
      g.addColorStop(0.55, rgba(core, 0.12));
      g.addColorStop(1, rgba(core, 0));
      s.fillStyle = g;
      s.fillRect(-1, -1, 2, 2);
    }, 128);

  const soft = (color: string, middle: number) =>
    sprite((s) => {
      const rgb = parseHexColor(color);
      const g = s.createRadialGradient(0, 0, 0, 0, 0, 1);
      g.addColorStop(0, rgba(rgb, 1));
      g.addColorStop(0.4, rgba(rgb, middle));
      g.addColorStop(1, rgba(rgb, 0));
      s.fillStyle = g;
      s.fillRect(-1, -1, 2, 2);
    }, 64);

  const stamps: Stamps = {
    key,
    mass: makeMass(false),
    rearMass: makeRearMass(),
    crevice: makeCrevice(),
    crestRim: makeCrestRim(),
    underside: makeUnderside(),
    core: sprite((s) => {
      const g = s.createRadialGradient(lx * 0.28, ly * 0.28, 0.02, 0, 0, 1);
      g.addColorStop(0, rgba(edge, 1));
      g.addColorStop(0.5, rgba(body, 0.96));
      g.addColorStop(0.78, rgba(body, 0.56));
      g.addColorStop(1, rgba(body, 0));
      s.fillStyle = g;
      s.fillRect(-1, -1, 2, 2);
      s.globalCompositeOperation = "source-atop";
      const shade = s.createLinearGradient(lx, ly, -lx, -ly);
      shade.addColorStop(0, "rgba(255,255,255,0)");
      shade.addColorStop(0.45, "rgba(255,255,255,0)");
      shade.addColorStop(0.72, rgba(core, p.lightStrength * 0.35));
      shade.addColorStop(1.0, rgba(core, p.lightStrength * 0.58));
      s.fillStyle = shade;
      s.fillRect(-1, -1, 2, 2);
    }),
    mist: soft(c.edge, 0.42),
    smoke: sprite((s) => {
      const g = s.createRadialGradient(0, 0, 0, 0, 0, 1);
      g.addColorStop(0, rgba(edge, 0.92));
      g.addColorStop(0.28, rgba(body, 0.76));
      g.addColorStop(0.6, rgba(body, 0.38));
      g.addColorStop(0.85, rgba(edge, 0.1));
      g.addColorStop(1, rgba(body, 0));
      s.fillStyle = g;
      s.fillRect(-1, -1, 2, 2);
    }, 64),
    glow: soft(c.innerGlow, 0.3),
    shadow: soft("#080b10", 0.42),
    builds: (old?.builds ?? 0) + 1,
  };
  caches.set(ctx, stamps);
  return stamps;
}
function stamp(
  ctx: CanvasRenderingContext2D,
  image: HTMLCanvasElement,
  x: number,
  y: number,
  rx: number,
  ry: number,
  alpha: number,
  rotation = 0,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.globalAlpha *= clamp(alpha, 0, 1);
  ctx.drawImage(image, -rx, -ry, rx * 2, ry * 2);
  ctx.restore();
}

/** Ellipsoid used as the face-bearing surface of the central cloud mass. */
const FACE_RADIUS_X = 92;
const FACE_RADIUS_Y = 78;
const FACE_RADIUS_Z = 82;

interface ProjectedLobePose {
  x: number;
  y: number;
  rx: number;
  ry: number;
  opacity: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  z: number;
  zNorm: number;
}

interface CurvedFaceAnchor {
  point: Vec3;
  normal: Vec3;
  tangentX: Vec3;
  tangentY: Vec3;
}

const smoothstep = (edge0: number, edge1: number, value: number) => {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

interface OrientedFrame {
  matrix: Mat3;
  projectedXAxis: number;
  projectedYAxis: number;
  projectedZAxis: number;
  surfaceRotation: number;
}

function makeOrientedFrame(
  facing: { yaw: number; pitch: number },
  performance: { yaw: number; pitch: number; roll: number },
): OrientedFrame {
  const matrix = composeOrientation(facing, performance);
  const localXAxis = rotateVec3(matrix, { x: 1, y: 0, z: 0 });
  const localYAxis = rotateVec3(matrix, { x: 0, y: 1, z: 0 });
  const localZAxis = rotateVec3(matrix, { x: 0, y: 0, z: 1 });
  return {
    matrix,
    projectedXAxis: Math.hypot(localXAxis.x, localXAxis.y),
    projectedYAxis: Math.hypot(localYAxis.x, localYAxis.y),
    projectedZAxis: Math.hypot(localZAxis.x, localZAxis.y),
    surfaceRotation: Math.atan2(localXAxis.y, localXAxis.x),
  };
}

function facingOf(
  p: CloudDeformationParams,
  layer: "face" | "core" | "shell" | "crown" | "mass",
): { yaw: number; pitch: number } {
  if (layer === "core" && p.coreFacingYaw != null) {
    return { yaw: p.coreFacingYaw, pitch: p.coreFacingPitch ?? 0 };
  }
  if (layer === "shell" && p.shellFacingYaw != null) {
    return { yaw: p.shellFacingYaw, pitch: p.shellFacingPitch ?? 0 };
  }
  if (layer === "crown" && p.crownFacingYaw != null) {
    return { yaw: p.crownFacingYaw, pitch: p.crownFacingPitch ?? 0 };
  }
  if (layer === "mass" && p.massFacingYaw != null) {
    return { yaw: p.massFacingYaw, pitch: p.massFacingPitch ?? 0 };
  }
  return { yaw: p.facingYaw ?? 0, pitch: p.facingPitch ?? 0 };
}

function performanceOf(
  p: CloudDeformationParams,
  layer: "face" | "core" | "shell" | "crown" | "mass",
): { yaw: number; pitch: number; roll: number } {
  if (layer === "core" && p.corePerformanceYaw != null) {
    return {
      yaw: p.corePerformanceYaw,
      pitch: p.corePerformancePitch ?? 0,
      roll: p.corePerformanceRoll ?? 0,
    };
  }
  if (layer === "shell" && p.shellPerformanceYaw != null) {
    return {
      yaw: p.shellPerformanceYaw,
      pitch: p.shellPerformancePitch ?? 0,
      roll: p.shellPerformanceRoll ?? 0,
    };
  }
  if (layer === "crown" && p.crownPerformanceYaw != null) {
    return {
      yaw: p.crownPerformanceYaw,
      pitch: p.crownPerformancePitch ?? 0,
      roll: p.crownPerformanceRoll ?? 0,
    };
  }
  if (layer === "mass" && p.massPerformanceYaw != null) {
    return {
      yaw: p.massPerformanceYaw,
      pitch: p.massPerformancePitch ?? 0,
      roll: p.massPerformanceRoll ?? 0,
    };
  }
  return {
    yaw: p.performanceYaw ?? 0,
    pitch: p.performancePitch ?? 0,
    roll: p.performanceRoll ?? 0,
  };
}

function layerForLobe(id: string): "core" | "shell" | "crown" | "mass" {
  if (id === "bottomBelly" || id === "baseLeft" || id === "baseRight") return "mass";
  if (id === "topCrown") return "crown";
  if (id === "leftCheek" || id === "rightCheek") return "shell";
  return "core";
}

/**
 * Builds one authored face anchor on the front half of an ellipsoid. The
 * normal and local tangents are rotated with the point, so every feature gets
 * real near/far depth, screen-space width and back-side occlusion from the
 * same matrix as the cloud lobes.
 */
function curvedFaceAnchor(x: number, y: number): CurvedFaceAnchor {
  const footprint = clamp(
    1 - (x * x) / (FACE_RADIUS_X * FACE_RADIUS_X) - (y * y) / (FACE_RADIUS_Y * FACE_RADIUS_Y),
    0,
    1,
  );
  const z = Math.max(1, FACE_RADIUS_Z * Math.sqrt(footprint));
  const normal = normalizeVec3({
    x: x / (FACE_RADIUS_X * FACE_RADIUS_X),
    y: y / (FACE_RADIUS_Y * FACE_RADIUS_Y),
    z: z / (FACE_RADIUS_Z * FACE_RADIUS_Z),
  });
  return {
    point: { x, y, z },
    normal,
    tangentX: normalizeVec3({
      x: 1,
      y: 0,
      z: -(x * FACE_RADIUS_Z * FACE_RADIUS_Z) / (z * FACE_RADIUS_X * FACE_RADIUS_X),
    }),
    tangentY: normalizeVec3({
      x: 0,
      y: 1,
      z: -(y * FACE_RADIUS_Z * FACE_RADIUS_Z) / (z * FACE_RADIUS_Y * FACE_RADIUS_Y),
    }),
  };
}

function projectFaceAnchor(matrix: Mat3, anchor: CurvedFaceAnchor) {
  const point = rotateVec3(matrix, anchor.point);
  const normal = rotateVec3(matrix, anchor.normal);
  const tangentX = rotateVec3(matrix, anchor.tangentX);
  const tangentY = rotateVec3(matrix, anchor.tangentY);
  return {
    point,
    normal,
    tangentX,
    tangentY,
    /** No readability floor: the back side actually disappears. */
    visibility: smoothstep(-0.12, 0.14, normal.z),
    width: Math.hypot(tangentX.x, tangentX.y),
    height: Math.hypot(tangentY.x, tangentY.y),
  };
}

function drawFace(
  ctx: CanvasRenderingContext2D,
  o: RenderOptions,
  matrix: Mat3,
  core: ProjectedLobePose,
) {
  const { size, rig, colourName, params: p } = o;
  const face = o.face ?? { offsetX: 0, offsetY: 0, scale: 1 };
  const faceScale = face.scale ?? 1;
  const grabPress = p.grabPressure ?? 0;
  const faceAttachX = clamp(p.faceShiftX ?? 0, -12, 12);
  const faceAttachY = clamp(p.faceShiftY ?? 0, -12, 12);

  for (const id of ["leftEye", "rightEye"] as const) {
    const a = faceAnchor(id, size, colourName);
    const t = { ...rig[id] };
    const isLeft = id === "leftEye";
    let localX = (a.x - size / 2 + (face.offsetX ?? 0) + faceAttachX + t.x) * faceScale;
    const localY = (a.y - size / 2 + (face.offsetY ?? 0) + faceAttachY + t.y) * faceScale;

    // Contact changes authored local anchor positions before orientation. It
    // never changes yaw, which remains Mind-owned.
    if (grabPress > 0.05) {
      const contactX = p.contactX ?? 0;
      const contactDist = p.contactDistance ?? 0;
      if (contactDist < 28 || Math.abs(contactX) < 0.25) {
        localX *= 1 - grabPress * 0.07;
      } else {
        const isNearSide = (contactX < 0 && isLeft) || (contactX > 0 && !isLeft);
        localX -= Math.sign(contactX) * grabPress * (isNearSide ? 4.2 : 1.0);
      }
    }

    const projected = projectFaceAnchor(matrix, curvedFaceAnchor(localX, localY));
    if (projected.visibility <= 0.012) continue;

    const depthScale = clamp(1 + projected.point.z / FACE_RADIUS_Z * 0.12, 0.78, 1.18);
    const vis = projected.visibility;
    // Visibility-aware, not a restored 0.82/0.95 floor. Front stays plump,
    // 45–65° keeps the far eye from collapsing into a hairline, profile is
    // allowed to recede, and back-face occlusion already culled us.
    const slitGuard = smoothstep(0.16, 0.52, vis);
    const frontHold = smoothstep(0.52, 0.9, vis);
    const minW = 0.10 + 0.20 * slitGuard + 0.16 * frontHold;
    const minH = 0.34 + 0.22 * vis;
    const eyeScaleX = clamp(0.10 + projected.width * 0.90, minW, 1.14) * depthScale;
    const grabEyeScaleY =
      grabPress > 0.05 && ((p.contactDistance ?? 0) < 28 || Math.abs(p.contactX ?? 0) < 0.25)
        ? 1 + grabPress * 0.04
        : 1;
    const eyeScaleY = clamp(0.34 + projected.height * 0.66, minH, 1.16) * depthScale * grabEyeScaleY;
    t.eyeOpen *= clamp(0.72 + projected.height * 0.34, 0.58, 1.08);
    const eye = eyeGeometry(a.width * eyeScaleX, a.height * eyeScaleY, t, false);
    const gazeTravelX = eye.width * 0.33;
    const gazeTravelY = eye.height * 0.16;
    eye.centerX = clamp(eye.centerX + p.gazeX * gazeTravelX, -gazeTravelX, gazeTravelX);
    eye.centerY = clamp(eye.centerY + p.gazeY * gazeTravelY, -gazeTravelY, gazeTravelY);

    ctx.save();
    ctx.translate(core.x + projected.point.x + t.socketX, core.y + projected.point.y + t.socketY);
    // The feature artwork follows its rotated surface basis. A cartwheel thus
    // turns the actual face anchors/artwork with the volume, without rotating
    // the finished canvas image.
    ctx.rotate(Math.atan2(projected.tangentX.y, projected.tangentX.x));
    ctx.globalAlpha *= t.opacity * projected.visibility * clamp(0.72 + depthScale * 0.28, 0.72, 1.05);

    if (p.cloudBrows) {
      ctx.save();
      ctx.globalAlpha *= 0.18;
      ctx.fillStyle = "#f1f4ff";
      ctx.beginPath();
      ctx.ellipse(0, -eye.height * 0.74, eye.width * 0.6, 3, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.globalAlpha *= 0.88;
    drawEyebrow(
      ctx,
      eye,
      t.browLift,
      t.browRotation + Math.atan2(projected.tangentX.y, projected.tangentX.x) * 0.06,
      size * BROW_CLEARANCE_RATIO,
    );
    ctx.restore();

    ctx.rotate((t.rotation * Math.PI) / 180);
    drawProceduralEye(
      ctx,
      eye,
      o.showPupils ?? false,
      t.pupilX,
      t.pupilY,
      t.pupilScale,
      t.lidBias,
    );
    ctx.restore();
  }

  const a = faceAnchor("mouth", size, colourName);
  const t = rig.mouth;
  const mouth = projectFaceAnchor(
    matrix,
    curvedFaceAnchor(
      (a.x - size / 2 + (face.offsetX ?? 0) + faceAttachX + t.x) * faceScale,
      (a.y - size / 2 + (face.offsetY ?? 0) + faceAttachY + t.y) * faceScale,
    ),
  );
  if (mouth.visibility <= 0.012) return;
  const mouthDepth = clamp(1 + mouth.point.z / FACE_RADIUS_Z * 0.1, 0.8, 1.16);
  ctx.save();
  ctx.translate(core.x + mouth.point.x, core.y + mouth.point.y);
  ctx.rotate(Math.atan2(mouth.tangentX.y, mouth.tangentX.x));
  ctx.globalAlpha *= t.opacity * mouth.visibility * clamp(0.74 + mouthDepth * 0.26, 0.74, 1.04);
  ctx.canvas.dataset.mouthTongue = String(t.mouthTongue ?? 0);
  drawMouthShape(
    ctx,
    a.width * 1.18 * clamp(t.scaleX * (0.14 + mouth.width * 0.86) * mouthDepth, 0.12, 1.38),
    a.height * 1.28 * clamp(t.scaleY * (0.56 + mouth.height * 0.44) * mouthDepth, 0.45, 1.42),
    clamp(t.mouthCurve, -1, 1),
    t.mouthO,
    t.mouthD,
    t.mouthCrescent ?? 0,
    colourName,
    t.mouthTongue ?? 0,
  );
  ctx.restore();
}

export function renderCloudBlob(
  ctx: CanvasRenderingContext2D,
  o: RenderOptions,
): void {
  const renderStart = performance.now();
  const { size, renderScale, params: p, lobeStates, colour, idleTime: t } = o;
  const s = getStamps(ctx, colour, p);
  ctx.canvas.dataset.stampBuilds = String(s.builds);
  ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, TAU);
  ctx.clip();

  // Wisps stay in world space and behind the character.
  for (const w of o.wisps) {
    if (!w.active) continue;
    const elongation = w.shape === 2 ? 1.1 : 1.45;
    // Volumetric billowing smoke puff
    stamp(
      ctx,
      s.smoke,
      w.x,
      w.y,
      w.radius * elongation,
      w.radius * 0.78,
      w.opacity,
      w.angle,
    );
    // Ethereal outer vapor halo
    if (w.shape !== 0) {
      stamp(
        ctx,
        s.mist,
        w.x + Math.cos(w.angle + w.curl) * w.radius * 0.45,
        w.y + Math.sin(w.angle + w.curl) * w.radius * 0.45,
        w.radius * 1.1,
        w.radius * 0.55,
        w.opacity * 0.65,
        w.angle + w.curl,
      );
    }
  }

  // One orientation contract for all authored cloud geometry. Every lobe starts
  // from immutable baseX/baseY/depth, adds its local acting offsets, then its
  // delayed matrix rotates the result. Face uses the immediate acted turn so
  // eyes lead. There is no velocity heading or clamp here.
  const facing = facingOf(p, "face");
  const performanceOrientation = performanceOf(p, "face");
  const faceFrame = makeOrientedFrame(
    {
      yaw: facing.yaw + (p.dragFaceYaw ?? 0),
      pitch: facing.pitch + (p.dragFacePitch ?? 0),
    },
    performanceOrientation,
  );
  const coreFrame = makeOrientedFrame(facingOf(p, "core"), performanceOf(p, "core"));
  const shellFrame = makeOrientedFrame(facingOf(p, "shell"), performanceOf(p, "shell"));
  const crownFrame = makeOrientedFrame(facingOf(p, "crown"), performanceOf(p, "crown"));
  const massFrame = makeOrientedFrame(facingOf(p, "mass"), performanceOf(p, "mass"));
  const finalMatrix = coreFrame.matrix;
  const faceMatrix = faceFrame.matrix;
  const frames = {
    core: coreFrame,
    shell: shellFrame,
    crown: crownFrame,
    mass: massFrame,
  } as const;

  // Contact shadow on the floor (only rendered if explicitly requested, as EnvironmentLayer handles the official grounded shadow)
  if (o.showContactShadow) {
    const altitude = Math.max(0, -p.y);
    const shadowFade = clamp(1 - altitude / 130, 0, 1);
    if (shadowFade > 0.01) {
      const underside = rotateVec3(massFrame.matrix, { x: 0, y: 86, z: -68 });
      const down = rotateVec3(massFrame.matrix, { x: 0, y: 1, z: 0 });
      const grounded = clamp(down.y, 0, 1);
      const height = clamp(1 - p.y / 160, 0.45, 1.35);
      stamp(
        ctx,
        s.shadow,
        size / 2 + p.x * 0.4 + underside.x * 0.38 * p.scale,
        size / 2 + 130 * p.scale + Math.max(0, p.y) * 0.4,
        95 * p.scale * height * (0.58 + 0.42 * grounded),
        13 * p.scale,
        (0.22 / height) * shadowFade * (0.4 + 0.6 * grounded),
      );
    }
  }

  ctx.save();
  ctx.translate(size / 2 + p.x, size / 2 + p.y);
  ctx.rotate((p.rotation * Math.PI) / 180);
  ctx.scale(p.scale * p.scaleX, p.scale * p.scaleY);
  ctx.rotate(o.wallAngle);
  ctx.scale(o.wallScaleX, o.wallScaleY);
  ctx.rotate(-o.wallAngle);
  ctx.globalAlpha = o.rig.blob.opacity;

  // Directional Light Follow:
  // As Cloud moves across the 466 AMOLED screen, the incident directional light follows him
  // with physical angle parallax and compensates for whole-character rotation/lean so the light stays world-anchored.
  const lightParallaxX = clamp((p.x / (size / 2)) * 0.22, -0.25, 0.25);
  const worldRotRad = (p.rotation * Math.PI) / 180;
  const lightFollowRotation = -worldRotRad * 0.65 + lightParallaxX;

  // Lobe 3D pose calculator. Local deformation is resolved by the lobe system
  // first; orientation is a stateless projection of that authored local pose.
  // Eyes use the immediate face matrix; core/shell/mass trail it.
  const getLobePose = (
    def: (typeof LOBE_DEFINITIONS)[number],
    localOffset: Partial<Vec3> = {},
  ): ProjectedLobePose => {
    const frame = frames[layerForLobe(def.id)];
    const l = lobeStates[def.id] ?? { x: def.baseX, y: def.baseY, scaleX: 1, scaleY: 1, opacity: 1, rotation: 0 };
    const local = {
      x: def.baseX + (l.x - def.baseX) + (localOffset.x ?? 0),
      y: def.baseY + (l.y - def.baseY) + (localOffset.y ?? 0),
      z: (def.depth ?? 0) * DEPTH_UNIT + (localOffset.z ?? 0),
    };
    const rotated = rotateVec3(frame.matrix, local);
    // Near/far scale and painter order are both based on this same rotated Z.
    const zNorm = clamp(rotated.z / (DEPTH_UNIT * 3.1), -1, 1);
    const depthScale = clamp(1 + zNorm * 0.11, 0.86, 1.14);
    const softness = clamp(p.lobeSoftness, 0.75, 1.3);
    const depthRadius = (def.radiusX + def.radiusY) * 0.42;
    const rx = Math.max(
      4,
      Math.hypot(
        def.radiusX * l.scaleX * frame.projectedXAxis,
        depthRadius * l.scaleX * frame.projectedZAxis,
      ) * softness * depthScale,
    );
    const ry = Math.max(
      4,
      Math.hypot(
        def.radiusY * l.scaleY * frame.projectedYAxis,
        depthRadius * l.scaleY * frame.projectedZAxis,
      ) * softness * depthScale,
    );

    return {
      x: rotated.x,
      y: rotated.y,
      rx,
      ry,
      opacity: l.opacity,
      rotation: l.rotation + frame.surfaceRotation,
      scaleX: l.scaleX,
      scaleY: l.scaleY,
      z: rotated.z,
      zNorm,
    };
  };

  /** Every mass — including the core — is sorted on its rotated Z each frame. */
  const orderedLobes = LOBE_DEFINITIONS
    .map((def) => ({ def, pose: getLobePose(def) }))
    .sort((a, b) => a.pose.z - b.pose.z);
  const poseFor = (id: string) => orderedLobes.find((entry) => entry.def.id === id)?.pose ?? null;
  const corePose = poseFor("core")!;
  const bottomBellyPose = poseFor("bottomBelly");
  const leftCheekPose = poseFor("leftCheek");
  const rightCheekPose = poseFor("rightCheek");
  const crownPose = poseFor("topCrown");

  // 2. CONNECTIVE CORE BRIDGE (fuses core and bottom belly/base lobes into one continuous solid volume)
  if (bottomBellyPose) {
    const bridgeX = (corePose.x + bottomBellyPose.x) * 0.5;
    const bridgeY = (corePose.y + bottomBellyPose.y) * 0.5;
    stamp(
      ctx,
      s.mass,
      bridgeX,
      bridgeY,
      118 * corePose.scaleX,
      72 * corePose.scaleY,
      0.94,
      lightFollowRotation,
    );
  }

  // 3. DYNAMIC UNDERSIDE AMBIENT OCCLUSION SHADOW (anchored inside lower volume, cleanly contained)
  const trueBottomY = bottomBellyPose
    ? corePose.y * 0.35 + bottomBellyPose.y * 0.65
    : corePose.y + 24;
  stamp(ctx, s.underside, corePose.x, trueBottomY, 116 * corePose.scaleX, 34 * corePose.scaleY, 0.38);

  // 4. ROTATED LOBE STACK. A sub-puff is another local authored offset and
  // therefore passes through `getLobePose` too; it is never appended in screen
  // coordinates after rotation.
  for (const { def, pose } of orderedLobes) {
    const l = lobeStates[def.id] ?? { opacity: 1, scaleX: 1, scaleY: 1 };
    const isVeil = def.id === "frontVeil";
    const isCore = def.id === "core";
    const volume = isVeil ? s.mist : isCore ? s.core : pose.z < 0 ? s.rearMass : s.mass;
    const subs = !isVeil ? LOBE_SUB_PUFFS[def.id] : undefined;
    if (subs && p.fluffiness > 0.05) {
      for (const sub of subs) {
        const breathe = Math.sin(t * 1.1 + (sub.phaseOffset ?? 0)) * 0.7;
        const subPose = getLobePose(def, {
          x: sub.offsetX * p.fluffiness * l.scaleX,
          y: (sub.offsetY * p.fluffiness + breathe) * l.scaleY,
        });
        stamp(
          ctx,
          pose.z < 0 ? s.rearMass : s.mass,
          subPose.x,
          subPose.y,
          subPose.rx * sub.radiusRatio,
          subPose.ry * sub.radiusRatio,
          l.opacity * 0.84,
          subPose.rotation + lightFollowRotation,
        );
      }
    }
    stamp(
      ctx,
      volume,
      pose.x,
      pose.y + (isCore ? 10 : 0),
      isCore ? pose.rx * 1.22 : pose.rx,
      isCore ? pose.ry * 1.18 : pose.ry,
      Math.min(
        1,
        l.opacity * colour.density * (isVeil ? 0.52 : isCore ? p.coreDensity : 1.04) * (1 + pose.zNorm * 0.05),
      ),
      pose.rotation + lightFollowRotation,
    );
  }
  stamp(ctx, s.glow, corePose.x, corePose.y + 12, 80, 70, colour.glowIntensity * 0.16, lightFollowRotation);

  // 5. PROXIMITY-BASED BILLOW CREVICE SHADOWS (soft, only between closely overlapping lobes)
  if (leftCheekPose && Math.hypot(leftCheekPose.x - corePose.x, leftCheekPose.y - corePose.y) < 95) {
    stamp(ctx, s.crevice, leftCheekPose.x * 0.5 + corePose.x * 0.5, leftCheekPose.y * 0.5 + corePose.y * 0.5 + 4, 38, 34, 0.35);
  }
  if (rightCheekPose && Math.hypot(rightCheekPose.x - corePose.x, rightCheekPose.y - corePose.y) < 95) {
    stamp(ctx, s.crevice, rightCheekPose.x * 0.5 + corePose.x * 0.5, rightCheekPose.y * 0.5 + corePose.y * 0.5 + 4, 38, 34, 0.35);
  }
  if (crownPose && Math.hypot(crownPose.x - corePose.x, crownPose.y - corePose.y) < 90) {
    stamp(ctx, s.crevice, crownPose.x * 0.5 + corePose.x * 0.5, crownPose.y * 0.5 + corePose.y * 0.5 + 8, 44, 30, 0.35);
  }

  // 5. TOP CREST & CHEEK RIM LIGHT ACCENTS - Disabled to ensure completely smooth, mark-free cloud surface

  // 8. RESTRAINED INTERNAL LIFE MOTES (Gentle, slow breathing shimmer deep inside volume)
  for (const d of SUSPENDED_DROPLETS) {
    // Smooth, gentle continuous breathing cycle (no abrupt on/off glitter pop)
    const shimmer = 0.5 + 0.5 * Math.sin(t * d.driftSpeed + d.driftPhase);
    if (shimmer < 0.05) continue;
    const dropDepth = d.radius > 2.0 ? 0.8 : -0.6;
    const drop = rotateVec3(finalMatrix, {
      x: d.x * 1.35,
      y: d.y * 1.1,
      z: dropDepth * DEPTH_UNIT,
    });
    const x = corePose.x + drop.x;
    const y = corePose.y + drop.y;
    // Soft ambient mist halo around the mote
    stamp(
      ctx,
      s.mist,
      x,
      y,
      d.radius * 7,
      d.radius * 7,
      shimmer * d.brightness * 0.16,
    );
    // Faint, soft inner glint harmonized with cloud edge tint
    ctx.save();
    ctx.globalAlpha *= shimmer * d.brightness * 0.22;
    ctx.fillStyle = colour.edge;
    ctx.beginPath();
    ctx.arc(x, y, d.radius * 0.55, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // 9. CHEEK BLUSH
  if (p.cheekBlush > 0 && leftCheekPose && rightCheekPose) {
    const leftBlush = rotateVec3(finalMatrix, { x: 18, y: 16, z: 8 });
    const rightBlush = rotateVec3(finalMatrix, { x: -18, y: 16, z: 8 });
    ctx.save();
    ctx.fillStyle = "#e8999f";
    ctx.globalAlpha *= p.cheekBlush * 0.15;
    ctx.beginPath();
    ctx.ellipse(leftCheekPose.x + leftBlush.x, leftCheekPose.y + leftBlush.y, 17, 8, 0, 0, TAU);
    ctx.ellipse(rightCheekPose.x + rightBlush.x, rightCheekPose.y + rightBlush.y, 17, 8, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // 10. LOCAL FACIAL DEPTH EMBEDDING. The front surface normal controls this
  // bed too, so no face-shaped mist survives on the back of the volume.
  const faceFront = smoothstep(-0.05, 0.22, rotateVec3(faceMatrix, { x: 0, y: 0, z: 1 }).z);
  ctx.canvas.dataset.faceFront = faceFront.toFixed(3);
  if (faceFront > 0.01) {
    stamp(ctx, s.core, corePose.x, corePose.y + 8, 96 * corePose.scaleX, 74 * corePose.scaleY, 0.42 * faceFront);
    stamp(ctx, s.mist, corePose.x, corePose.y + 26, 88, 44, Math.max(0.08, p.faceEmbedDepth * 0.2) * faceFront);
    stamp(ctx, s.core, corePose.x, corePose.y - 4, 74 * corePose.scaleX, 54 * corePose.scaleY, (0.2 + p.faceEmbedDepth * 0.35) * faceFront);
  }

  // 11. CURVED PRODUCTION FACE. Anchors have their own depth and normal, but
  // use the same FinalOrientation matrix as the lobe stack.
  if (o.showFace && faceFront > 0.01) drawFace(ctx, o, faceMatrix, corePose);
  // Two very light veils across the outer face field: a wide one that ties the
  // whole feature group into the body, and a tighter one that softens the
  // material immediately around the features. Both stay far below the level
  // that would grey the black itself — they only stop the outline reading as
  // a decal laid over the volume.
  if (o.showFace && faceFront > 0.01) {
    stamp(ctx, s.mist, corePose.x, corePose.y + 2, 108 * corePose.scaleX, 76 * corePose.scaleY, (0.06 + p.faceEmbedDepth * 0.12) * faceFront);
    stamp(ctx, s.mist, corePose.x, corePose.y + 10, 76 * corePose.scaleX, 50 * corePose.scaleY, (0.04 + p.faceEmbedDepth * 0.08) * faceFront);
  }

  if (o.debug) {
    ctx.strokeStyle = "#f0bb65";
    ctx.fillStyle = "#f0bb65";
    ctx.lineWidth = 0.7;
    for (const def of LOBE_DEFINITIONS) {
      const pose = getLobePose(def);
      ctx.beginPath();
      ctx.ellipse(
        pose.x,
        pose.y,
        pose.rx,
        pose.ry,
        pose.rotation,
        0,
        TAU,
      );
      ctx.stroke();
      ctx.fillRect(pose.x - 1.5, pose.y - 1.5, 3, 3);
      if (def.id !== "core" && def.id !== "frontVeil") {
        ctx.strokeStyle = "rgba(240,187,101,0.45)";
        ctx.beginPath();
        ctx.moveTo(corePose.x, corePose.y);
        ctx.lineTo(pose.x, pose.y);
        ctx.stroke();
        ctx.strokeStyle = "#f0bb65";
      }
    }
    ctx.strokeStyle = "#ed768e";
    ctx.strokeRect(corePose.x - 5, corePose.y - 5, 10, 10);

    const grabX = p.contactRelX ?? 0;
    const grabY = p.contactRelY ?? 0;
    if ((p.grabPressure ?? 0) > 0.01 || Math.hypot(grabX, grabY) > 1) {
      const radius = p.influenceRadius ?? 58;
      ctx.strokeStyle = "rgba(244,63,94,0.7)";
      ctx.beginPath();
      ctx.arc(grabX, grabY, radius, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = "#f43f5e";
      ctx.beginPath();
      ctx.arc(grabX, grabY, 3.5, 0, TAU);
      ctx.fill();
    }

    const wnx = p.contactX ?? 0;
    const wny = p.contactY ?? 0;
    if ((p.contactPressure ?? 0) > 0.04) {
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(corePose.x, corePose.y);
      ctx.lineTo(corePose.x + wnx * 42, corePose.y + wny * 42);
      ctx.stroke();
    }
  }
  ctx.restore();

  if (o.debug) {
    ctx.strokeStyle = "#80d8b5";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, o.safeRadius, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(size / 2 + p.x, size / 2 + p.y);
    ctx.lineTo(size / 2 + p.x + o.vx * 0.1, size / 2 + p.y + o.vy * 0.1);
    ctx.stroke();
  }
  ctx.restore();

  // The panel crop is re-applied as an antialiased alpha mask. `clip()` alone
  // is a hard 1-bit edge, which left the outermost ring of the round display
  // as a stair-stepped line against the bezel — read as a pale halo.
  ctx.save();
  ctx.globalCompositeOperation = "destination-in";
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, TAU);
  ctx.fillStyle = "#000";
  ctx.fill();
  ctx.restore();
  ctx.canvas.dataset.renderMs = (performance.now() - renderStart).toFixed(2);
}
