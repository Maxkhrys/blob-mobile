/**
 * Tiny, allocation-free-friendly orientation math shared by Cherri's acting
 * layer and cloud renderer. Coordinates use +Z toward the viewer, +X right,
 * and +Y down to match the 466px canvas.
 *
 * `FacingOrientation` says where Cherri chooses to look. `PerformanceOrientation`
 * is an authored move layered over it. Keeping them separate avoids every
 * renderer/physics path inventing its own turn interpretation.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface FacingOrientation {
  yaw: number;
  pitch: number;
}

export interface PerformanceOrientation {
  yaw: number;
  pitch: number;
  roll: number;
}

export interface Orientation extends FacingOrientation, PerformanceOrientation {}

/** Row-major 3×3 matrix. */
export type Mat3 = readonly [
  number, number, number,
  number, number, number,
  number, number, number,
];

export const IDENTITY_MATRIX: Mat3 = [
  1, 0, 0,
  0, 1, 0,
  0, 0, 1,
];

export const NEUTRAL_FACING: FacingOrientation = { yaw: 0, pitch: 0 };
export const NEUTRAL_PERFORMANCE: PerformanceOrientation = {
  yaw: 0,
  pitch: 0,
  roll: 0,
};

const DEG = Math.PI / 180;

export function degToRad(degrees: number): number {
  return degrees * DEG;
}

/**
 * Builds Rz(roll) × Rx(pitch) × Ry(yaw). Yaw first turns the front surface,
 * pitch then tumbles it, and roll remains an actual volume rotation rather
 * than a canvas transform.
 */
export function orientationMatrix(orientation: Partial<Orientation>): Mat3 {
  const yaw = degToRad(orientation.yaw ?? 0);
  const pitch = degToRad(orientation.pitch ?? 0);
  const roll = degToRad(orientation.roll ?? 0);

  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const cr = Math.cos(roll);
  const sr = Math.sin(roll);

  return [
    cr * cy - sr * sp * sy,
    -sr * cp,
    cr * sy + sr * sp * cy,
    sr * cy + cr * sp * sy,
    cr * cp,
    sr * sy - cr * sp * cy,
    -cp * sy,
    sp,
    cp * cy,
  ];
}

export function multiplyMat3(a: Mat3, b: Mat3): Mat3 {
  return [
    a[0] * b[0] + a[1] * b[3] + a[2] * b[6],
    a[0] * b[1] + a[1] * b[4] + a[2] * b[7],
    a[0] * b[2] + a[1] * b[5] + a[2] * b[8],
    a[3] * b[0] + a[4] * b[3] + a[5] * b[6],
    a[3] * b[1] + a[4] * b[4] + a[5] * b[7],
    a[3] * b[2] + a[4] * b[5] + a[5] * b[8],
    a[6] * b[0] + a[7] * b[3] + a[8] * b[6],
    a[6] * b[1] + a[7] * b[4] + a[8] * b[7],
    a[6] * b[2] + a[7] * b[5] + a[8] * b[8],
  ];
}

/** FinalOrientation = Facing × Performance. */
export function composeOrientation(
  facing: FacingOrientation,
  performance: PerformanceOrientation,
): Mat3 {
  return multiplyMat3(orientationMatrix(facing), orientationMatrix(performance));
}

export function rotateVec3(matrix: Mat3, vector: Vec3): Vec3 {
  return {
    x: matrix[0] * vector.x + matrix[1] * vector.y + matrix[2] * vector.z,
    y: matrix[3] * vector.x + matrix[4] * vector.y + matrix[5] * vector.z,
    z: matrix[6] * vector.x + matrix[7] * vector.y + matrix[8] * vector.z,
  };
}

export function dotVec3(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function lengthVec3(vector: Vec3): number {
  return Math.hypot(vector.x, vector.y, vector.z);
}

export function normalizeVec3(vector: Vec3): Vec3 {
  const length = lengthVec3(vector);
  if (length <= 1e-8) return { x: 0, y: 0, z: 0 };
  return {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length,
  };
}

/** Returns target's 360° equivalent nearest to `current`, for spring paths. */
export function nearestEquivalentAngle(target: number, current: number): number {
  return target + Math.round((current - target) / 360) * 360;
}

/**
 * Exponential follow of an unwrapped angle. 359° → 10° becomes 370°, never a
 * reverse spin through the front. Secondary motion uses this; Mind does not.
 */
export function lagAngle(current: number, target: number, dt: number, tau: number): number {
  const unwrapped = nearestEquivalentAngle(target, current);
  const step = Math.max(0, Math.min(dt, 0.05));
  if (tau <= 1e-6 || step <= 0) return unwrapped;
  return current + (unwrapped - current) * (1 - Math.exp(-step / tau));
}

/**
 * Interaction/lab interrupt helper. A barely-started turn returns the short
 * way home. A committed turn (past ~80°) finishes in the direction already
 * travelled so a grab at 180° never rewinds through the face.
 */
export function settleTurnAngle(current: number): number {
  if (!Number.isFinite(current)) return 0;
  const wrapped = ((current % 360) + 360) % 360;
  if (wrapped < 80 || wrapped > 280) {
    return nearestEquivalentAngle(0, current);
  }
  if (current >= 0) return current + ((360 - wrapped) % 360);
  return current - wrapped;
}

export function finiteVec3(vector: Vec3): boolean {
  return Number.isFinite(vector.x) && Number.isFinite(vector.y) && Number.isFinite(vector.z);
}
