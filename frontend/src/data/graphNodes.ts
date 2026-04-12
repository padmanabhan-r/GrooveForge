// Expanding bubble graph hierarchy for GrooveForge vibe selection

export interface NodeQuery {
  vibes?: string[];
  free_text?: string;
  bpm_lower?: number;
  bpm_upper?: number;
  key?: string;
  vocal_type?: string;
}

export interface BubbleNodeDef {
  id: string;
  label: string;
  query: NodeQuery;
  children?: BubbleNodeDef[];
}

export interface RootDef {
  id: string;
  label: string;
  hue: number;           // HSL hue for this category's color
  icon: string;          // emoji icon
  children: BubbleNodeDef[];
}

// Matches backend SearchRequest model
export interface SearchQuery {
  vibes: string[];
  free_text: string;
  bpm_lower: number | null;
  bpm_upper: number | null;
  key: string | null;
  vocal_type: string | null;
  top_k: number;
}

export const roots: RootDef[] = [
  {
    id: 'genre', label: 'Genre', hue: 260, icon: '🎸',
    children: [
      { id: 'g-electronic', label: 'Electronic', query: { free_text: 'electronic synthesized' }, children: [
        { id: 'g-synthwave',  label: 'Synthwave',   query: { vibes: ['synthwave'],        free_text: 'retro 80s analog synth' } },
        { id: 'g-ambient',   label: 'Ambient',      query: { vibes: ['ambient'],          free_text: 'atmospheric drone texture' } },
        { id: 'g-techno',    label: 'Techno',       query: { vibes: ['techno'],           free_text: 'industrial club beat' } },
        { id: 'g-house',     label: 'House',        query: { vibes: ['house'],            free_text: 'house music four-on-the-floor Chicago' } },
        { id: 'g-dnb',       label: 'Drum & Bass',  query: { vibes: ['drum and bass'],    free_text: 'drum and bass jungle breakbeat fast' } },
        { id: 'g-trance',    label: 'Trance',       query: { vibes: ['trance'],           free_text: 'trance progressive euphoric melodic' } },
        { id: 'g-dubstep',   label: 'Dubstep',      query: { vibes: ['dubstep'],          free_text: 'dubstep bass wobble drop heavy' } },
      ]},
      { id: 'g-hiphop', label: 'Hip-Hop', query: { free_text: 'hip-hop rap beats' }, children: [
        { id: 'g-trap',      label: 'Trap',         query: { vibes: ['trap'],             free_text: 'trap 808 hi-hats Atlanta' } },
        { id: 'g-lofi',      label: 'Lo-fi',        query: { vibes: ['lo-fi'],            free_text: 'lofi chill study beats vinyl' } },
        { id: 'g-boombap',   label: 'Boom Bap',     query: { vibes: ['boom bap'],         free_text: 'classic hip-hop sample chops NYC' } },
        { id: 'g-drill',     label: 'Drill',        query: { vibes: ['drill'],            free_text: 'drill dark trap Chicago UK slide' } },
        { id: 'g-cloudrap',  label: 'Cloud Rap',    query: { vibes: ['cloud rap'],        free_text: 'cloud rap hazy melodic ethereal rap' } },
        { id: 'g-conscious', label: 'Conscious',    query: { vibes: ['conscious hip-hop'],free_text: 'conscious hip-hop lyrical political spoken' } },
      ]},
      { id: 'g-rock', label: 'Rock', query: { free_text: 'rock guitar drums bass' }, children: [
        { id: 'g-altrock',    label: 'Alt Rock',    query: { vibes: ['alternative rock'], free_text: 'alternative rock guitar distortion 90s' } },
        { id: 'g-classicrock',label: 'Classic Rock',query: { vibes: ['classic rock'],    free_text: 'classic rock riff driven blues 70s' } },
        { id: 'g-punk',       label: 'Punk',        query: { vibes: ['punk'],             free_text: 'punk fast aggressive raw guitar energy' } },
        { id: 'g-grunge',     label: 'Grunge',      query: { vibes: ['grunge'],           free_text: 'grunge Seattle distortion heavy loud' } },
        { id: 'g-postrock',   label: 'Post-Rock',   query: { vibes: ['post-rock'],        free_text: 'post-rock instrumental epic crescendo' } },
        { id: 'g-psych',      label: 'Psych Rock',  query: { vibes: ['psychedelic rock'], free_text: 'psychedelic rock garage fuzz reverb hazy' } },
      ]},
      { id: 'g-metal', label: 'Metal', query: { free_text: 'metal heavy distorted guitar' }, children: [
        { id: 'g-trad-metal',    label: 'Traditional',       query: { vibes: ['traditional metal', 'NWOBHM'],  free_text: 'classic heavy metal NWOBHM power riff' } },
        { id: 'g-thrash',        label: 'Thrash',             query: { vibes: ['thrash metal', 'speed metal'],  free_text: 'thrash metal fast aggressive shredding riff' } },
        { id: 'g-death-metal',   label: 'Death Metal',        query: { vibes: ['death metal'],                  free_text: 'death metal blast beats brutal growl technical' } },
        { id: 'g-black-metal',   label: 'Black Metal',        query: { vibes: ['black metal'],                  free_text: 'black metal atmospheric cold raw tremolo' } },
        { id: 'g-doom-gothic',   label: 'Doom / Gothic',      query: { vibes: ['doom metal', 'gothic metal'],  free_text: 'doom metal slow heavy crushing gothic dark' } },
        { id: 'g-power-symphonic',label: 'Power / Symphonic', query: { vibes: ['power metal', 'symphonic metal'], free_text: 'power metal symphonic operatic melodic epic' } },
        { id: 'g-prog-metal',    label: 'Progressive',        query: { vibes: ['progressive metal'],            free_text: 'progressive metal technical time signature complex' } },
        { id: 'g-metalcore',     label: 'Metalcore',          query: { vibes: ['metalcore'],                    free_text: 'metalcore breakdown clean chorus heavy guitar' } },
        { id: 'g-deathcore',     label: 'Deathcore',          query: { vibes: ['deathcore'],                    free_text: 'deathcore slam breakdown brutal modern heavy' } },
        { id: 'g-alt-metal',     label: 'Alt / Fusion Metal', query: { vibes: ['nu-metal', 'industrial metal'], free_text: 'nu-metal industrial rap metal alternative fusion' } },
      ]},
      { id: 'g-indie', label: 'Indie', query: { free_text: 'indie alternative independent' }, children: [
        { id: 'g-indierock',  label: 'Indie Rock',     query: { vibes: ['indie rock'],   free_text: 'guitar driven indie band jangly' } },
        { id: 'g-folk',       label: 'Folk',           query: { vibes: ['folk'],         free_text: 'acoustic folk storytelling fingerpicked' } },
        { id: 'g-shoegaze',   label: 'Shoegaze',       query: { vibes: ['shoegaze'],     free_text: 'shoegaze wall of sound dreamy distortion' } },
        { id: 'g-postpunk',   label: 'Post-Punk',      query: { vibes: ['post-punk'],    free_text: 'post-punk darkwave angular bass driven' } },
        { id: 'g-mathrock',   label: 'Math Rock',      query: { vibes: ['math rock'],    free_text: 'math rock emo polyrhythm intricate guitar' } },
      ]},
      { id: 'g-jazz', label: 'Jazz', query: { free_text: 'jazz improvisation swing' }, children: [
        { id: 'g-bebop',      label: 'Bebop',          query: { vibes: ['bebop'],        free_text: 'bebop complex chord changes fast jazz' } },
        { id: 'g-neosoul',    label: 'Neo Soul',       query: { vibes: ['neo soul'],     free_text: 'neo soul soulful groove R&B jazz warm' } },
        { id: 'g-orchestral', label: 'Orchestral',     query: { vibes: ['orchestral'],   free_text: 'full orchestra strings brass cinematic' } },
        { id: 'g-jazzfusion', label: 'Jazz Fusion',    query: { vibes: ['jazz fusion'],  free_text: 'jazz fusion electric fusion Miles Davis' } },
        { id: 'g-smoothjazz', label: 'Smooth Jazz',    query: { vibes: ['smooth jazz'],  free_text: 'smooth jazz mellow contemporary soft' } },
        { id: 'g-latinjazz',  label: 'Latin Jazz',     query: { vibes: ['latin jazz'],   free_text: 'latin jazz salsa Cuban bossa nova rhythm' } },
      ]},
      { id: 'g-pop', label: 'Pop', query: { free_text: 'pop melodic catchy hook' }, children: [
        { id: 'g-dreampop',   label: 'Dream Pop',      query: { vibes: ['dream pop'],    free_text: 'dream pop reverb ethereal shimmering' } },
        { id: 'g-rnb',        label: 'R&B',            query: { vibes: ['r&b'],          free_text: 'rhythm and blues smooth soul contemporary' } },
        { id: 'g-neoclassical',label: 'Neoclassical',  query: { vibes: ['neoclassical'], free_text: 'neoclassical sparse piano minimalist' } },
        { id: 'g-electropop', label: 'Electropop',     query: { vibes: ['electropop'],   free_text: 'electropop synth pop catchy electronic hook' } },
        { id: 'g-dancepop',   label: 'Dance-Pop',      query: { vibes: ['dance pop'],    free_text: 'dance pop upbeat club radio hit' } },
      ]},
    ],
  },
  {
    id: 'mood', label: 'Mood', hue: 220, icon: '🌊',
    children: [
      { id: 'm-dark', label: 'Dark', query: { vibes: ['dark', 'brooding'] }, children: [
        { id: 'm-eerie', label: 'Eerie', query: { vibes: ['eerie', 'unsettling', 'mysterious'] } },
        { id: 'm-menacing', label: 'Menacing', query: { vibes: ['menacing', 'threatening'] } },
      ]},
      { id: 'm-dreamy', label: 'Dreamy', query: { vibes: ['dreamy', 'ethereal'] }, children: [
        { id: 'm-hazy', label: 'Hazy', query: { vibes: ['hazy', 'foggy', 'blurry'] } },
        { id: 'm-nostalgic', label: 'Nostalgic', query: { vibes: ['nostalgic', 'wistful', 'longing'] } },
      ]},
      { id: 'm-energetic', label: 'Energetic', query: { vibes: ['energetic', 'powerful'] }, children: [
        { id: 'm-driving', label: 'Driving', query: { vibes: ['driving', 'relentless', 'propulsive'] } },
        { id: 'm-uplifting', label: 'Uplifting', query: { vibes: ['uplifting', 'motivational', 'inspiring'] } },
      ]},
      { id: 'm-melancholic', label: 'Melancholic', query: { vibes: ['melancholic', 'sad', 'sorrowful'] }, children: [
        { id: 'm-somber', label: 'Somber', query: { vibes: ['somber', 'solemn', 'mournful'] } },
        { id: 'm-bittersweet', label: 'Bittersweet', query: { vibes: ['bittersweet', 'tender', 'poignant'] } },
      ]},
      { id: 'm-euphoric', label: 'Euphoric', query: { vibes: ['euphoric', 'blissful', 'joyful'] }, children: [
        { id: 'm-triumphant', label: 'Triumphant', query: { vibes: ['triumphant', 'victorious', 'celebratory'] } },
        { id: 'm-ecstatic', label: 'Ecstatic', query: { vibes: ['ecstatic', 'elated', 'rapturous'] } },
      ]},
      { id: 'm-peaceful', label: 'Peaceful', query: { vibes: ['peaceful', 'serene', 'tranquil'] }, children: [
        { id: 'm-meditative', label: 'Meditative', query: { vibes: ['meditative', 'contemplative'] } },
        { id: 'm-warm', label: 'Warm', query: { vibes: ['warm', 'cozy', 'comforting'] } },
      ]},
    ],
  },
  {
    id: 'tempo', label: 'Tempo', hue: 35, icon: '⚡',
    children: [
      { id: 't-slow', label: '< 80 BPM', query: { bpm_upper: 80, free_text: 'slow ballad' }, children: [] },
      { id: 't-mid', label: '80–110 BPM', query: { bpm_lower: 80, bpm_upper: 110, free_text: 'mid tempo groove' }, children: [] },
      { id: 't-upbeat', label: '110–130 BPM', query: { bpm_lower: 110, bpm_upper: 130, free_text: 'upbeat dance' }, children: [] },
      { id: 't-fast', label: '130+ BPM', query: { bpm_lower: 130, free_text: 'fast driving' }, children: [] },
    ],
  },
  {
    id: 'key', label: 'Key & Mode', hue: 165, icon: '🎵',
    children: [
      { id: 'k-ionian',     label: 'Ionian',     query: { key: 'ionian',     free_text: 'ionian major scale bright happy uplifting C major' },         children: [] },
      { id: 'k-dorian',     label: 'Dorian',     query: { key: 'dorian',     free_text: 'dorian mode minor jazzy funky soulful D minor' },             children: [] },
      { id: 'k-phrygian',   label: 'Phrygian',   query: { key: 'phrygian',   free_text: 'phrygian dark spanish flamenco middle eastern E minor' },      children: [] },
      { id: 'k-lydian',     label: 'Lydian',     query: { key: 'lydian',     free_text: 'lydian bright dreamy ethereal floating F major' },             children: [] },
      { id: 'k-mixolydian', label: 'Mixolydian', query: { key: 'mixolydian', free_text: 'mixolydian bluesy rock dominant G major' },                    children: [] },
      { id: 'k-aeolian',    label: 'Aeolian',    query: { key: 'aeolian',    free_text: 'aeolian natural minor scale emotional dark A minor' },         children: [] },
      { id: 'k-locrian',    label: 'Locrian',     query: { key: 'locrian',    free_text: 'locrian diminished tense unstable dissonant B diminished' },   children: [] },
    ],
  },
  {
    id: 'vocals', label: 'Vocals', hue: 340, icon: '🎤',
    children: [
      { id: 'v-female', label: 'Female', query: { vocal_type: 'female vocals' }, children: [] },
      { id: 'v-male', label: 'Male', query: { vocal_type: 'male vocals' }, children: [] },
    ],
  },
  {
    id: 'energy', label: 'Energy', hue: 25, icon: '🔥',
    children: [
      { id: 'e-low', label: 'Low', query: { vibes: ['low energy', 'quiet', 'subtle'] }, children: [
        { id: 'e-sparse', label: 'Sparse', query: { vibes: ['sparse', 'bare', 'stripped'] } },
        { id: 'e-ambient', label: 'Ambient', query: { vibes: ['ambient background', 'gentle'] } },
      ]},
      { id: 'e-mid', label: 'Mid', query: { vibes: ['mid energy', 'moderate', 'balanced'] }, children: [
        { id: 'e-textured', label: 'Textured', query: { vibes: ['textured', 'layered', 'rich'] } },
        { id: 'e-groovy', label: 'Groovy', query: { vibes: ['groovy', 'rhythmic', 'funky'] } },
      ]},
      { id: 'e-high', label: 'High', query: { vibes: ['high energy', 'intense', 'aggressive'] }, children: [
        { id: 'e-dense', label: 'Dense', query: { vibes: ['dense', 'heavy', 'thick'] } },
        { id: 'e-explosive', label: 'Explosive', query: { vibes: ['explosive', 'powerful', 'massive'] } },
      ]},
    ],
  },
  {
    id: 'texture', label: 'Texture', hue: 300, icon: '🌿',
    children: [
      { id: 'x-acoustic', label: 'Acoustic', query: { free_text: 'acoustic natural organic instruments' }, children: [
        { id: 'x-raw', label: 'Raw', query: { free_text: 'raw recorded live room reverb' } },
        { id: 'x-warm', label: 'Warm', query: { free_text: 'warm analog natural tone' } },
      ]},
      { id: 'x-synthetic', label: 'Synthetic', query: { free_text: 'electronic synthesized produced' }, children: [
        { id: 'x-glitchy', label: 'Glitchy', query: { free_text: 'glitch distorted digital artifacts' } },
        { id: 'x-polished', label: 'Polished', query: { free_text: 'clean produced polished mix' } },
      ]},
      { id: 'x-cinematic', label: 'Cinematic', query: { free_text: 'cinematic film score dramatic' }, children: [
        { id: 'x-lush', label: 'Lush', query: { free_text: 'lush full orchestration strings' } },
        { id: 'x-tense', label: 'Tense', query: { free_text: 'tense suspense building score' } },
      ]},
      { id: 'x-minimal', label: 'Minimal', query: { free_text: 'minimal sparse few elements space' }, children: [
        { id: 'x-spacious', label: 'Spacious', query: { free_text: 'spacious room silence gaps' } },
      ]},
    ],
  },
];

