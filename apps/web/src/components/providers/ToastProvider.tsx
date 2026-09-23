'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckIcon, CloseIcon } from '../icons';

type Tone = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  message: string;
  tone: Tone;
}

const ToastContext = createContext<(message: string, tone?: Tone) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, tone: Tone = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {/* aria-live anuncia as mensagens para leitores de tela */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:right-6 sm:items-end"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex w-full max-w-sm animate-fade-up items-start gap-3 rounded-2xl px-4 py-3 text-sm shadow-soft ${
              t.tone === 'error' ? 'bg-red-700 text-white' : t.tone === 'info' ? 'bg-white text-cocoa-700' : 'bg-cocoa-700 text-cream'
            }`}
          >
            {t.tone === 'error' ? <CloseIcon className="mt-0.5 shrink-0" width={16} /> : <CheckIcon className="mt-0.5 shrink-0" width={16} />}
            <span className="flex-1">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
