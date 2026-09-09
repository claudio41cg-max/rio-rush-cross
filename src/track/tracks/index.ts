import type { TrackDefinition } from '../../core/types';
import { sunnyCircuit } from './sunnyCircuit';
import { duneDrift } from './duneDrift';
import { frostbiteFalls } from './frostbiteFalls';
import { neonNexus } from './neonNexus';
import { coastalRush } from './coastalRush';
import { summerBeach } from './summerBeach';
import { summerSunset } from './summerSunset';
import { summerTropical } from './summerTropical';
import { validateAllTracks } from './validate';

export {
  sunnyCircuit,
  duneDrift,
  frostbiteFalls,
  neonNexus,
  coastalRush,
  summerBeach,
  summerSunset,
  summerTropical,
};

/** Free-race menu order, including the first three Copa Verão circuits. */
export const TRACKS: TrackDefinition[] = [
  sunnyCircuit,
  duneDrift,
  frostbiteFalls,
  neonNexus,
  coastalRush,
  summerBeach,
  summerSunset,
  summerTropical,
];

export const SUMMER_CUP_TRACK_IDS = ['summer_beach', 'summer_sunset', 'summer_tropical'] as const;

/** Look up a track by id; falls back to the first track for unknown ids. */
export function getTrackDef(id: string): TrackDefinition {
  return TRACKS.find((t) => t.id === id) ?? TRACKS[0];
}

if (import.meta.env.DEV) {
  validateAllTracks(TRACKS);
}
