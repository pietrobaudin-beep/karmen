"use client";

import { useActionState, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { updateProfileAction, type ProfileState } from "./actions";

// Redimensiona a imagem no navegador para no máx. 256px e retorna um data URL leve.
function resizeToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 256;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("canvas"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ProfileForm({
  name,
  email,
  avatarUrl,
}: {
  name: string;
  email: string;
  avatarUrl: string | null;
}) {
  const [preview, setPreview] = useState<string | null>(avatarUrl);
  const [avatarField, setAvatarField] = useState<string>("");
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateProfileAction, {});
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const dataUrl = await resizeToDataUrl(file);
      setPreview(dataUrl);
      setAvatarField(dataUrl);
    } catch {
      /* ignore */
    }
  }

  function removePhoto() {
    setPreview(null);
    setAvatarField("__remove__");
  }

  return (
    <form action={action} className="rounded-xl border border-border bg-surface p-5">
      <input type="hidden" name="avatar" value={avatarField} />
      <div className="flex items-center gap-4">
        <Avatar name={name} src={preview} size={72} />
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-surface-2"
            >
              Trocar foto
            </button>
            {preview && (
              <button
                type="button"
                onClick={removePhoto}
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-danger hover:bg-danger/10"
              >
                Remover
              </button>
            )}
          </div>
          <span className="text-xs text-text-dim">JPG ou PNG. A imagem é reduzida automaticamente.</span>
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={onPick} className="hidden" />
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-text-dim">Nome</span>
          <input
            name="name"
            defaultValue={name}
            required
            className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-text-dim">E-mail</span>
          <input
            value={email}
            disabled
            className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text-dim outline-none"
          />
        </label>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Salvando…" : "Salvar"}
        </button>
        {state.ok && <span className="text-sm text-ok">Perfil atualizado.</span>}
        {state.error && <span className="text-sm text-danger">{state.error}</span>}
      </div>
    </form>
  );
}
