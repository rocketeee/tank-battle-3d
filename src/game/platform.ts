import { Capacitor } from '@capacitor/core';
import { usesTouchControls } from './controlMode';

/** Desktop web: keyboard and mouse. App and phone browsers stay on the touch HUD. */
export function isDesktopWeb(): boolean {
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const hoverNone = window.matchMedia?.('(hover: none)').matches ?? false;
  return !usesTouchControls(Capacitor.isNativePlatform(), coarse, hoverNone);
}
