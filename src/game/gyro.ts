/**
 * Rotate a device-frame tilt delta into screen-space yaw/pitch.
 *
 * `dx` = left-right tilt (gamma) and `dy` = front-back tilt (beta), both reported
 * in the device's natural (portrait) frame by `deviceorientation`. `angle` is the
 * current screen rotation in degrees (0/90/180/270). At 0° this is the identity
 * (portrait); at 90°/270° (landscape) the axes swap so the look direction matches
 * how the phone is physically held.
 */
export function remapGyroDelta(dx: number, dy: number, angle: number): { yaw: number; pitch: number } {
  const rad = (angle * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return { yaw: dx * c + dy * s, pitch: -dx * s + dy * c };
}

/** Current screen rotation in degrees (0/90/180/270), normalized to [0,360). */
export function screenAngle(): number {
  const so = screen.orientation;
  if (so && typeof so.angle === 'number') return ((so.angle % 360) + 360) % 360;
  const wo = (window as unknown as { orientation?: number }).orientation;
  if (typeof wo === 'number') return ((wo % 360) + 360) % 360;
  return 0;
}
