"use client";

import { useRef, useState } from "react";
import { transcribeAction, saveTranscriptAction } from "../actions";

type Status = { kind: "idle" | "recording" | "listening" | "sending" | "ok" | "error"; msg?: string };

// Tipagem mínima da Web Speech API (não faz parte do lib.dom padrão).
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function AudioCapture({ encounterId, transcribeOn }: { encounterId: string; transcribeOn: boolean }) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [live, setLive] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalTextRef = useRef("");

  function stopTracks() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function send(blob: Blob, filename: string) {
    setStatus({ kind: "sending", msg: "Transcrevendo…" });
    const fd = new FormData();
    fd.append("audio", blob, filename);
    const res = await transcribeAction(encounterId, fd);
    if (res.ok) setStatus({ kind: "ok", msg: "Transcrição adicionada às notas." });
    else setStatus({ kind: "error", msg: res.error ?? "Falha." });
  }

  // ------ Microfone: Web Speech API (grátis, sem chave, ao vivo) ------
  function startMic() {
    const SR = getSpeechRecognition();
    if (!SR) {
      setStatus({
        kind: "error",
        msg: "Seu navegador não suporta transcrição ao vivo. Use o Chrome, ou importe um arquivo.",
      });
      return;
    }
    finalTextRef.current = "";
    setLive("");
    const rec = new SR();
    rec.lang = "pt-BR";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalTextRef.current += r[0].transcript + " ";
        else interim += r[0].transcript;
      }
      setLive(finalTextRef.current + interim);
    };
    rec.onerror = (e) => setStatus({ kind: "error", msg: `Erro no reconhecimento: ${e.error}` });
    rec.onend = () => {
      // pode encerrar sozinho; se ainda estamos "listening", reinicia
      if (recognitionRef.current) {
        try {
          rec.start();
        } catch {
          /* ignore */
        }
      }
    };
    recognitionRef.current = rec;
    rec.start();
    setStatus({ kind: "listening" });
  }

  async function stopMic() {
    const rec = recognitionRef.current;
    recognitionRef.current = null;
    rec?.stop();
    const text = finalTextRef.current.trim();
    setLive("");
    if (!text) {
      setStatus({ kind: "error", msg: "Nada foi captado." });
      return;
    }
    setStatus({ kind: "sending", msg: "Salvando transcrição…" });
    const res = await saveTranscriptAction(encounterId, text);
    if (res.ok) setStatus({ kind: "ok", msg: "Transcrição adicionada às notas." });
    else setStatus({ kind: "error", msg: res.error ?? "Falha." });
  }

  // ------ Aba (Meet): captura o áudio da aba e envia ao provedor ------
  async function startTab() {
    if (!transcribeOn) {
      setStatus({ kind: "error", msg: "Transcrever a aba exige OPENAI_API_KEY. Sem ela, use o microfone." });
      return;
    }
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      const audio = display.getAudioTracks();
      display.getVideoTracks().forEach((t) => t.stop());
      if (audio.length === 0) {
        display.getTracks().forEach((t) => t.stop());
        setStatus({ kind: "error", msg: "A aba não compartilhou áudio. Marque “Compartilhar áudio da guia”." });
        return;
      }
      const stream = new MediaStream(audio);
      streamRef.current = stream;
      chunksRef.current = [];
      const rec = new MediaRecorder(stream);
      rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      rec.onstop = () => {
        stopTracks();
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size > 0) void send(blob, "aba.webm");
        else setStatus({ kind: "error", msg: "Gravação vazia." });
      };
      rec.start();
      recorderRef.current = rec;
      setStatus({ kind: "recording" });
    } catch (e) {
      setStatus({ kind: "error", msg: `Não foi possível gravar a aba: ${(e as Error).message}` });
    }
  }

  function stopTab() {
    recorderRef.current?.stop();
    recorderRef.current = null;
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!transcribeOn) {
      setStatus({ kind: "error", msg: "Transcrever arquivo exige OPENAI_API_KEY. Sem ela, use o microfone ao vivo." });
      return;
    }
    await send(file, file.name);
  }

  const recording = status.kind === "recording";
  const listening = status.kind === "listening";

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-1 flex items-center gap-2">
        <span className="text-sm font-medium">🎙 Gravar ou importar áudio</span>
        <span className="text-xs text-text-dim">→ vira transcrição nas notas</span>
      </div>
      <p className="mb-3 text-xs text-text-dim">
        <strong>Microfone</strong> transcreve ao vivo no navegador (grátis).{" "}
        {transcribeOn ? "Aba (Meet) e arquivo também transcrevem." : "Aba (Meet) e arquivo exigem OPENAI_API_KEY."}
      </p>

      {listening ? (
        <div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 text-sm text-danger">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-danger" />
              Ouvindo…
            </span>
            <button
              onClick={stopMic}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90"
            >
              Parar e salvar
            </button>
          </div>
          {live && (
            <p className="mt-2 max-h-32 overflow-y-auto rounded-lg bg-surface-2 p-2 text-sm text-text-dim">{live}</p>
          )}
        </div>
      ) : recording ? (
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-sm text-danger">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-danger" />
            Gravando aba…
          </span>
          <button
            onClick={stopTab}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90"
          >
            Parar e transcrever
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={startMic}
            disabled={status.kind === "sending"}
            className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50"
          >
            Gravar microfone (ao vivo)
          </button>
          <button
            onClick={startTab}
            disabled={status.kind === "sending"}
            className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-2 disabled:opacity-50"
          >
            Gravar aba (Meet)
          </button>
          <label className="cursor-pointer rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-2">
            Importar arquivo
            <input type="file" accept="audio/*" onChange={onFile} className="hidden" />
          </label>
        </div>
      )}

      {status.msg && (
        <p
          className={`mt-3 text-sm ${
            status.kind === "error" ? "text-danger" : status.kind === "ok" ? "text-ok" : "text-text-dim"
          }`}
        >
          {status.kind === "sending" && "⏳ "}
          {status.msg}
        </p>
      )}
    </div>
  );
}
