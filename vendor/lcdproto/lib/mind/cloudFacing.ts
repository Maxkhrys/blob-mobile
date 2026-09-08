import {
  lagAngle,
  type FacingOrientation,
  type PerformanceOrientation,
} from "../orientation";

/**
 * Final renderer boundary. It accepts only acted orientation — never position,
 * velocity, pointer direction, or renderer-invented heading.
 *
 * Immediate facing/performance are a straight copy of the acted rig. Delayed
 * copies are secondary follow-through on those same unwrapped numbers:
 * eyes → core → cheeks → crown → belly. None of them become a second heading
 * owner. 181° stays 181°.
 */
export interface CloudFacing {
  facingYaw: number;
  facingPitch: number;
  performanceYaw: number;
  performancePitch: number;
  performanceRoll: number;
  coreFacingYaw: number;
  coreFacingPitch: number;
  corePerformanceYaw: number;
  corePerformancePitch: number;
  corePerformanceRoll: number;
  shellFacingYaw: number;
  shellFacingPitch: number;
  shellPerformanceYaw: number;
  shellPerformancePitch: number;
  shellPerformanceRoll: number;
  crownFacingYaw: number;
  crownFacingPitch: number;
  crownPerformanceYaw: number;
  crownPerformancePitch: number;
  crownPerformanceRoll: number;
  massFacingYaw: number;
  massFacingPitch: number;
  massPerformanceYaw: number;
  massPerformancePitch: number;
  massPerformanceRoll: number;
}

export const NEUTRAL_CLOUD_FACING: CloudFacing = {
  facingYaw: 0,
  facingPitch: 0,
  performanceYaw: 0,
  performancePitch: 0,
  performanceRoll: 0,
  coreFacingYaw: 0,
  coreFacingPitch: 0,
  corePerformanceYaw: 0,
  corePerformancePitch: 0,
  corePerformanceRoll: 0,
  shellFacingYaw: 0,
  shellFacingPitch: 0,
  shellPerformanceYaw: 0,
  shellPerformancePitch: 0,
  shellPerformanceRoll: 0,
  crownFacingYaw: 0,
  crownFacingPitch: 0,
  crownPerformanceYaw: 0,
  crownPerformancePitch: 0,
  crownPerformanceRoll: 0,
  massFacingYaw: 0,
  massFacingPitch: 0,
  massPerformanceYaw: 0,
  massPerformancePitch: 0,
  massPerformanceRoll: 0,
};

/** Eyes are immediate. Core starts following right after. */
const CORE_TAU = 0.048;
/** Near/far cheeks trail the face. */
const SHELL_YAW_TAU = 0.105;
const SHELL_PITCH_TAU = 0.13;
/** Crown follows the cheeks. */
const CROWN_TAU = 0.145;
/** Belly and rear shelf settle last. */
const MASS_TAU = 0.165;

export function applyCloudFacing(
  out: CloudFacing,
  facing: FacingOrientation,
  performance: PerformanceOrientation,
  dt = 0,
): void {
  out.facingYaw = facing.yaw;
  out.facingPitch = facing.pitch;
  out.performanceYaw = performance.yaw;
  out.performancePitch = performance.pitch;
  out.performanceRoll = performance.roll;

  // dt<=0 updates the acted heading only. Delayed copies stay put so a
  // zero-dt React commit cannot snap cheeks/crown/belly onto the face.
  if (!(dt > 0)) return;

  out.coreFacingYaw = lagAngle(out.coreFacingYaw ?? 0, facing.yaw, dt, CORE_TAU);
  out.coreFacingPitch = lagAngle(out.coreFacingPitch ?? 0, facing.pitch, dt, CORE_TAU);
  out.corePerformanceYaw = lagAngle(out.corePerformanceYaw ?? 0, performance.yaw, dt, CORE_TAU);
  out.corePerformancePitch = lagAngle(out.corePerformancePitch ?? 0, performance.pitch, dt, CORE_TAU);
  out.corePerformanceRoll = lagAngle(out.corePerformanceRoll ?? 0, performance.roll, dt, CORE_TAU);

  out.shellFacingYaw = lagAngle(out.shellFacingYaw ?? 0, facing.yaw, dt, SHELL_YAW_TAU);
  out.shellFacingPitch = lagAngle(out.shellFacingPitch ?? 0, facing.pitch, dt, SHELL_PITCH_TAU);
  out.shellPerformanceYaw = lagAngle(out.shellPerformanceYaw ?? 0, performance.yaw, dt, SHELL_YAW_TAU);
  out.shellPerformancePitch = lagAngle(out.shellPerformancePitch ?? 0, performance.pitch, dt, SHELL_PITCH_TAU);
  out.shellPerformanceRoll = lagAngle(out.shellPerformanceRoll ?? 0, performance.roll, dt, SHELL_YAW_TAU);

  out.crownFacingYaw = lagAngle(out.crownFacingYaw ?? 0, facing.yaw, dt, CROWN_TAU);
  out.crownFacingPitch = lagAngle(out.crownFacingPitch ?? 0, facing.pitch, dt, CROWN_TAU);
  out.crownPerformanceYaw = lagAngle(out.crownPerformanceYaw ?? 0, performance.yaw, dt, CROWN_TAU);
  out.crownPerformancePitch = lagAngle(out.crownPerformancePitch ?? 0, performance.pitch, dt, CROWN_TAU);
  out.crownPerformanceRoll = lagAngle(out.crownPerformanceRoll ?? 0, performance.roll, dt, CROWN_TAU);

  out.massFacingYaw = lagAngle(out.massFacingYaw ?? 0, facing.yaw, dt, MASS_TAU);
  out.massFacingPitch = lagAngle(out.massFacingPitch ?? 0, facing.pitch, dt, MASS_TAU);
  out.massPerformanceYaw = lagAngle(out.massPerformanceYaw ?? 0, performance.yaw, dt, MASS_TAU);
  out.massPerformancePitch = lagAngle(out.massPerformancePitch ?? 0, performance.pitch, dt, MASS_TAU);
  out.massPerformanceRoll = lagAngle(out.massPerformanceRoll ?? 0, performance.roll, dt, MASS_TAU);
}
