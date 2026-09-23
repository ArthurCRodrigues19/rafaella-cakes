import { ORDER_STATUS, formatDateTime } from '@/lib/format';
import type { Order, OrderStatus } from '@/lib/types';
import { CheckIcon } from '../icons';

/** Linha do tempo do pedido: recebido → em preparo → pronto → (saiu para entrega) → entregue */
export function OrderTimeline({ order }: { order: Order }) {
  if (order.status === 'CANCELED') {
    return <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-800">Este pedido foi cancelado. Em caso de dúvidas, fale com a gente.</p>;
  }

  const steps: OrderStatus[] = ['PENDING_PAYMENT', 'RECEIVED', 'IN_PREPARATION', 'READY'];
  if (order.fulfillmentType === 'DELIVERY') steps.push('OUT_FOR_DELIVERY');
  steps.push('DELIVERED');

  const currentIndex = steps.indexOf(order.status);
  const when = (s: OrderStatus) => order.statusHistory.find((h) => h.status === s)?.createdAt;

  return (
    <ol className="relative space-y-6 border-l-2 border-blush-100 pl-8">
      {steps.map((s, i) => {
        const done = i <= currentIndex;
        const current = i === currentIndex;
        const label = s === 'DELIVERED' && order.fulfillmentType === 'PICKUP' ? 'Retirado' : ORDER_STATUS[s].label;
        const at = when(s);
        return (
          <li key={s} className="relative" aria-current={current ? 'step' : undefined}>
            <span
              className={`absolute -left-[2.55rem] flex h-7 w-7 items-center justify-center rounded-full border-2 ${
                done ? 'border-cocoa-700 bg-cocoa-700 text-cream' : 'border-blush-200 bg-white text-transparent'
              } ${current ? 'ring-4 ring-blush-200' : ''}`}
            >
              <CheckIcon width={14} height={14} />
            </span>
            <p className={`font-medium ${done ? 'text-cocoa-800' : 'text-cocoa-300'}`}>{label}</p>
            {at && <p className="text-xs text-cocoa-400">{formatDateTime(at)}</p>}
          </li>
        );
      })}
    </ol>
  );
}
