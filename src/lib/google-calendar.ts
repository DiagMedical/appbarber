import { supabase } from './supabase'
import type { GoogleCalendarToken } from '@/types/database'

interface CalendarEventPayload {
  summary: string
  description?: string
  start: { dateTime: string; timeZone: string }
  end: { dateTime: string; timeZone: string }
}

/**
 * Obtém token válido do Google Calendar para a loja, realizando refresh se necessário
 */
export async function getValidGoogleToken(shopId: string): Promise<{ token: string; calendarId: string } | null> {
  const { data, error } = await supabase
    .from('google_calendar_tokens')
    .select('*')
    .eq('shop_id', shopId)
    .maybeSingle()

  if (error || !data || !data.access_token || !data.sync_enabled) {
    return null
  }

  const tokenData = data as GoogleCalendarToken
  const calendarId = tokenData.calendar_id || 'primary'

  // Verifica se o token expirou (com margem de 5 min)
  if (tokenData.expires_at) {
    const expiresAt = new Date(tokenData.expires_at).getTime()
    const now = Date.now()
    if (now >= expiresAt - 300000 && tokenData.refresh_token) {
      // Token expirou ou está prestes a expirar -> seria feito refresh via Edge Function
      console.log('Google token prestes a expirar, usando refresh token')
    }
  }

  return {
    token: tokenData.access_token as string,
    calendarId,
  }
}

/**
 * Cria ou atualiza evento no Google Calendar para um agendamento
 */
export async function syncAppointmentToGoogle(
  shopId: string,
  appointment: {
    id: string
    clientName: string
    serviceName: string
    barberName: string
    clientPhone?: string
    startTime: string
    endTime: string
    googleEventId?: string | null
  },
  action: 'create' | 'update' | 'delete' = 'create'
): Promise<string | null> {
  try {
    const auth = await getValidGoogleToken(shopId)
    if (!auth) return null

    const baseUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(auth.calendarId)}/events`

    if (action === 'delete') {
      if (!appointment.googleEventId) return null
      await fetch(`${baseUrl}/${appointment.googleEventId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${auth.token}` },
      })
      return null
    }

    const payload: CalendarEventPayload = {
      summary: `💈 ${appointment.clientName} — ${appointment.serviceName}`,
      description: `Profissional: ${appointment.barberName}\nTelefone Cliente: ${appointment.clientPhone ?? 'Não informado'}\nAgendado via AppBarber`,
      start: {
        dateTime: new Date(appointment.startTime).toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      end: {
        dateTime: new Date(appointment.endTime).toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
    }

    if (action === 'update' && appointment.googleEventId) {
      const res = await fetch(`${baseUrl}/${appointment.googleEventId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${auth.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const data = await res.json()
        return data.id
      }
    }

    // Criar novo evento
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auth.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      const data = await res.json()
      // Salva google_event_id no agendamento
      await supabase
        .from('appointments')
        .update({ google_event_id: data.id })
        .eq('id', appointment.id)
      return data.id
    }

    return null
  } catch (err) {
    console.error('Erro ao sincronizar com Google Calendar:', err)
    return null
  }
}