// Flat lookup of all non-root nodes
function buildNodeMap(): Map<string, BubbleNodeDef> {
  const map = new Map<string, BubbleNodeDef>();
  for (const root of roots) {
    for (const l1 of root.children) {
      map.set(l1.id, l1);
      for (const l2 of (l1.children ?? [])) {
        map.set(l2.id, l2);
      }
    }
  }
  return map;
}

const nodeMap = buildNodeMap();

export function getNodeLabel(id: string): string {
  return nodeMap.get(id)?.label ?? id;
}

export function compileQuery(selectedIds: string[]): SearchQuery {
  const query: SearchQuery = {
    vibes: [],
    free_text: '',
    bpm_lower: null,
    bpm_upper: null,
    key: null,
    vocal_type: null,
    top_k: 8,
  };

  const textParts: string[] = [];

  for (const id of selectedIds) {
    const node = nodeMap.get(id);
    if (!node) continue;
    const q = node.query;
    if (q.vibes) query.vibes.push(...q.vibes);
    if (q.free_text) textParts.push(q.free_text);
    if (q.bpm_lower !== undefined) query.bpm_lower = q.bpm_lower;
    if (q.bpm_upper !== undefined) query.bpm_upper = q.bpm_upper;
    if (q.key) query.key = q.key;
    if (q.vocal_type) query.vocal_type = q.vocal_type;
  }

  query.vibes = [...new Set(query.vibes)];
  query.free_text = textParts.join(' ').trim();
  return query;
}

// Legacy export — used by VibePanel label display
export const graphNodes = roots.flatMap(root =>
  root.children.flatMap(l1 => [l1, ...(l1.children ?? [])])
);

// Return the root category a node belongs to (by ID prefix or traversal)
export function getRootForNode(nodeId: string): RootDef | undefined {
  for (const root of roots) {
    for (const l1 of root.children) {
      if (l1.id === nodeId) return root;
      for (const l2 of (l1.children ?? [])) {
        if (l2.id === nodeId) return root;
      }
    }
  }
  return undefined;
}

export const vibePresets = [
  {
    label: 'Moody Synthwave, Instrumental, 110 BPM',
    nodes: ['g-synthwave', 'm-dark', 't-upbeat', 'v-instrumental'],
  },
  {
    label: 'Upbeat Pop, Female Vocals',
    nodes: ['g-pop', 'm-euphoric', 'v-female', 'k-major'],
  },
  {
    label: 'Melancholic Piano Ballad, Slow',
    nodes: ['g-neoclassical', 'm-melancholic', 't-slow', 'k-minor'],
  },
  {
    label: 'Heavy Metal, High Energy',
    nodes: ['g-metal', 'e-high', 't-fast', 'm-dark'],
  },
];
