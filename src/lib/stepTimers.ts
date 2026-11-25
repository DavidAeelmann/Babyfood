export interface ParsedStepTimer {
  id: string;
  label: string;
  seconds: number;
}

const DURATION_REGEX =
  /(\d+)(?:\s*[–-]\s*(\d+))?\s*(minutos?|minutes?|mins?|min|segundos?|seconds?|secs?|seg|sec)\b/gi;

export function parseStepTimers(stepText: string, stepOrder: number): ParsedStepTimer[] {
  const timers: ParsedStepTimer[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;

  DURATION_REGEX.lastIndex = 0;
  while ((match = DURATION_REGEX.exec(stepText)) !== null) {
    const first = Number.parseInt(match[1], 10);
    const second = match[2] ? Number.parseInt(match[2], 10) : null;
    const unitRaw = match[3].toLowerCase();
    const isSeconds = unitRaw.startsWith('sec');

    const numericValue = second ?? first;
    if (!Number.isFinite(numericValue) || numericValue <= 0) continue;

    const seconds = isSeconds ? numericValue : numericValue * 60;
    const displayRange = second ? `${first}–${second}` : `${first}`;
    const displayUnit = isSeconds ? 'sec' : 'min';
    const label = `${displayRange} ${displayUnit}`;
    const dedupKey = `${seconds}`;

    if (!seen.has(dedupKey)) {
      seen.add(dedupKey);
      timers.push({
        id: `step-${stepOrder}-t-${timers.length}`,
        label,
        seconds,
      });
    }
  }

  return timers;
}

export function formatCountdown(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function playTimerChime(): void {
  try {
    const g = globalThis as unknown as {
      AudioContext?: new () => {
        currentTime: number;
        destination: unknown;
        createOscillator: () => {
          type: string;
          frequency: { setValueAtTime: (val: number, time: number) => void };
          connect: (dest: unknown) => void;
          start: (time: number) => void;
          stop: (time: number) => void;
        };
        createGain: () => {
          gain: {
            setValueAtTime: (val: number, time: number) => void;
            exponentialRampToValueAtTime: (val: number, time: number) => void;
          };
          connect: (dest: unknown) => void;
        };
      };
      webkitAudioContext?: new () => unknown;
    };
    const AudioCtx = g.AudioContext || (g.webkitAudioContext as typeof g.AudioContext);
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const notes = [659.25, 880, 1046.5];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.14);
      gain.gain.setValueAtTime(0.001, now + idx * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.18, now + idx * 0.14 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.14 + 0.32);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.14);
      osc.stop(now + idx * 0.14 + 0.35);
    });
  } catch {
    // Ignore audio context restrictions
  }
}
