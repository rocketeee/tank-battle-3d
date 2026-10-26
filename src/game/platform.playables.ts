/** Playables never takes the desktop-only path, and does not import Capacitor. */
export function isDesktopWeb(): boolean {
  return false;
}
