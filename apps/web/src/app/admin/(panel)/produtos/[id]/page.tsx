'use client';

import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { ProductForm, type AdminProduct } from '@/components/admin/ProductForm';
import { Alert } from '@/components/ui';

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [product, setProduct] = useState<AdminProduct | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<AdminProduct>(`/admin/products/${id}`).then(setProduct).catch((e) => setError(errorMessage(e)));
  }, [id]);

  return (
    <>
      <Link href="/admin/produtos" className="text-sm text-cocoa-400 hover:text-cocoa-700">
        ← Produtos
      </Link>
      <AdminPageHeader title={product ? product.name : 'Editar produto'} />
      {error ? <Alert tone="error">{error}</Alert> : product ? <ProductForm key={product.id} product={product} /> : <div className="skeleton h-96" />}
    </>
  );
}
