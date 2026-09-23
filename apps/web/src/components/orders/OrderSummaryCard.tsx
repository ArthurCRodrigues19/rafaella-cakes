import { formatBRL, formatDateLong } from '@/lib/format';
import type { Order } from '@/lib/types';
import { SafeImage } from '../SafeImage';

/** Itens, totais e dados de entrega de um pedido (usado pelo cliente e pelo admin). */
export function OrderSummaryCard({ order }: { order: Order }) {
  const a = order.shippingAddress;
  return (
    <div className="card space-y-6 p-6 sm:p-8">
      <div>
        <h2 className="heading-md mb-4 text-xl">Itens</h2>
        <ul className="divide-y divide-blush-100">
          {order.items.map((i) => (
            <li key={i.id} className="flex items-center gap-4 py-3">
              <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-blush-100">
                <SafeImage src={i.imageUrl} alt={i.productName} fill sizes="64px" className="object-cover" />
              </span>
              <span className="flex-1 text-sm">
                <span className="block font-medium text-cocoa-800">
                  {i.quantity}× {i.productName}
                </span>
                {i.variantName && <span className="text-cocoa-400">{i.variantName}</span>}
              </span>
              <span className="text-sm font-semibold">{formatBRL(i.totalCents)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1.5 border-t border-blush-100 pt-4 text-sm">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>{formatBRL(order.subtotalCents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Frete</dt>
            <dd>{order.shippingCents ? formatBRL(order.shippingCents) : 'Grátis'}</dd>
          </div>
          <div className="flex justify-between pt-2 font-serif text-lg text-cocoa-800">
            <dt>Total</dt>
            <dd>{formatBRL(order.totalCents)}</dd>
          </div>
        </dl>
      </div>

      <div className="grid gap-6 border-t border-blush-100 pt-6 text-sm sm:grid-cols-2">
        <div>
          <h3 className="mb-2 font-serif text-base">{order.fulfillmentType === 'PICKUP' ? 'Retirada na loja' : 'Entrega'}</h3>
          <p className="capitalize text-cocoa-600">{formatDateLong(order.scheduledDate)}</p>
          {a && (
            <p className="mt-2 text-cocoa-500">
              {a.recipient}
              <br />
              {a.street}, {a.number}
              {a.complement ? ` — ${a.complement}` : ''}
              <br />
              {a.neighborhood} · {a.city}/{a.state}
              {order.shippingZone && <span className="block text-xs text-cocoa-400">Zona: {order.shippingZone}</span>}
            </p>
          )}
        </div>
        {order.notes && (
          <div>
            <h3 className="mb-2 font-serif text-base">Observações</h3>
            <p className="whitespace-pre-line text-cocoa-600">{order.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
