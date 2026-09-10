import * as THREE from 'three';
import type { BuildContext } from './context';

/**
 * Temporary mobile-safe Summer Cup scenery.
 *
 * The previous version created dozens of palm groups, umbrellas and large
 * transparent water planes while the race was being built synchronously.
 * On some Android devices that can stall the main thread before Game reaches
 * the countdown. Keep the track, road, barriers, terrain and race mechanics
 * untouched while we isolate the bottleneck.
 */
export function buildSummerScenery(ctx: BuildContext): THREE.Group {
  const root = new THREE.Group();
  root.name = 'summer-scenery-lite';

  const isSummer =
    ctx.def.id === 'summer_beach' ||
    ctx.def.id === 'summer_sunset' ||
    ctx.def.id === 'summer_tropical';

  if (!isSummer) return root;

  return root;
}
