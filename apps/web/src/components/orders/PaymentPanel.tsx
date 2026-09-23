'use client';

import { useEffect, useRef, useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { formatBRL } from '@/lib/format';
import type { Order, Payment, PaymentMethod } from '@/lib/types';
import { useToast } from '../providers/ToastProvider';
import { Alert, Spinner } from '../ui';

interface PaymentConfig {
  provider: 'mercadopago' | 'mock';
  publicKey: string | null;
}

// Tipagem mínima do SDK MercadoPago.js v2 (carregado via <script>)
declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, options?: { locale?: string }) => {
      bricks: () => {
        create: (brick: 'cardPayment', containerId: string, settings: unknown) => Promise<{ unmount: () => void }>;
      };
    };
  }
}

function loadMercadoPagoSdk(): Promise<void> {
  if (window.MercadoPago) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-mp-sdk]');
    const script = existing ?? document.createElement('script');
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.async = true;
    script.dataset.mpSdk = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Falha ao carregar o Mercado Pago'));
    if (!existing) document.body.appendChild(script);
  });
}

/**
 * Painel de pagamento do pedido.
 * - Pix: gera QR Code + "copia e cola" (o status é atualizado automaticamente)
 * - Cartão: Card Payment Brick do Mercado Pago — os dados do cartão vão direto
 *   para o Mercado Pago (tokenização), nunca passam pelo nosso servidor.
 * - Modo demonstração: botões para simular a aprovação.
 */
