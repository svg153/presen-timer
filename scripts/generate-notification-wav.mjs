/**
 * Renders public/notification.wav: the fallback notification chime.
 *
 * Must stay in sync with src/utils/soundUtils.ts (same frequency, harmonic and
 * envelope). Run it after changing the synth:
 *
 *   node scripts/generate-notification-wav.mjs
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SAMPLE_RATE = 44100;
const DING_DURATION_S = 0.4;
const TAIL_S = 0.05; // silence so the tail never clicks
const DURATION_S = DING_DURATION_S + TAIL_S;
const ATTACK_S = 0.005;
const DING_FREQUENCY = 880; // A5
const HARMONIC_RATIO = 2;
const HARMONIC_LEVEL = 0.18;
const PEAK_GAIN = 0.35;

// Envelope mirrors playChime(): linear attack to peak, exponential decay to
// ~0 at DING_DURATION_S, then silence.
const envelopeAt = t => {
  if (t >= DING_DURATION_S) return 0;
  if (t < ATTACK_S) return t / ATTACK_S;
  const progress = (t - ATTACK_S) / (DING_DURATION_S - ATTACK_S);
  return Math.pow(0.0001, progress);
};

const sampleCount = Math.round(SAMPLE_RATE * DURATION_S);
const pcm = Buffer.alloc(sampleCount * 2);

for (let i = 0; i < sampleCount; i += 1) {
  const t = i / SAMPLE_RATE;
  const value =
    PEAK_GAIN *
    envelopeAt(t) *
    (Math.sin(2 * Math.PI * DING_FREQUENCY * t) +
      HARMONIC_LEVEL * Math.sin(2 * Math.PI * DING_FREQUENCY * HARMONIC_RATIO * t));

  const clamped = Math.max(-1, Math.min(1, value));
  pcm.writeInt16LE(Math.round(clamped * 32767), i * 2);
}

const header = Buffer.alloc(44);
const bytesPerSample = 2;
const blockAlign = bytesPerSample; // mono

header.write('RIFF', 0);
header.writeUInt32LE(36 + pcm.length, 4);
header.write('WAVE', 8);
header.write('fmt ', 12);
header.writeUInt32LE(16, 16); // fmt chunk size
header.writeUInt16LE(1, 20); // PCM
header.writeUInt16LE(1, 22); // channels: mono
header.writeUInt32LE(SAMPLE_RATE, 24);
header.writeUInt32LE(SAMPLE_RATE * blockAlign, 28); // byte rate
header.writeUInt16LE(blockAlign, 32);
header.writeUInt16LE(8 * bytesPerSample, 34); // bits per sample
header.write('data', 36);
header.writeUInt32LE(pcm.length, 40);

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const outPath = join(outDir, 'notification.wav');
writeFileSync(outPath, Buffer.concat([header, pcm]));

console.log(
  `Wrote ${outPath}: ${sampleCount} samples, ${DURATION_S}s mono ${SAMPLE_RATE}Hz, ${pcm.length + 44} bytes`
);
