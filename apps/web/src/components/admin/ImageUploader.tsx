'use client';

import { useRef, useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { useToast } from '../providers/ToastProvider';
import { UploadIcon } from '../icons';
import { Spinner } from '../ui';

/** Botão que envia uma imagem para /api/admin/uploads e devolve a URL pública. */
export function ImageUploader({ onUploaded, label = 'Enviar foto' }: { onUploaded: (url: string) => void; label?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const toast = useToast();

  async function upload(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      toast('A imagem deve ter no máximo 5 MB.', 'error');
      return;
    }
    const form = new FormData();
    form.append('file', file);
    setUploading(true);
    try {
      const { url } = await api<{ url: string }>('/admin/uploads', { form });
      onUploaded(url);
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setUploading(false);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <>
      <button type="button" className="btn-outline btn-sm" onClick={() => input.current?.click()} disabled={uploading}>
        {uploading ? <Spinner /> : <UploadIcon width={16} />} {label}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-label={label}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
        }}
      />
    </>
  );
}
