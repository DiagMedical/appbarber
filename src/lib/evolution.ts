import { supabase } from '@/lib/supabase'
import type { WhatsAppConfig } from '@/types/database'

interface SendTextParams {
  number: string
  text: string
  shopId: string
}

async function getConfig(shopId: string): Promise<WhatsAppConfig | null> {
  const { data } = await supabase
    .from('whatsapp_configs')
    .select('*')
    .eq('shop_id', shopId)
    .eq('active', true)
    .maybeSingle()

  if (!data) return null
  return data as WhatsAppConfig
}

export async function sendText({ number, text, shopId }: SendTextParams): Promise<boolean> {
  try {
    const config = await getConfig(shopId)
    if (!config) {
      console.warn('[Evolution] Nenhuma configuração ativa encontrada')
      return false
    }

    const cleanNumber = number.replace(/\D/g, '')

    const response = await fetch(
      `${config.server_url}/message/sendText/${config.instance_name}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: config.api_key,
        },
        body: JSON.stringify({
          number: cleanNumber,
          text,
          delay: 1000,
        }),
      }
    )

    if (!response.ok) {
      console.error('[Evolution] Erro ao enviar mensagem:', await response.text())
      return false
    }

    return true
  } catch (err) {
    console.error('[Evolution] Erro:', err)
    return false
  }
}
