import type { TrackDefinition } from '../../core/types';
import { sunnyCircuit } from './sunnyCircuit';
import { duneDrift } from './duneDrift';
import { frostbiteFalls } from './frostbiteFalls';
import { neonNexus } from './neonNexus';
import { coastalRush } from './coastalRush';
import { summerBeach } from './summerBeach';
import { summerHarbor } from './summerHarbor';
import { summerSunset } from './summerSunset';
import { summerTropical } from './summerTropical';
import { summerLighthouse } from './summerLighthouse';
import { validateAllTracks } from './validate';

export {
  sunnyCircuit,
  duneDrift,
  frostbiteFalls,
  neonNexus,
  coastalRush,
  summerBeach,
  summerHarbor,
  summerSunset,
  summerTropical,
  summerLighthouse,
};

/** Free-race menu order, including all Copa Verão circuits. */
export const TRACKS: TrackDefinition[] = [
  sunnyCircuit,
  duneDrift,
  frostbiteFalls,
  neonNexus,
  coastalRush,
  summerBeach,
  summerHarbor,
  summerSunset,
  summerTropical,
  summerLighthouse,
];

/** Official Copa Verão order. */
export const SUMMER_CUP_TRACK_IDS = [
  'summer_beach',
  'summer_harbor',
  'summer_sunset',
  'summer_tropical',
  'summer_lighthouse',
] as const;

/** Look up a track by id; falls back to the first track for unknown ids. */
export function getTrackDef(id: string): TrackDefinition {
  return TRACKS.find((t) => t.id === id) ?? TRACKS[0];
}

if (import.meta.env.DEV) {
  validateAllTracks(TRACKS);
}
