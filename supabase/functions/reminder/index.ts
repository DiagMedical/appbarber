import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (_req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const now = new Date()
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000)
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000)

    const { data: appointments } = await supabase
      .from('appointments')
      .select('id, start_time, client_id, barber_id, service_id')
      .gte('start_time', oneHourLater.toISOString())
      .lte('start_time', twoHoursLater.toISOString())
      .eq('status', 'confirmed')

    const list = (appointments ?? []) as {
      id: string
      start_time: string
      client_id: string
      barber_id: string
      service_id: string
    }[]

    if (list.length === 0) {
      return new Response('No upcoming appointments', { status: 200 })
    }

    const clientIds = [...new Set(list.map((a) => a.client_id))]
    const barberIds = [...new Set(list.map((a) => a.barber_id))]
    const serviceIds = [...new Set(list.map((a) => a.service_id))]

    const [clientsRes, barbersRes, servicesRes] = await Promise.all([
      supabase.from('clients').select('id, name, phone').in('id', clientIds),
      supabase.from('barbers').select('id, name').in('id', barberIds),
      supabase.from('services').select('id, name').in('id', serviceIds),
    ])

    const clientMap = new Map((clientsRes.data ?? []).map((c: { id: string; name: string; phone: string }) => [c.id, c]))
    const barberMap = new Map((barbersRes.data ?? []).map((b: { id: string; name: string }) => [b.id, b.name]))
    const serviceMap = new Map((servicesRes.data ?? []).map((s: { id: string; name: string }) => [s.id, s.name]))

    const { data: config } = await supabase
      .from('whatsapp_configs')
      .select('server_url, instance_name, api_key')
      .eq('active', true)
      .maybeSingle()

    if (!config) {
      console.warn('[reminder] WhatsApp config not found')
      return new Response('WhatsApp not configured', { status: 200 })
    }

    const c = config as { server_url: string; instance_name: string; api_key: string }

    const results = await Promise.allSettled(
      list.map(async (apt) => {
        const client = clientMap.get(apt.client_id)
        const barber = barberMap.get(apt.barber_id)
        const service = serviceMap.get(apt.service_id)
        const time = new Date(apt.start_time).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })

        if (!client) return

        const msg = [
          `⏰ *AppBarber — Lembrete*`,
          ``,
          `Olá ${client.name}, você tem um agendamento em 1 hora!`,
          ``,
          `⏱️ ${time}`,
          `💈 ${service ?? 'Serviço'}`,
          `✂️ ${barber ?? 'Barbeiro'}`,
          ``,
          `Não se atrase! 🪒`,
        ].join('\n')

        const res = await fetch(
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

        if (!res.ok) {
          const err = await res.text()
          console.error(`[reminder] Failed to send to ${client.name}:`, err)
        }
      }),
    )

    const sent = results.filter((r) => r.status === 'fulfilled').length
    console.log(`[reminder] Sent ${sent}/${list.length} reminders`)

    return new Response(`Sent ${sent}/${list.length} reminders`, { status: 200 })
  } catch (err) {
    console.error('[reminder] Error:', err)
    return new Response(err instanceof Error ? err.message : 'Internal error', { status: 500 })
  }
})
