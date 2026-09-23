import Link from 'next/link';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { ProductForm } from '@/components/admin/ProductForm';

export const metadata = { title: 'Novo produto' };

export default function NewProductPage() {
  return (
    <>
      <Link href="/admin/produtos" className="text-sm text-cocoa-400 hover:text-cocoa-700">
        ← Produtos
      </Link>
      <AdminPageHeader title="Novo produto" />
      <ProductForm />
    </>
  );
}
