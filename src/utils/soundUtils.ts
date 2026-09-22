/**
 * Notification sound synthesis.
 *
 * The app used to load `public/notification.mp3`, which was a 149-byte *text*
 * placeholder; browsers decoded it into a harsh static burst. The chime is now
 * synthesized with the Web Audio API, so there is no binary to keep in sync.
 * `public/notification.wav` (rendered by scripts/generate-notification-wav.mjs
 * with the exact same envelope) is only a fallback for engines without Web Audio.
 */

export interface SoundPreferences {
  muted: boolean;
  volume: number;
}

export const DING_FREQUENCY = 880; // A5: bright but not piercing
export const DING_DURATION_S = 0.4;
export const DEFAULT_VOLUME = 0.6;

const ATTACK_S = 0.005;
const HARMONIC_RATIO = 2; // one octave up: bell-like colour without harshness
const HARMONIC_LEVEL = 0.18;
// Hard ceiling: even at volume=1 the chime stays a gentle notification.
const PEAK_GAIN = 0.35;
const FALLBACK_URL = `${import.meta.env.BASE_URL}notification.wav`;

// Pure: keeps a stored/typed volume usable no matter where it came from.
export const clampVolume = (value: number): number =>
  Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : DEFAULT_VOLUME;

type AudioContextCtor = typeof AudioContext;

// Web Audio is exposed as a global (var), not as a Window property.
type AudioGlobals = {
  AudioContext?: AudioContextCtor;
  webkitAudioContext?: AudioContextCtor;
};

const getAudioContextCtor = (): AudioContextCtor | null => {
  if (typeof window === 'undefined') return null;
  const g = globalThis as typeof globalThis & AudioGlobals;
  return g.AudioContext ?? g.webkitAudioContext ?? null;
};

export const isWebAudioSupported = (): boolean => getAudioContextCtor() !== null;

// One context per page; creating it lazily avoids the "autoplay policy"
// console warning on load.
let audioContext: AudioContext | null = null;

const getContext = (): AudioContext | null => {
  const Ctor = getAudioContextCtor();
  if (!Ctor) return null;
  if (!audioContext) audioContext = new Ctor();
  return audioContext;
};

/**
 * Create/resume the AudioContext from inside a user gesture (Play click, sound
 * test) so the chime can fire later on its own, when a section ends.
 */
export const unlockAudio = (): void => {
  const ctx = getContext();
  if (!ctx || ctx.state !== 'suspended') return;
  ctx.resume().catch(err => console.error('Failed to resume AudioContext:', err));
};

const addVoice = (
  ctx: AudioContext,
  destination: AudioNode,
  frequency: number,
  level: number,
  startAt: number
): OscillatorNode => {
  const osc = ctx.createOscillator();
  const voiceGain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(frequency, startAt);
  voiceGain.gain.setValueAtTime(level, startAt);
  osc.connect(voiceGain).connect(destination);
  osc.start(startAt);
  osc.stop(startAt + DING_DURATION_S + 0.05);
  return osc;
};

/** Returns false when Web Audio is unavailable and the caller should fall back. */
export const playChime = (volume: number = DEFAULT_VOLUME): boolean => {
  const ctx = getContext();
  if (!ctx) return false;

  // A suspended context means no gesture has unlocked it yet; try anyway so
  // the first chime is not silently dropped on browsers that allow it.
  if (ctx.state === 'suspended') void ctx.resume();

  const level = clampVolume(volume) * PEAK_GAIN;
  if (level <= 0) return true; // volume 0: nothing to play, no fallback needed

  const master = ctx.createGain();
  const startAt = ctx.currentTime;
  const sustainEnd = startAt + ATTACK_S;
  const decayEnd = startAt + DING_DURATION_S;

  master.connect(ctx.destination);
  master.gain.setValueAtTime(0.0001, startAt);
  master.gain.linearRampToValueAtTime(level, sustainEnd);
  master.gain.exponentialRampToValueAtTime(0.0001, decayEnd);

  const voices = [
    addVoice(ctx, master, DING_FREQUENCY, 1, startAt),
    addVoice(ctx, master, DING_FREQUENCY * HARMONIC_RATIO, HARMONIC_LEVEL, startAt)
  ];

  // Disconnect once the last voice ends; nodes are per-shot by design.
  let pending = voices.length;
  voices.forEach(voice => {
    voice.onended = () => {
      pending -= 1;
      if (pending === 0) master.disconnect();
    };
  });

  return true;
};

let fallbackAudio: HTMLAudioElement | null = null;

/** Fallback for engines without Web Audio: the pre-rendered gentle ding. */
export const playChimeFallback = (volume: number = DEFAULT_VOLUME): void => {
  if (typeof Audio === 'undefined') return;

  if (!fallbackAudio) {
    fallbackAudio = new Audio(FALLBACK_URL);
    fallbackAudio.preload = 'auto';
  }
  const element = fallbackAudio;
  element.volume = clampVolume(volume) * PEAK_GAIN;
  element.currentTime = 0;
  element.play().catch(err => console.error('Failed to play notification sound:', err));
};

/** Single entry point used by the timer and the sound test button. */
export const playNotificationSound = ({ muted, volume }: SoundPreferences): void => {
  if (muted) return;
  if (!playChime(volume)) playChimeFallback(volume);
};

// Local storage helpers (same pattern as timerUtils)
export const SOUND_STORAGE_KEY = 'presentation-timer-sound';

export const loadSoundSettings = (): SoundPreferences => {
  try {
    const raw = localStorage.getItem(SOUND_STORAGE_KEY);
    if (!raw) return { muted: false, volume: DEFAULT_VOLUME };
    const parsed = JSON.parse(raw) as Partial<SoundPreferences>;
    return {
      muted: parsed.muted === true,
      volume: typeof parsed.volume === 'number' ? clampVolume(parsed.volume) : DEFAULT_VOLUME
    };
  } catch (error) {
    console.error('Failed to load sound settings:', error);
    return { muted: false, volume: DEFAULT_VOLUME };
  }
};

export const saveSoundSettings = (settings: SoundPreferences): void => {
  try {
    localStorage.setItem(SOUND_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save sound settings:', error);
  }
};
