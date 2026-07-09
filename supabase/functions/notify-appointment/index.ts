import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE'
  table: string
  record: {
    id: string
    shop_id: string
    barber_id: string
    client_id: string
    service_id: string
    start_time: string
    status: string
  }
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const payload: WebhookPayload = await req.json()

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { record } = payload

    if (record.status === 'cancelled') {
      return new Response('Cancelled appointments are ignored', { status: 200 })
    }

    const [clientRes, barberRes, serviceRes] = await Promise.all([
      supabase.from('clients').select('name, phone').eq('id', record.client_id).single(),
      supabase.from('barbers').select('name').eq('id', record.barber_id).single(),
      supabase.from('services').select('name').eq('id', record.service_id).single(),
    ])

    const client = clientRes.data as { name: string; phone: string } | null
    const barber = barberRes.data as { name: string } | null
    const service = serviceRes.data as { name: string } | null

    if (!client) {
      return new Response('Client not found', { status: 404 })
    }

    const date = new Date(record.start_time).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    const time = new Date(record.start_time).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })

    const msg = [
      `🪒 *AppBarber*`,
      ``,
      payload.type === 'INSERT'
        ? `Olá ${client.name}, seu agendamento foi confirmado!`
        : `Olá ${client.name}, seu agendamento foi atualizado!`,
      ``,
      `📅 ${date} às ${time}`,
      `💈 ${service?.name ?? 'Serviço'}`,
      `✂️ ${barber?.name ?? 'Barbeiro'}`,
    ].join('\n')

    const { data: config } = await supabase
      .from('whatsapp_configs')
      .select('server_url, instance_name, api_key')
      .eq('active', true)
      .maybeSingle()

    if (!config) {
      console.warn('[notify-appointment] WhatsApp config not found')
      return new Response('WhatsApp not configured', { status: 200 })
    }

    const c = config as { server_url: string; instance_name: string; api_key: string }

    const response = await fetch(
      `${c.server_url.replace(/\/$/, '')}/message/sendText/${c.instance_name}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: c.api_key,
        },
        body: JSON.stringify({
          number: client.phone.replace(/\D/g, ''),
          text: msg,
          delay: 1000,
        }),
      },
    )

    if (!response.ok) {
      const err = await response.text()
      console.error('[notify-appointment] Evolution API error:', err)
      return new Response(err, { status: 500 })
    }

    return new Response('OK', { status: 200 })
  } catch (err) {
    console.error('[notify-appointment] Error:', err)
    return new Response(err instanceof Error ? err.message : 'Internal error', { status: 500 })
  }
})
