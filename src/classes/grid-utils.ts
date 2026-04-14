import { Direction, GridEngine } from "grid-engine";

/**
 * Returns the tile a character is moving TO (if moving),
 * or their current tile (if stationary).
 */
export function getEffectivePosition(gridEngine: GridEngine, charId: string): { x: number; y: number } {
  const pos = gridEngine.getPosition(charId);
  if (!gridEngine.isMoving(charId)) return pos;

  const dir = gridEngine.getFacingDirection(charId);
  const dx = dir === Direction.LEFT ? -1 : dir === Direction.RIGHT ? 1 : 0;
  const dy = dir === Direction.UP ? -1 : dir === Direction.DOWN ? 1 : 0;
  return { x: pos.x + dx, y: pos.y + dy };
}
