import "server-only";

// Transcrição de áudio (STT). A Anthropic não tem API de áudio→texto, então usamos
// um provedor externo. Padrão: OpenAI Whisper (OPENAI_API_KEY). Trocável por
// Deepgram/AssemblyAI mudando só esta função. Sem chave, degrada graciosamente.

export function transcribeEnabled(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function transcribeAudio(
  file: File,
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return {
      ok: false,
      error: "Transcrição indisponível: defina OPENAI_API_KEY (provedor de STT) no .env.",
    };
  }
  if (!file || file.size === 0) return { ok: false, error: "Áudio vazio." };
  if (file.size > 25 * 1024 * 1024) {
    return { ok: false, error: "Áudio acima de 25 MB. Grave em trechos menores." };
  }

  const body = new FormData();
  body.append("file", file, file.name || "audio.webm");
  body.append("model", "whisper-1");
  body.append("language", "pt");

  try {
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return { ok: false, error: `Falha na transcrição (${res.status}). ${detail.slice(0, 200)}` };
    }
    const json = (await res.json()) as { text?: string };
    return { ok: true, text: (json.text ?? "").trim() };
  } catch (e) {
    return { ok: false, error: `Erro ao transcrever: ${(e as Error).message}` };
  }
}
