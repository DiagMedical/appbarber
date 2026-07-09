import { supabase } from '@/lib/supabase'
import { getPublicShopSlugFromLocation } from '@/lib/site'
import type { Barber, Service, Shop } from '@/types/database'

export interface PublicShopContext {
  shop: Shop
  barbers: Barber[]
  services: Service[]
}

export function resolvePublicShopSlug() {
  return getPublicShopSlugFromLocation()
}

async function tryLoadShop(filter: Record<string, string>): Promise<Shop | null> {
  const { data, error } = await supabase
    .from('shops')
    .select('*')
    .match(filter)
    .maybeSingle()

  if (error) {
    if (error.code === '42703') return null
    throw error
  }

  return (data as Shop | null) ?? null
}

async function loadFirstShop(): Promise<Shop | null> {
  const { data, error } = await supabase
    .from('shops')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return (data as Shop | null) ?? null
}

export async function loadPublicShopContext(slug: string | null): Promise<PublicShopContext | null> {
  let shop: Shop | null = null

  if (slug) {
    shop = await tryLoadShop({ public_slug: slug })
  }

  if (!shop) {
    shop = await loadFirstShop()
  }

  if (!shop) return null

  const [barbersRes, servicesRes] = await Promise.all([
    supabase.from('barbers').select('*').eq('shop_id', shop.id).eq('active', true).order('name'),
    supabase.from('services').select('*').eq('shop_id', shop.id).eq('active', true).order('name'),
  ])

  return {
    shop: shop as Shop,
    barbers: (barbersRes.data ?? []) as Barber[],
    services: (servicesRes.data ?? []) as Service[],
  }
}
