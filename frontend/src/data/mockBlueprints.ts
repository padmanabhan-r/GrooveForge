export interface Blueprint {
  id: string;
  genre: string;
  subgenre: string;
  bpm: number;
  key: string;
  mode: string;
  energy: number; // 0-100
  mood: string;
  instrumentation: string[];
  relevance: number; // 0-100
}

export const mockBlueprints: Blueprint[] = [
  {
    id: '1',
    genre: 'Synth-Pop',
    subgenre: 'Dream Pop',
    bpm: 118,
    key: 'C',
    mode: 'Minor',
    energy: 62,
    mood: 'Dreamy',
    instrumentation: ['Synth Pads', 'Drum Machine', 'Bass'],
    relevance: 94,
  },
  {
    id: '2',
    genre: 'Synthwave',
    subgenre: 'Darkwave',
    bpm: 108,
    key: 'A',
    mode: 'Minor',
    energy: 55,
    mood: 'Moody',
    instrumentation: ['Analog Synth', 'Arpeggios', 'Reverb Drums'],
    relevance: 88,
  },
  {
    id: '3',
    genre: 'Electronic',
    subgenre: 'Ambient',
    bpm: 95,
    key: 'D',
    mode: 'Dorian',
    energy: 35,
    mood: 'Atmospheric',
    instrumentation: ['Pad Textures', 'Sub Bass', 'Field Recordings'],
    relevance: 76,
  },
  {
    id: '4',
    genre: 'Indie',
    subgenre: 'Shoegaze',
    bpm: 122,
    key: 'E',
    mode: 'Minor',
    energy: 70,
    mood: 'Melancholic',
    instrumentation: ['Distorted Guitar', 'Ethereal Vocals', 'Drums'],
    relevance: 71,
  },
  {
    id: '5',
    genre: 'Pop',
    subgenre: 'Electropop',
    bpm: 126,
    key: 'G',
    mode: 'Major',
    energy: 78,
    mood: 'Euphoric',
    instrumentation: ['Synth Lead', 'Claps', 'Vocal Chops', 'Bass'],
    relevance: 65,
  },
];

export const mockAggregatedProfile = {
  avgBpm: 114,
  dominantKey: 'C Minor',
  genreCluster: 'Synth-Pop / Darkwave',
  moodCluster: 'Dreamy · Moody',
};
