'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, errorMessage } from '@/lib/api';
import { WEEKDAYS, centsToInput, formatBRL, formatCep, parseBRL } from '@/lib/format';
import type { StoreSettings } from '@/lib/types';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { useToast } from '@/components/providers/ToastProvider';
import { Field, Spinner } from '@/components/ui';

interface Zone {
  id: string;
  name: string;
  feeCents: number;
  cepStart: string | null;
  cepEnd: string | null;
  neighborhoods: string[];
  isActive: boolean;
  sortOrder: number;
}

type ZoneDraft = { id?: string; name: string; fee: string; cepStart: string; cepEnd: string; neighborhoods: string; isActive: boolean; sortOrder: number };
const EMPTY_ZONE: ZoneDraft = { name: '', fee: '', cepStart: '', cepEnd: '', neighborhoods: '', isActive: true, sortOrder: 0 };

export default function AdminSettingsPage() {
  const toast = useToast();
  const [s, setS] = useState<StoreSettings | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [zones, setZones] = useState<Zone[]>([]);
  const [zone, setZone] = useState<ZoneDraft>(EMPTY_ZONE);
  const [zoneSaving, setZoneSaving] = useState(false);

  const loadZones = useCallback(() => {
    api<Zone[]>('/admin/shipping-zones').then(setZones).catch(() => {});
  }, []);

  useEffect(() => {
    api<StoreSettings>('/admin/settings').then(setS).catch(() => {});
    loadZones();
  }, [loadZones]);

  const set = <K extends keyof StoreSettings>(k: K, v: StoreSettings[K]) => setS((cur) => (cur ? { ...cur, [k]: v } : cur));

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!s) return;
    setSaving(true);
    setErrors({});
    try {
      const { storeName, phone, whatsapp, email, instagramHandle, addressLine, city, mapQuery, openingHours, aboutText, minLeadDays, customMinLeadDays, openWeekdays, pickupEnabled, deliveryEnabled } = s;
      setS(
        await api<StoreSettings>('/admin/settings', {
          method: 'PUT',
          body: { storeName, phone, whatsapp, email, instagramHandle, addressLine, city, mapQuery, openingHours, aboutText, minLeadDays, customMinLeadDays, openWeekdays, pickupEnabled, deliveryEnabled },
        }),
      );
      toast('Configurações salvas! O site é atualizado em até 1 minuto.');
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fields);
      toast(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function saveZone(e: React.FormEvent) {
    e.preventDefault();
    setZoneSaving(true);
    try {
      const body = {
        name: zone.name,
        feeCents: parseBRL(zone.fee),
        cepStart: zone.cepStart || null,
        cepEnd: zone.cepEnd || null,
        neighborhoods: zone.neighborhoods.split(/[,\n]/).map((n) => n.trim()).filter(Boolean),
        isActive: zone.isActive,
        sortOrder: zone.sortOrder,
      };
      if (zone.id) await api(`/admin/shipping-zones/${zone.id}`, { method: 'PUT', body });
      else await api('/admin/shipping-zones', { body });
      toast('Zona de entrega salva!');
      setZone(EMPTY_ZONE);
      loadZones();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setZoneSaving(false);
    }
  }

  async function removeZone(z: Zone) {
    if (!window.confirm(`Excluir a zona “${z.name}”?`)) return;
    await api(`/admin/shipping-zones/${z.id}`, { method: 'DELETE' }).catch(() => {});
    loadZones();
  }

  if (!s) return <div className="skeleton h-96" />;

  return (
    <>
      <AdminPageHeader title="Configurações" subtitle="Informações da loja, prazos e áreas de entrega." />

      <form onSubmit={saveSettings} className="grid gap-6 xl:grid-cols-2">
        <section className="card space-y-4 p-6">
          <h2 className="heading-md text-xl">Dados da loja</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome" htmlFor="storeName">
              <input id="storeName" className="input" value={s.storeName} onChange={(e) => set('storeName', e.target.value)} />
            </Field>
            <Field label="E-mail de contato" htmlFor="email" error={errors.email}>
              <input id="email" type="email" className="input" value={s.email} onChange={(e) => set('email', e.target.value)} />
            </Field>
            <Field label="Telefone" htmlFor="phone">
              <input id="phone" className="input" value={s.phone} onChange={(e) => set('phone', e.target.value)} />
            </Field>
            <Field label="WhatsApp (com DDI e DDD)" htmlFor="whatsapp" hint="Ex.: 5511987654321">
              <input id="whatsapp" className="input" value={s.whatsapp} onChange={(e) => set('whatsapp', e.target.value.replace(/\D/g, ''))} />
            </Field>
            <Field label="Instagram (sem @)" htmlFor="instagram">
              <input id="instagram" className="input" value={s.instagramHandle} onChange={(e) => set('instagramHandle', e.target.value)} />
            </Field>
            <Field label="Cidade / UF" htmlFor="city">
              <input id="city" className="input" value={s.city} onChange={(e) => set('city', e.target.value)} />
            </Field>
          </div>
          <Field label="Endereço" htmlFor="addressLine">
            <input id="addressLine" className="input" value={s.addressLine} onChange={(e) => set('addressLine', e.target.value)} />
          </Field>
          <Field label="Busca do mapa" htmlFor="mapQuery" hint="Texto usado no Google Maps da página de contato.">
            <input id="mapQuery" className="input" value={s.mapQuery} onChange={(e) => set('mapQuery', e.target.value)} />
          </Field>
          <Field label="Horários de funcionamento" htmlFor="hours">
            <textarea id="hours" rows={3} className="input" value={s.openingHours} onChange={(e) => set('openingHours', e.target.value)} />
          </Field>
          <Field label="Texto “Sobre a Rafaella” (home)" htmlFor="about">
            <textarea id="about" rows={5} className="input" value={s.aboutText} onChange={(e) => set('aboutText', e.target.value)} />
          </Field>
        </section>

        <section className="card h-fit space-y-5 p-6">
          <h2 className="heading-md text-xl">Prazos e funcionamento</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Prazo mínimo — pedidos da loja (dias)" htmlFor="minLead" error={errors.minLeadDays}>
              <input id="minLead" type="number" min={0} max={60} className="input" value={s.minLeadDays} onChange={(e) => set('minLeadDays', Number(e.target.value))} />
            </Field>
            <Field label="Prazo mínimo — encomendas (dias)" htmlFor="customLead" error={errors.customMinLeadDays}>
              <input id="customLead" type="number" min={0} max={120} className="input" value={s.customMinLeadDays} onChange={(e) => set('customMinLeadDays', Number(e.target.value))} />
            </Field>
          </div>
          <fieldset>
            <legend className="label">Dias com entrega/retirada</legend>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((d, i) => {
                const on = s.openWeekdays.includes(i);
                return (
                  <label key={d} className={`cursor-pointer rounded-full px-4 py-2 text-sm capitalize transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-champagne-400 ${on ? 'bg-cocoa-700 text-cream' : 'bg-white text-cocoa-500 ring-1 ring-blush-200'}`}>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={on}
                      onChange={() => set('openWeekdays', on ? s.openWeekdays.filter((x) => x !== i) : [...s.openWeekdays, i].sort())}
                    />
                    {d.slice(0, 3)}
                  </label>
                );
              })}
            </div>
            {errors.openWeekdays && <p className="field-error">{errors.openWeekdays}</p>}
          </fieldset>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="checkbox" checked={s.pickupEnabled} onChange={(e) => set('pickupEnabled', e.target.checked)} />
            Aceitar retirada na loja
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="checkbox" checked={s.deliveryEnabled} onChange={(e) => set('deliveryEnabled', e.target.checked)} />
            Aceitar entregas
          </label>
          <button className="btn-primary w-full" disabled={saving}>
            {saving && <Spinner />} Salvar configurações
          </button>
        </section>
      </form>

      {/* Zonas de entrega */}
      <section className="mt-10" aria-labelledby="zonas">
        <h2 id="zonas" className="heading-md mb-2">
          Áreas de entrega e frete
        </h2>
        <p className="mb-6 text-sm text-cocoa-500">
          O CEP do cliente é comparado com as zonas na ordem abaixo: primeiro pelos bairros listados, depois pela faixa de CEP. A primeira que
          combinar define o frete.
        </p>
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="card overflow-x-auto">
            <table className="table-admin">
              <thead>
                <tr>
                  <th>Zona</th>
                  <th>Abrangência</th>
                  <th>Frete</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {zones.map((z) => (
                  <tr key={z.id} className={z.isActive ? '' : 'opacity-50'}>
                    <td className="font-medium text-cocoa-800">{z.name}</td>
                    <td className="max-w-xs text-xs text-cocoa-500">
                      {z.cepStart && z.cepEnd && (
                        <span className="block">
                          CEP {formatCep(z.cepStart)} a {formatCep(z.cepEnd)}
                        </span>
                      )}
                      {z.neighborhoods.length > 0 && <span className="block">{z.neighborhoods.join(', ')}</span>}
                    </td>
                    <td>{z.feeCents ? formatBRL(z.feeCents) : 'Grátis'}</td>
                    <td className="whitespace-nowrap text-right">
                      <button
                        type="button"
                        className="btn-ghost btn-sm"
                        onClick={() =>
                          setZone({
                            id: z.id,
                            name: z.name,
                            fee: centsToInput(z.feeCents),
                            cepStart: z.cepStart ?? '',
                            cepEnd: z.cepEnd ?? '',
                            neighborhoods: z.neighborhoods.join(', '),
                            isActive: z.isActive,
                            sortOrder: z.sortOrder,
                          })
                        }
                      >
                        Editar
                      </button>
                      <button type="button" className="btn-ghost btn-sm text-red-700" onClick={() => removeZone(z)}>
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form onSubmit={saveZone} className="card h-fit space-y-4 p-6">
            <h3 className="heading-md text-xl">{zone.id ? 'Editar zona' : 'Nova zona'}</h3>
            <Field label="Nome" htmlFor="z-name">
              <input id="z-name" required className="input" value={zone.name} onChange={(e) => setZone({ ...zone, name: e.target.value })} placeholder="Ex.: Zona Sul" />
            </Field>
            <Field label="Valor do frete (R$)" htmlFor="z-fee">
              <input id="z-fee" required inputMode="decimal" className="input" value={zone.fee} onChange={(e) => setZone({ ...zone, fee: e.target.value })} placeholder="0,00" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="CEP inicial" htmlFor="z-start">
                <input id="z-start" inputMode="numeric" className="input" value={formatCep(zone.cepStart)} onChange={(e) => setZone({ ...zone, cepStart: e.target.value.replace(/\D/g, '') })} />
              </Field>
              <Field label="CEP final" htmlFor="z-end">
                <input id="z-end" inputMode="numeric" className="input" value={formatCep(zone.cepEnd)} onChange={(e) => setZone({ ...zone, cepEnd: e.target.value.replace(/\D/g, '') })} />
              </Field>
            </div>
            <Field label="Bairros (separados por vírgula)" htmlFor="z-nb">
              <textarea id="z-nb" rows={3} className="input" value={zone.neighborhoods} onChange={(e) => setZone({ ...zone, neighborhoods: e.target.value })} />
            </Field>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="checkbox" checked={zone.isActive} onChange={(e) => setZone({ ...zone, isActive: e.target.checked })} />
                Ativa
              </label>
              <label className="flex items-center gap-2 text-sm" htmlFor="z-order">
                Ordem
                <input id="z-order" type="number" min={0} className="input w-20 py-1.5" value={zone.sortOrder} onChange={(e) => setZone({ ...zone, sortOrder: Number(e.target.value) })} />
              </label>
            </div>
            <div className="flex gap-2">
              <button className="btn-primary" disabled={zoneSaving}>
                {zoneSaving && <Spinner />} Salvar zona
              </button>
              {zone.id && (
                <button type="button" className="btn-ghost" onClick={() => setZone(EMPTY_ZONE)}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>
      </section>
    </>
  );
}
