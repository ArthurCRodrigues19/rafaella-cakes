import { CustomerOrderView } from '@/components/orders/CustomerOrderView';

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ novo?: string }>;
}) {
  const [{ id }, { novo }] = await Promise.all([params, searchParams]);
  return <CustomerOrderView id={id} isNew={novo === '1'} />;
}
