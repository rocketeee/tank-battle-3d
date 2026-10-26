/** Native shell and coarse phone browsers keep the dual-stick HUD. */
export function usesTouchControls(native: boolean, coarsePointer: boolean, hoverNone: boolean): boolean {
  return native || (coarsePointer && hoverNone);
}
