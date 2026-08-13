/** Web Speech API wrapper — STT + TTS, local-first (sem cloud). */

export type VoiceListeningState = "idle" | "listening" | "processing";

export interface SpeechRecognitionResult {
  transcript: string;
  isFinal: boolean;
}

type RecognitionInstance = SpeechRecognition;

const PT_BR = "pt-BR";
const MAX_SPEAK_CHARS = 600;

let recognition: RecognitionInstance | null = null;
let listeningState: VoiceListeningState = "idle";
let stateListeners = new Set<(s: VoiceListeningState) => void>();
let currentUtterance: SpeechSynthesisUtterance | null = null;
let speakEndCallback: (() => void) | null = null;

function getSpeechRecognitionCtor(): (new () => RecognitionInstance) | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: new () => RecognitionInstance;
    webkitSpeechRecognition?: new () => RecognitionInstance;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognitionCtor() !== null;
}

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Alias pedido na spec — STT disponível? */
export function isSupported(): boolean {
  return isSpeechRecognitionSupported();
}

function setListeningState(state: VoiceListeningState) {
  listeningState = state;
  stateListeners.forEach((l) => l(state));
}

export function getListeningState(): VoiceListeningState {
  return listeningState;
}

export function subscribeListeningState(listener: (s: VoiceListeningState) => void): () => void {
  stateListeners.add(listener);
  listener(listeningState);
  return () => stateListeners.delete(listener);
}

function mapRecognitionError(code: string): string {
  const map: Record<string, string> = {
    "not-allowed":
      "Permissão do microfone negada. Ative o microfone nas configurações do Windows e do navegador.",
    "service-not-allowed": "Reconhecimento de voz bloqueado neste ambiente.",
    "no-speech": "Não ouvi nada. Tente falar novamente.",
    "audio-capture": "Microfone não encontrado ou indisponível.",
    "network": "Erro de rede no reconhecimento de voz.",
    "aborted": "Escuta cancelada.",
  };
  return map[code] ?? `Erro de voz: ${code}`;
}

export interface StartListeningOptions {
  lang?: string;
  continuous?: boolean;
  onResult: (result: SpeechRecognitionResult) => void;
  onError?: (message: string) => void;
}

export function startListening(options: StartListeningOptions): boolean {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) {
    options.onError?.("Reconhecimento de voz não suportado neste navegador.");
    return false;
  }

  stopListening();

  recognition = new Ctor();
  recognition.lang = options.lang ?? PT_BR;
  recognition.continuous = options.continuous ?? false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  let finalTranscript = "";

  recognition.onstart = () => setListeningState("listening");

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    setListeningState("processing");
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const text = result[0]?.transcript ?? "";
      if (result.isFinal) {
        finalTranscript += text;
      } else {
        interim += text;
      }
    }
    const combined = (finalTranscript + interim).trim();
    if (combined) {
      options.onResult({
        transcript: combined,
        isFinal: event.results[event.results.length - 1]?.isFinal ?? false,
      });
    }
  };

  recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
    if (event.error === "aborted") {
      setListeningState("idle");
      return;
    }
    setListeningState("idle");
    options.onError?.(mapRecognitionError(event.error));
  };

  recognition.onend = () => {
    setListeningState("idle");
    recognition = null;
  };

  try {
    recognition.start();
    return true;
  } catch {
    setListeningState("idle");
    options.onError?.("Não foi possível iniciar o microfone.");
    return false;
  }
}

export function stopListening(): void {
  if (recognition) {
    try {
      recognition.abort();
    } catch {
      /* ignore */
    }
    recognition = null;
  }
  setListeningState("idle");
}

export function isListening(): boolean {
  return listeningState === "listening" || listeningState === "processing";
}

/** Remove markdown-ish noise and truncate for TTS. */
export function prepareTextForSpeech(text: string, maxChars = MAX_SPEAK_CHARS): string {
  const cleaned = text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#*_~`]/g, "")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .trim();

  if (cleaned.length <= maxChars) return cleaned;
  const slice = cleaned.slice(0, maxChars);
  const lastPeriod = slice.lastIndexOf(".");
  if (lastPeriod > maxChars * 0.5) {
    return slice.slice(0, lastPeriod + 1);
  }
  return `${slice}…`;
}

export function speak(
  text: string,
  lang = PT_BR,
  onEnd?: () => void,
): boolean {
  if (!isSpeechSynthesisSupported() || !text.trim()) {
    onEnd?.();
    return false;
  }

  cancelSpeech();
  speakEndCallback = onEnd ?? null;

  const utterance = new SpeechSynthesisUtterance(prepareTextForSpeech(text));
  utterance.lang = lang;
  utterance.rate = 1;
  utterance.pitch = 1;

  const voices = window.speechSynthesis.getVoices();
  const ptVoice =
    voices.find((v) => v.lang.startsWith("pt")) ??
    voices.find((v) => v.lang.startsWith("pt-BR"));
  if (ptVoice) utterance.voice = ptVoice;

  utterance.onend = () => {
    currentUtterance = null;
    const cb = speakEndCallback;
    speakEndCallback = null;
    cb?.();
  };

  utterance.onerror = () => {
    currentUtterance = null;
    const cb = speakEndCallback;
    speakEndCallback = null;
    cb?.();
  };

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
  return true;
}

export function cancelSpeech(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  currentUtterance = null;
  speakEndCallback = null;
}

export function isSpeaking(): boolean {
  return typeof window !== "undefined" && (window.speechSynthesis.speaking || currentUtterance !== null);
}

/** Summary for action plan cards — não ler lista inteira. */
export function speechSummaryForMessage(content: string, messageType?: string): string | null {
  if (messageType === "action_plan") {
    return "Preparei um plano de ação. Revise os detalhes na tela e diga confirmo para executar.";
  }
  if (!content.trim()) return null;
  if (content.length > MAX_SPEAK_CHARS * 2) {
    return prepareTextForSpeech(content);
  }
  return prepareTextForSpeech(content);
}
