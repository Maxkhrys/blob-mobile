/** Final renderer boundary: no position, velocity, or behaviour inputs. */
export interface CloudFacing { turnYaw: number; turnPitch: number; shellYaw: number; shellPitch: number }
export function applyCloudFacing(out: CloudFacing, yaw: number, pitch: number, dt: number): void {
  const signedYaw = ((yaw + 180) % 360 + 360) % 360 - 180;
  out.turnYaw = Math.max(-45, Math.min(45, signedYaw));
  out.turnPitch = Math.max(-30, Math.min(30, pitch));
  const step = Math.max(0, Math.min(dt, 0.05));
  out.shellYaw += (out.turnYaw - out.shellYaw) * (1 - Math.exp(-step / 0.105));
  out.shellPitch += (out.turnPitch - out.shellPitch) * (1 - Math.exp(-step / 0.13));
}
