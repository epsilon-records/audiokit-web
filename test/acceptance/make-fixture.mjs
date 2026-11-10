// Generates fixtures/tone.wav: 5 s, 44.1 kHz, mono, 16-bit PCM. A synthetic chord with a slow
// pulse, so tempo and key analysis have something to measure. Self-generated, no third-party audio.
// Run: node test/acceptance/make-fixture.mjs
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export function makeToneWav({ seconds = 5, rate = 44100 } = {}) {
  const n = seconds * rate;
  const data = Buffer.alloc(n * 2);
  const notes = [220, 277.18, 329.63]; // A minor triad
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    const beat = 0.5 + 0.5 * Math.cos(2 * Math.PI * 2 * t); // 120 bpm pulse
    const env = Math.min(1, t * 20, (seconds - t) * 20);
    let s = 0;
    for (const f of notes) s += Math.sin(2 * Math.PI * f * t) / notes.length;
    data.writeInt16LE(Math.round(s * (0.25 + 0.35 * beat) * env * 32767), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = new URL("./fixtures/tone.wav", import.meta.url);
  writeFileSync(out, makeToneWav());
  console.log(`wrote ${out.pathname}`);
}