export function PaymentPanel({ order, onChange }: { order: Order; onChange: () => void }) {
  const toast = useToast();
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [method, setMethod] = useState<PaymentMethod>(order.paymentMethod);
  const [pix, setPix] = useState<Payment | null>(
    order.payments.find((p) => p.method === 'PIX' && p.status === 'PENDING') ?? null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const brickRef = useRef<{ unmount: () => void } | null>(null);

  useEffect(() => {
    api<PaymentConfig>('/payments/config').then(setConfig).catch(() => setConfig({ provider: 'mock', publicKey: null }));
  }, []);

  const lastRejected = order.payments[0]?.status === 'REJECTED';

  async function generatePix() {
    setLoading(true);
    setError('');
    try {
      setPix(await api<Payment>(`/orders/${order.id}/pay`, { body: { method: 'PIX' } }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function payMockCard() {
    setLoading(true);
    setError('');
    try {
      const p = await api<Payment>(`/orders/${order.id}/pay`, { body: { method: 'CARD', token: 'demo-token' } });
      if (p.status === 'APPROVED') toast('Pagamento aprovado! 🎉');
      else setError('Pagamento recusado. Tente novamente.');
      onChange();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function simulate() {
    setLoading(true);
    try {
      await api(`/orders/${order.id}/simulate-payment`, { method: 'POST' });
      toast('Pagamento simulado com sucesso! 🎉');
      onChange();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  // Monta o Card Payment Brick quando o gateway é o Mercado Pago
  useEffect(() => {
    if (method !== 'CARD' || config?.provider !== 'mercadopago' || !config.publicKey) return;
    let cancelled = false;
    const publicKey = config.publicKey;

    loadMercadoPagoSdk()
      .then(async () => {
        if (cancelled || !window.MercadoPago) return;
        const mp = new window.MercadoPago(publicKey, { locale: 'pt-BR' });
        brickRef.current = await mp.bricks().create('cardPayment', 'cardPaymentBrick_container', {
          initialization: { amount: order.totalCents / 100, payer: { email: order.customerEmail } },
          customization: { visual: { style: { theme: 'default' } }, paymentMethods: { maxInstallments: 12 } },
          callbacks: {
            onReady: () => {},
            onError: (e: unknown) => console.error('[mercadopago]', e),
            onSubmit: async (formData: {
              token: string;
              issuer_id?: string;
              payment_method_id: string;
              installments: number;
              payer?: { identification?: { type: string; number: string } };
            }) => {
              setError('');
              try {
                const p = await api<Payment>(`/orders/${order.id}/pay`, {
                  body: {
                    method: 'CARD',
                    token: formData.token,
                    paymentMethodId: formData.payment_method_id,
                    installments: formData.installments,
                    issuerId: formData.issuer_id,
                    identification: formData.payer?.identification,
                  },
                });
                if (p.status === 'APPROVED') toast('Pagamento aprovado! 🎉');
                else if (p.status === 'REJECTED') setError('O pagamento foi recusado pelo emissor. Confira os dados ou use outro cartão.');
                else toast('Pagamento em análise. Avisaremos por e-mail.', 'info');
                onChange();
              } catch (err) {
                setError(errorMessage(err));
                throw err; // o Brick volta ao estado de edição
              }
            },
          },
        });
      })
      .catch(() => setError('Não foi possível carregar o formulário de cartão.'));

    return () => {
      cancelled = true;
      brickRef.current?.unmount();
      brickRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method, config?.provider, config?.publicKey, order.id, order.totalCents]);

  async function copyPix() {
    if (!pix?.pixQrCode) return;
    try {
      await navigator.clipboard.writeText(pix.pixQrCode);
      toast('Código Pix copiado!');
    } catch {
      toast('Não foi possível copiar. Selecione o código manualmente.', 'error');
    }
  }

  if (!config) return <div className="skeleton h-48" />;
  const demo = config.provider === 'mock';

  return (
    <section className="card p-6 sm:p-8" aria-labelledby="pagamento-title">
      <h2 id="pagamento-title" className="heading-md text-xl">
        Pagamento · {formatBRL(order.totalCents)}
      </h2>
      <p className="mt-1 text-sm text-cocoa-500">Seu pedido está reservado. Conclua o pagamento para confirmarmos a produção.</p>

      {demo && (
        <div className="mt-4">
          <Alert tone="warning">
            <strong>Modo de demonstração:</strong> nenhuma cobrança real é feita. Configure as chaves do Mercado Pago no
            arquivo .env para receber pagamentos de verdade.
          </Alert>
        </div>
      )}
      {lastRejected && !error && (
        <div className="mt-4">
          <Alert tone="error">A última tentativa de pagamento foi recusada. Tente novamente.</Alert>
        </div>
      )}

      <div className="mt-6 inline-flex rounded-full bg-blush-50 p-1" role="tablist" aria-label="Forma de pagamento">
        {(['PIX', 'CARD'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={method === m}
            onClick={() => setMethod(m)}
            className={`rounded-full px-5 py-2 text-sm transition ${method === m ? 'bg-white text-cocoa-800 shadow-card' : 'text-cocoa-500'}`}
          >
            {m === 'PIX' ? 'Pix' : 'Cartão de crédito'}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {method === 'PIX' &&
          (pix ? (
            <div className="grid items-center gap-6 sm:grid-cols-[200px_1fr]">
              <div className="mx-auto flex h-48 w-48 items-center justify-center overflow-hidden rounded-2xl border border-blush-100 bg-white p-2">
                {pix.pixQrCodeBase64 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`data:image/png;base64,${pix.pixQrCodeBase64}`} alt="QR Code do Pix" className="h-full w-full" />
                ) : (
                  <span className="text-center text-xs text-cocoa-400">QR Code de demonstração</span>
                )}
              </div>
              <div className="space-y-3">
                <p className="text-sm text-cocoa-600">
                  Abra o app do seu banco, escolha <strong>Pix → Ler QR Code</strong> ou use o código abaixo. A confirmação aparece aqui
                  automaticamente.
                </p>
                <label htmlFor="pix-code" className="label">
                  Pix copia e cola
                </label>
                <div className="flex gap-2">
                  <input id="pix-code" readOnly value={pix.pixQrCode ?? ''} className="input font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
                  <button type="button" className="btn-outline btn-sm shrink-0" onClick={copyPix}>
                    Copiar
                  </button>
                </div>
                <p className="flex items-center gap-2 text-xs text-cocoa-400">
                  <Spinner /> Aguardando pagamento...
                </p>
                {demo && (
                  <button type="button" className="btn-rose btn-sm" onClick={simulate} disabled={loading}>
                    Simular pagamento aprovado
                  </button>
                )}
              </div>
            </div>
          ) : (
            <button type="button" className="btn-primary" onClick={generatePix} disabled={loading}>
              {loading && <Spinner />} Gerar código Pix
            </button>
          ))}

        {method === 'CARD' &&
          (demo ? (
            <div className="space-y-3">
              <p className="text-sm text-cocoa-600">
                No modo de demonstração não pedimos dados de cartão. Clique abaixo para simular um pagamento aprovado.
              </p>
              <button type="button" className="btn-primary" onClick={payMockCard} disabled={loading}>
                {loading && <Spinner />} Pagar com cartão (simulado)
              </button>
            </div>
          ) : config.publicKey ? (
            <div id="cardPaymentBrick_container" />
          ) : (
            <Alert tone="warning">Pagamento com cartão indisponível: configure MP_PUBLIC_KEY no .env.</Alert>
          ))}
      </div>

      {error && (
        <div className="mt-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}
    </section>
  );
}
