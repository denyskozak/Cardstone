import { sound } from '@pixi/sound';

const GAME_SOUND_PATHS = {
  attackImpact: '/assets/sounds/components/mixkit-weak-hit-impact.wav',
  cardDraw: '/assets/sounds/components/mixkit-poker-card-draw.wav',
  cardPlacement: '/assets/sounds/components/mixkit-poker-card-placement.wav',
  noMana: '/assets/sounds/components/no_mana.ogg'
} as const;

type GameSoundKey = keyof typeof GAME_SOUND_PATHS;

const SOUND_IDS: Record<GameSoundKey, string> = {
  attackImpact: 'attack-impact',
  cardDraw: 'card-draw',
  cardPlacement: 'card-placement',
  noMana: 'no-mana'
};

function isBrowserEnvironment(): boolean {
  return typeof window !== 'undefined';
}

function ensureSoundRegistered(key: GameSoundKey) {
  if (!isBrowserEnvironment()) {
    return;
  }
  const soundId = SOUND_IDS[key];
  if (!sound.exists(soundId)) {
    sound.add(soundId, { url: GAME_SOUND_PATHS[key], preload: true });
  }
}

export function preloadGameSounds() {
  if (!isBrowserEnvironment()) {
    return;
  }
  (Object.keys(GAME_SOUND_PATHS) as GameSoundKey[]).forEach((key) => {
    ensureSoundRegistered(key);
  });
}

export function playGameSound(key: GameSoundKey) {
  if (!isBrowserEnvironment()) {
    return;
  }
  ensureSoundRegistered(key);
  sound.play(SOUND_IDS[key]);
}

export const GameSoundId = {
  AttackImpact: 'attackImpact' as const satisfies GameSoundKey,
  CardDraw: 'cardDraw' as const satisfies GameSoundKey,
  CardPlacement: 'cardPlacement' as const satisfies GameSoundKey,
  NoMana: 'noMana' as const satisfies GameSoundKey
};
