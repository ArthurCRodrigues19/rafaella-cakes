'use client';

/** Select de ordenação que envia o formulário de filtros ao mudar. */
export function SortSelect({ defaultValue }: { defaultValue: string }) {
  return (
    <select
      id="sort"
      name="sort"
      defaultValue={defaultValue}
      className="input w-auto py-2 pr-10"
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
    >
      <option value="relevance">Destaques</option>
      <option value="price_asc">Menor preço</option>
      <option value="price_desc">Maior preço</option>
      <option value="newest">Novidades</option>
      <option value="name">Nome (A–Z)</option>
    </select>
  );
}
