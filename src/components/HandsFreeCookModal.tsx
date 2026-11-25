import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Mic,
  MicOff,
  Pause,
  Play,
  RotateCcw,
  ShieldAlert,
  Timer,
  Volume2,
  X,
} from 'lucide-react';
import {
  formatCountdown,
  parseStepTimers,
  playTimerChime,
} from '../lib/stepTimers';
import type { Recipe } from '../types/recipe';

interface HandsFreeCookModalProps {
  recipe: Recipe;
  onClose: () => void;
}

interface TimerState {
  totalSeconds: number;
  remainingSeconds: number;
  running: boolean;
  finished: boolean;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export function HandsFreeCookModal({ recipe, onClose }: HandsFreeCookModalProps) {
  const [stepIdx, setStepIdx] = useState(0);
  const [timers, setTimers] = useState<Record<string, TimerState>>({});
  const [voiceActive, setVoiceActive] = useState(false);
  const [lastVoiceCmd, setLastVoiceCmd] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const steps = recipe.steps;
  const currentStep = steps[stepIdx] ?? steps[0];

  const speechCtor = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    };
    return w.SpeechRecognition || w.webkitSpeechRecognition || null;
  }, []);

  const parsedTimers = useMemo(() => {
    if (!currentStep) return [];
    return parseStepTimers(currentStep.text, currentStep.order);
  }, [currentStep]);

  // Initialize timer state entries for the current step
  useEffect(() => {
    if (parsedTimers.length === 0) return;
    setTimers((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const t of parsedTimers) {
        if (!next[t.id]) {
          next[t.id] = {
            totalSeconds: t.seconds,
            remainingSeconds: t.seconds,
            running: false,
            finished: false,
          };
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [parsedTimers]);

  // 1-second tick for all running timers
  useEffect(() => {
    const interval = window.setInterval(() => {
      setTimers((prev) => {
        const keys = Object.keys(prev);
        let anyRunning = false;
        const next: Record<string, TimerState> = { ...prev };

        for (const k of keys) {
          const item = prev[k];
          if (item.running && item.remainingSeconds > 0) {
            anyRunning = true;
            const updated = item.remainingSeconds - 1;
            const justFinished = updated === 0;
            if (justFinished) {
              playTimerChime();
            }
            next[k] = {
              ...item,
              remainingSeconds: updated,
              running: !justFinished,
              finished: justFinished,
            };
          }
        }
        return anyRunning ? next : prev;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const toggleTimer = useCallback((id: string, defaultSeconds: number) => {
    setTimers((prev) => {
      const curr = prev[id] ?? {
        totalSeconds: defaultSeconds,
        remainingSeconds: defaultSeconds,
        running: false,
        finished: false,
      };
      const resetIfDone =
        curr.remainingSeconds === 0 ? curr.totalSeconds : curr.remainingSeconds;
      return {
        ...prev,
        [id]: {
          ...curr,
          remainingSeconds: resetIfDone,
          running: !curr.running,
          finished: false,
        },
      };
    });
  }, []);

  const resetTimer = useCallback((id: string, defaultSeconds: number) => {
    setTimers((prev) => ({
      ...prev,
      [id]: {
        totalSeconds: defaultSeconds,
        remainingSeconds: defaultSeconds,
        running: false,
        finished: false,
      },
    }));
  }, []);

  const speakCurrentStep = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !currentStep) {
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(
        `Step ${currentStep.order}. ${currentStep.text}`,
      );
      window.speechSynthesis.speak(utter);
    } catch {
      // Ignore speech synthesis failures
    }
  }, [currentStep]);

  const goNext = useCallback(() => {
    setStepIdx((i) => Math.min(steps.length - 1, i + 1));
  }, [steps.length]);

  const goPrev = useCallback(() => {
    setStepIdx((i) => Math.max(0, i - 1));
  }, []);

  // Voice recognition lifecycle
  useEffect(() => {
    if (!voiceActive || !speechCtor) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
      return;
    }

    const rec = new speechCtor();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = 'en-US';
    rec.onresult = (event) => {
      const lastResult = event.results[event.results.length - 1];
      const transcript = (lastResult?.[0]?.transcript ?? '').toLowerCase().trim();
      setLastVoiceCmd(transcript);

      if (transcript.includes('next')) {
        goNext();
      } else if (transcript.includes('back') || transcript.includes('previous')) {
        goPrev();
      } else if (transcript.includes('repeat')) {
        speakCurrentStep();
      } else if (transcript.includes('start timer') && parsedTimers[0]) {
        toggleTimer(parsedTimers[0].id, parsedTimers[0].seconds);
      }
    };
    rec.onerror = () => setVoiceActive(false);
    rec.onend = () => {
      if (voiceActive) {
        try {
          rec.start();
        } catch {
          setVoiceActive(false);
        }
      }
    };

    try {
      rec.start();
      recognitionRef.current = rec;
    } catch {
      setVoiceActive(false);
    }

    return () => {
      try {
        rec.stop();
      } catch {
        // ignore
      }
    };
  }, [voiceActive, speechCtor, goNext, goPrev, speakCurrentStep, parsedTimers, toggleTimer]);

  if (!currentStep) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Hands-Free Cook Mode"
      data-testid="hands-free-modal"
      className="fixed inset-0 z-50 flex flex-col bg-[#141A17] text-white"
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-2 border-b border-white/15 px-4 py-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#90CFA9]">
            Step {stepIdx + 1} of {steps.length}
          </p>
          <h2 className="truncate text-sm font-bold text-white">{recipe.title}</h2>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={speakCurrentStep}
            aria-label="Read step aloud"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <Volume2 className="h-4 w-4" />
          </button>

          <button
            type="button"
            data-testid="voice-control-toggle"
            onClick={() => speechCtor && setVoiceActive((v) => !v)}
            disabled={!speechCtor}
            aria-pressed={voiceActive}
            className={`inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition-colors ${
              voiceActive
                ? 'bg-[#D96B43] text-white'
                : 'bg-white/10 text-white/90 disabled:opacity-45'
            }`}
          >
            {voiceActive ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            <span>
              {!speechCtor ? 'Voice N/A' : voiceActive ? 'Listening' : 'Voice'}
            </span>
          </button>

          <button
            type="button"
            data-testid="close-hands-free-btn"
            onClick={onClose}
            aria-label="Exit Hands-Free Mode"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Step Progress Bar */}
      <div className="grid grid-cols-12 gap-1 px-4 pt-2">
        {steps.map((s, idx) => (
          <div
            key={s.order}
            className={`h-1.5 rounded-full transition-colors ${
              idx <= stepIdx ? 'bg-[#56B87F]' : 'bg-white/15'
            }`}
            style={{ gridColumn: `span ${Math.max(1, Math.floor(12 / steps.length))}` }}
          />
        ))}
      </div>

      {/* High-Contrast Step Body (Readable from 1m away) */}
      <div className="flex flex-1 flex-col justify-center overflow-y-auto px-5 py-6">
        {currentStep.is_seasoning_split_point && (
          <div
            data-testid="hands-free-split-banner"
            className="mb-4 rounded-2xl border-2 border-[#FF8D63] bg-[#D96B43] px-4 py-3 text-white shadow-lg"
          >
            <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider">
              <ShieldAlert className="h-4 w-4" />
              Seasoning Split Point — Portion Baby Food First!
            </p>
          </div>
        )}

        <p
          data-testid="hands-free-step-text"
          className="text-2xl font-bold leading-snug tracking-tight text-white sm:text-3xl"
        >
          {currentStep.text}
        </p>

        {/* Inline Countdown Timers */}
        {parsedTimers.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-3">
            {parsedTimers.map((t) => {
              const state = timers[t.id] ?? {
                totalSeconds: t.seconds,
                remainingSeconds: t.seconds,
                running: false,
                finished: false,
              };
              return (
                <div
                  key={t.id}
                  data-testid={`step-timer-${t.id}`}
                  className={`flex items-center gap-2 rounded-2xl border px-3.5 py-2.5 ${
                    state.finished
                      ? 'animate-pulse border-[#FF8D63] bg-[#D96B43] text-white'
                      : state.running
                        ? 'border-[#56B87F] bg-[#2F6F4E] text-white'
                        : 'border-white/20 bg-white/10 text-white'
                  }`}
                >
                  <button
                    type="button"
                    data-testid={`step-timer-toggle-${t.id}`}
                    onClick={() => toggleTimer(t.id, t.seconds)}
                    className="flex items-center gap-2 text-left"
                  >
                    {state.running ? (
                      <Pause className="h-5 w-5 shrink-0" />
                    ) : (
                      <Play className="h-5 w-5 shrink-0" />
                    )}
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-white/80">
                        <Timer className="mr-1 inline h-3 w-3" />
                        {t.label}
                      </span>
                      <span
                        data-testid={`step-timer-display-${t.id}`}
                        className="tabular-nums text-lg font-extrabold"
                      >
                        {formatCountdown(state.remainingSeconds)}
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => resetTimer(t.id, t.seconds)}
                    aria-label={`Reset ${t.label} timer`}
                    className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-black/25 text-white hover:bg-black/40"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {lastVoiceCmd && (
          <p className="mt-4 text-xs text-white/60">
            Heard: &ldquo;{lastVoiceCmd}&rdquo;
          </p>
        )}
      </div>

      {/* Oversized Bottom Controls (>= 56px height) */}
      <div className="grid grid-cols-2 gap-3 border-t border-white/15 bg-[#1C2420] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          data-testid="hands-free-prev-btn"
          onClick={goPrev}
          disabled={stepIdx === 0}
          className="flex min-h-[56px] items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 text-base font-bold text-white transition-colors hover:bg-white/20 disabled:opacity-35"
        >
          <ChevronLeft className="h-5 w-5" />
          Previous
        </button>

        {stepIdx < steps.length - 1 ? (
          <button
            type="button"
            data-testid="hands-free-next-btn"
            onClick={goNext}
            className="flex min-h-[56px] items-center justify-center gap-2 rounded-2xl bg-[#2F6F4E] px-4 text-base font-bold text-white transition-colors hover:bg-[#3A845D]"
          >
            Next
            <ChevronRight className="h-5 w-5" />
          </button>
        ) : (
          <button
            type="button"
            data-testid="hands-free-done-btn"
            onClick={onClose}
            className="flex min-h-[56px] items-center justify-center gap-2 rounded-2xl bg-[#D96B43] px-4 text-base font-bold text-white"
          >
            Done Cooking
          </button>
        )}
      </div>
    </div>
  );
}
