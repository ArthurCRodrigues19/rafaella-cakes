'use client';

import Link from 'next/link';
import { useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '../providers/AuthProvider';
import { StarIcon } from '../icons';
import { Alert, Spinner } from '../ui';

export function ReviewForm({ slug }: { slug: string }) {
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [sending, setSending] = useState(false);

  if (!user) {
    return (
      <p className="text-sm text-cocoa-500">
        <Link href={`/entrar?next=/produtos/${slug}`} className="link">
          Entre na sua conta
        </Link>{' '}
        para avaliar este produto.
      </p>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setStatus(null);
    try {
      const res = await api<{ message: string }>(`/products/${slug}/reviews`, { body: { rating, comment } });
      setStatus({ tone: 'success', text: res.message });
      setComment('');
    } catch (error) {
      setStatus({ tone: 'error', text: errorMessage(error) });
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4 p-6">
      <h3 className="heading-md text-xl">Deixe sua avaliação</h3>
      <fieldset>
        <legend className="label">Sua nota</legend>
        <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              aria-label={`${n} estrela${n > 1 ? 's' : ''}`}
              aria-pressed={rating === n}
              className="text-champagne-500 transition hover:scale-110"
            >
              <StarIcon filled={n <= (hover || rating)} width={28} height={28} className={n <= (hover || rating) ? '' : 'text-cocoa-200'} />
            </button>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="review-comment" className="label">
          Comentário
        </label>
        <textarea
          id="review-comment"
          required
          maxLength={1000}
          rows={4}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="input"
          placeholder="Conte o que achou do sabor, da apresentação, da entrega..."
        />
      </div>
      {status && <Alert tone={status.tone}>{status.text}</Alert>}
      <button className="btn-primary" disabled={sending || !comment.trim()}>
        {sending && <Spinner />} Enviar avaliação
      </button>
    </form>
  );
}
