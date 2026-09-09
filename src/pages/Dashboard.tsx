import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { StatsCardSkeleton } from '@/components/Skeleton'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import PageTransition from '@/components/PageTransition'
import {
  addUTC3Days,
  endOfUTC3DayISO,
  formatDateTime,
  formatTime,
  getUTC3DateKey,
  getUTC3TimeParts,
  getUTC3WeekStart,
  startOfUTC3DayISO,
  startOfUTC3MonthISO,
} from '@/lib/timezone'
import { AlertCircle, Calendar, CheckCircle2, ChevronLeft, ChevronRight, Clock, DollarSign, Users, Scissors, XCircle, Globe, Copy } from 'lucide-react'
import { useAuth } from '@/providers/AuthProvider'
import { buildPublicSiteUrl } from '@/lib/site'
import { toast } from 'sonner'
import type { Barber } from '@/types/database'

const WEEKDAY_LABELS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

interface DashboardCounts {
  barbers: number
  services: number
  todayAppointments: number
  totalAppointments: number
  monthRevenue: number
}

interface ScheduleAppt {
  id: string
  barber_id: string
  barber_name: string
  client_name: string
  service_name: string
  start_time: string
  end_time: string
  status: string
}

interface AppointmentRow {
  id: string
  barber_id: string
  client_id: string
  service_id: string
  start_time: string
  end_time: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
}

interface UpcomingAppointment {
  id: string
  barber_name: string
  client_name: string
  service_name: string
  start_time: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
}

interface BarberLoad {
  id: string
  name: string
  total: number
  nextStart: string | null
}

interface OperationalMetrics {
  nextTwoHours: number
  pendingToday: number
  completedToday: number
  cancelledToday: number
}

function AnimatedCounter({ value, duration = 1200 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef<number | null>(null)

  useEffect(() => {
    const start = performance.now()
    ref.current = requestAnimationFrame(function tick(now) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.floor(eased * value))
      if (progress < 1) ref.current = requestAnimationFrame(tick)
    })
    return () => { if (ref.current) cancelAnimationFrame(ref.current) }
  }, [value, duration])

  return <>{display}</>
}

const cards = [
  {
    label: 'Barbeiros', icon: Users, from: 'from-amber-500', to: 'to-yellow-600',
    border: 'border-amber-500/20', shadow: 'shadow-amber-500/10', delay: 0,
  },
  {
    label: 'Serviços', icon: Scissors, from: 'from-orange-500', to: 'to-amber-600',
    border: 'border-orange-500/20', shadow: 'shadow-orange-500/10', delay: 100,
  },
  {
    label: 'Agendamentos Hoje', icon: Calendar, from: 'from-amber-400', to: 'to-orange-500',
    border: 'border-amber-500/20', shadow: 'shadow-amber-500/10', delay: 200,
  },
  {
    label: 'Total Agendamentos', icon: Clock, from: 'from-yellow-500', to: 'to-amber-700',
    border: 'border-yellow-500/20', shadow: 'shadow-yellow-500/10', delay: 300,
  },
  {
    label: 'Faturamento do Mês', icon: DollarSign, from: 'from-emerald-500', to: 'to-teal-600',
    border: 'border-emerald-500/20', shadow: 'shadow-emerald-500/10', delay: 400,
  },
]

const statusColors: Record<string, string> = {
  pending: 'border-l-amber-500 bg-amber-500/10 text-amber-300',
  confirmed: 'border-l-amber-400 bg-amber-500/15 text-amber-200',
  completed: 'border-l-emerald-500 bg-emerald-500/10 text-emerald-300',
  cancelled: 'border-l-rose-500 bg-rose-500/10 opacity-50 text-rose-300',
  blocked: 'border-l-zinc-500 bg-zinc-800/40 text-zinc-400',
}

const statusLabels: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
  completed: 'Concluído',
  blocked: 'Bloqueado',
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8)

function formatHour(h: number) {
  return `${String(h).padStart(2, '0')}:00`
}

function getWeekDays(date: Date) {
  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    days.push(addUTC3Days(date, i))
  }
  return days
}

function formatDateISO(d: Date) {
  return getUTC3DateKey(d)
}

function formatDateBR(d: Date) {
  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const wd = WEEKDAY_LABELS[d.getDay()]
  return `${wd}, ${day}/${month}`
}

function Dashboard() {
  const { shop, loading: shopLoading } = useAuth()
  const [counts, setCounts] = useState<DashboardCounts | null>(null)
  const [metrics, setMetrics] = useState<OperationalMetrics>({
    nextTwoHours: 0,
    pendingToday: 0,
    completedToday: 0,
    cancelledToday: 0,
  })
  const [upcomingAppointments, setUpcomingAppointments] = useState<UpcomingAppointment[]>([])
  const [barberLoad, setBarberLoad] = useState<BarberLoad[]>([])
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [schedule, setSchedule] = useState<ScheduleAppt[]>([])
  const [selectedBarber, setSelectedBarber] = useState('')
  const [weekStart, setWeekStart] = useState(() => getUTC3WeekStart())
  // Tick incrementado pelo Realtime para re-disparar os loaders existentes
  const [rtTick, setRtTick] = useState(0)

  const weekDays = getWeekDays(weekStart)

  const currency = useMemo(() => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }), [])

  useEffect(() => {
    if (shopLoading) return
    if (!shop) {
      setCounts({
        barbers: 0,
        services: 0,
        todayAppointments: 0,
        totalAppointments: 0,
        monthRevenue: 0,
      })
      setMetrics({
        nextTwoHours: 0,
        pendingToday: 0,
        completedToday: 0,
        cancelledToday: 0,
      })
      setUpcomingAppointments([])
      setBarberLoad([])
      setBarbers([])
      return
    }

    async function load() {
      const activeShop = shop
      if (!activeShop) return

      try {
        const now = new Date()
        const todayKey = getUTC3DateKey(now)
        const todayStart = startOfUTC3DayISO(todayKey)
        const todayEnd = endOfUTC3DayISO(todayKey)
        const nextTwoHours = new Date(now)
        nextTwoHours.setHours(nextTwoHours.getHours() + 2)

        const monthStart = startOfUTC3MonthISO(now, 0)

        const [barbersCountRes, servicesCountRes, appointmentsCountRes, barbersListRes, todayAppointmentsRes, upcomingRes, monthRevenueRes] = await Promise.all([
          supabase.from('barbers').select('*', { count: 'exact', head: true }).eq('shop_id', activeShop.id),
          supabase.from('services').select('*', { count: 'exact', head: true }).eq('shop_id', activeShop.id),
          supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('shop_id', activeShop.id),
          supabase.from('barbers').select('*').eq('shop_id', activeShop.id).order('name'),
          supabase
            .from('appointments')
            .select('id, barber_id, client_id, service_id, start_time, end_time, status')
            .eq('shop_id', activeShop.id)
            .gte('start_time', todayStart)
            .lte('start_time', todayEnd)
            .order('start_time'),
          supabase
            .from('appointments')
            .select('id, barber_id, client_id, service_id, start_time, end_time, status')
            .eq('shop_id', activeShop.id)
            .gte('start_time', now.toISOString())
            .lte('start_time', nextTwoHours.toISOString())
            .neq('status', 'cancelled')
            .order('start_time')
            .limit(5),
          supabase
            .from('appointments')
            .select('price_at_booking')
            .eq('shop_id', activeShop.id)
            .eq('status', 'completed')
            .gte('start_time', monthStart),
        ])

        if (barbersListRes.error) throw barbersListRes.error
        if (todayAppointmentsRes.error) throw todayAppointmentsRes.error
        if (upcomingRes.error) throw upcomingRes.error

        const rawToday = (todayAppointmentsRes.data ?? []) as AppointmentRow[]
        const rawUpcoming = (upcomingRes.data ?? []) as AppointmentRow[]
        const rawRelevant = [...rawToday, ...rawUpcoming]

        const barberIds = [...new Set(rawRelevant.map((a) => a.barber_id))]
        const clientIds = [...new Set(rawRelevant.map((a) => a.client_id))]
        const serviceIds = [...new Set(rawRelevant.map((a) => a.service_id))]

        const [barbersRes, clientsRes, servicesRes] = await Promise.all([
          barberIds.length ? supabase.from('barbers').select('id, name').in('id', barberIds) : Promise.resolve({ data: [] }),
          clientIds.length ? supabase.from('clients').select('id, name').eq('shop_id', activeShop.id).in('id', clientIds) : Promise.resolve({ data: [] }),
          serviceIds.length ? supabase.from('services').select('id, name').in('id', serviceIds) : Promise.resolve({ data: [] }),
        ])

        const barberMap = new Map((barbersRes.data ?? []).map((b: { id: string; name: string }) => [b.id, b.name]))
        const clientMap = new Map((clientsRes.data ?? []).map((c: { id: string; name: string }) => [c.id, c.name]))
        const serviceMap = new Map((servicesRes.data ?? []).map((s: { id: string; name: string }) => [s.id, s.name]))

        const revenueRows = (monthRevenueRes.data ?? []) as Array<{ price_at_booking: number | null }>
        const monthRevenue = revenueRows.reduce((sum, r) => sum + (r.price_at_booking ?? 0), 0)

        // Multi-serviço para upcoming
        const rawRelevantIds = rawRelevant.map((a) => a.id)
        let multiSvcUpcoming = new Map<string, string>()
        if (rawRelevantIds.length > 0) {
          const { data: svcLinks } = await supabase
            .from('appointment_services')
            .select('appointment_id, service_id')
            .in('appointment_id', rawRelevantIds)
          if (svcLinks) {
            const extraSvcIds = [...new Set(svcLinks.map((l) => l.service_id))]
            const extraNames = extraSvcIds.length > 0
              ? new Map((servicesRes.data ?? []).filter((s: { id: string; name: string }) => extraSvcIds.includes(s.id)).map((s: { id: string; name: string }) => [s.id, s.name]))
              : new Map<string, string>()
            const byApt = new Map<string, string[]>()
            for (const link of svcLinks) {
              const list = byApt.get(link.appointment_id) ?? []
              list.push(extraNames.get(link.service_id) ?? serviceMap.get(link.service_id) ?? '?')
              byApt.set(link.appointment_id, list)
            }
            for (const [aid, names] of byApt) {
              multiSvcUpcoming.set(aid, names.join(', '))
            }
          }
        }

        setCounts({
          barbers: barbersCountRes.count ?? 0,
          services: servicesCountRes.count ?? 0,
          todayAppointments: rawToday.length,
          totalAppointments: appointmentsCountRes.count ?? 0,
          monthRevenue,
        })

        setBarbers((barbersListRes.data ?? []) as Barber[])

        const pendingToday = rawToday.filter((a) => a.status === 'pending').length
        const completedToday = rawToday.filter((a) => a.status === 'completed').length
        const cancelledToday = rawToday.filter((a) => a.status === 'cancelled').length
        const nextTwoHoursCount = rawUpcoming.length

        setMetrics({
          nextTwoHours: nextTwoHoursCount,
          pendingToday,
          completedToday,
          cancelledToday,
        })

        setUpcomingAppointments(
          rawUpcoming.map((a) => ({
            id: a.id,
            barber_name: barberMap.get(a.barber_id) ?? 'Desconhecido',
            client_name: clientMap.get(a.client_id) ?? 'Desconhecido',
            service_name: multiSvcUpcoming.get(a.id) ?? serviceMap.get(a.service_id) ?? 'Desconhecido',
            start_time: a.start_time,
            status: a.status,
          })),
        )

        const todayActive = rawToday.filter((a) => a.status !== 'cancelled')
        const futureToday = todayActive.filter((a) => new Date(a.start_time).getTime() >= now.getTime())
        const load = (barbersListRes.data ?? []).map((barber: { id: string; name: string }) => {
          const barberAppointments = todayActive.filter((a) => a.barber_id === barber.id)
          const nextStart = futureToday
            .filter((a) => a.barber_id === barber.id)
            .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0]?.start_time ?? null

          return {
            id: barber.id,
            name: barber.name,
            total: barberAppointments.length,
            nextStart,
          }
        }).sort((a, b) => b.total - a.total)

        setBarberLoad(load)
      } catch (err) {
        console.error(err)
      }
    }

    load()
  }, [shop?.id, shopLoading, rtTick])

  useEffect(() => {
    if (shopLoading) return
    if (!shop) {
      setSchedule([])
      return
    }

    async function loadSchedule() {
      const activeShop = shop
      if (!activeShop) {
        setSchedule([])
        return
      }

      const weekStartKey = formatDateISO(weekDays[0])
      const weekEndKey = formatDateISO(weekDays[6])

      let query = supabase
        .from('appointments')
        .select('*')
        .eq('shop_id', activeShop.id)
        .gte('start_time', startOfUTC3DayISO(weekStartKey))
        .lte('start_time', endOfUTC3DayISO(weekEndKey))
        .neq('status', 'cancelled')
        .order('start_time')

      const [aptsRes, blocksRes] = await Promise.all([
        query,
        supabase
          .from('barber_blocks')
          .select('*')
          .eq('shop_id', activeShop.id)
          .gte('end_time', startOfUTC3DayISO(weekStartKey))
          .lte('start_time', endOfUTC3DayISO(weekEndKey)),
      ])

      const raw = (aptsRes.data ?? []) as Array<{ id: string; barber_id: string; client_id: string; service_id: string; start_time: string; end_time: string; status: string }>
      const rawBlocks = (blocksRes.data ?? []) as Array<{ id: string; barber_id: string; reason: string; start_time: string; end_time: string }>

      if (raw.length === 0 && rawBlocks.length === 0) {
        setSchedule([])
        return
      }

      const barberIds = [...new Set([...raw.map((a) => a.barber_id), ...rawBlocks.map((b) => b.barber_id)])]
      const clientIds = [...new Set(raw.map((a) => a.client_id))]
      const serviceIds = [...new Set(raw.map((a) => a.service_id))]

      const [barbersR, clientsR, servicesR] = await Promise.all([
        barberIds.length ? supabase.from('barbers').select('id, name').eq('shop_id', activeShop.id).in('id', barberIds) : Promise.resolve({ data: [] }),
        clientIds.length ? supabase.from('clients').select('id, name').eq('shop_id', activeShop.id).in('id', clientIds) : Promise.resolve({ data: [] }),
        serviceIds.length ? supabase.from('services').select('id, name').eq('shop_id', activeShop.id).in('id', serviceIds) : Promise.resolve({ data: [] }),
      ])

      const bMap = new Map((barbersR.data ?? []).map((b: { id: string; name: string }) => [b.id, b.name]))
      const cMap = new Map((clientsR.data ?? []).map((c: { id: string; name: string }) => [c.id, c.name]))
      const sMap = new Map((servicesR.data ?? []).map((s: { id: string; name: string }) => [s.id, s.name]))

      // Multi-serviço: buscar appointment_services
      const aptIds = raw.map((a) => a.id)
      let multiSvcMap = new Map<string, string>()
      if (aptIds.length > 0) {
        const { data: svcLinks } = await supabase
          .from('appointment_services')
          .select('appointment_id, service_id')
          .in('appointment_id', aptIds)
        if (svcLinks) {
          const extraSvcIds = [...new Set(svcLinks.map((l) => l.service_id))]
          const extraNames = extraSvcIds.length > 0
            ? new Map((servicesR.data ?? []).filter((s: { id: string; name: string }) => extraSvcIds.includes(s.id)).map((s: { id: string; name: string }) => [s.id, s.name]))
            : new Map<string, string>()
          const byApt = new Map<string, string[]>()
          for (const link of svcLinks) {
            const list = byApt.get(link.appointment_id) ?? []
            list.push(extraNames.get(link.service_id) ?? sMap.get(link.service_id) ?? '?')
            byApt.set(link.appointment_id, list)
          }
          for (const [aid, names] of byApt) {
            multiSvcMap.set(aid, names.join(', '))
          }
        }
      }

      const scheduleItems = [
        ...raw.map((a) => ({
          id: a.id,
          barber_id: a.barber_id,
          barber_name: bMap.get(a.barber_id) ?? '?',
          client_name: cMap.get(a.client_id) ?? '?',
          service_name: multiSvcMap.get(a.id) ?? sMap.get(a.service_id) ?? '?',
          start_time: a.start_time,
          end_time: a.end_time,
          status: a.status,
        })),
        ...rawBlocks.map((blk) => ({
          id: blk.id,
          barber_id: blk.barber_id,
          barber_name: bMap.get(blk.barber_id) ?? '?',
          client_name: `🔒 ${blk.reason || 'Indisponível'}`,
          service_name: 'Bloqueio de Horário',
          start_time: blk.start_time,
          end_time: blk.end_time,
          status: 'blocked',
        })),
      ]

      setSchedule(scheduleItems)
    }

    loadSchedule()
  }, [weekStart, shop?.id, shopLoading, rtTick])

  // Realtime: atualiza o dashboard automaticamente quando um agendamento
  // desta loja muda (novo agendamento, cancelamento, conclusão etc.)
  useEffect(() => {
    if (shopLoading || !shop) return

    const channel = supabase
      .channel(`dashboard-appointments-${shop.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments', filter: `shop_id=eq.${shop.id}` },
        () => setRtTick((t) => t + 1),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [shop?.id, shopLoading])

  const filtered = !selectedBarber
    ? schedule
    : schedule.filter((a) => a.barber_id === selectedBarber)

  function getApptsForDay(day: Date) {
    const dayStr = formatDateISO(day)
    return filtered.filter((a) => formatDateISO(new Date(a.start_time)) === dayStr)
  }

  function getApptPosition(appt: ScheduleAppt) {
    const start = getUTC3TimeParts(appt.start_time)
    const end = getUTC3TimeParts(appt.end_time)
    const startMin = start.hour * 60 + start.minute
    const endMin = end.hour * 60 + end.minute
    const top = ((startMin - 480) / 720) * 100
    const height = Math.max(((endMin - startMin) / 720) * 100, 4)
    return { top: `${top}%`, height: `${height}%` }
  }

  const maxLoad = Math.max(...barberLoad.map((item) => item.total), 1)

  // Linha do tempo atual (08:00 às 20:00)
  const now = new Date()
  const currentHour = now.getHours()
  const currentMin = now.getMinutes()
  const currentTotalMin = currentHour * 60 + currentMin
  const isTimeInBusinessHours = currentTotalMin >= 480 && currentTotalMin <= 1200
  const currentTimeTopPercent = ((currentTotalMin - 480) / 720) * 100

  // Data formatada elegante
  const formattedToday = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(now)

  return (
    <PageTransition>
      <div className="relative p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Ambient Glow */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-96 w-full -translate-x-1/2 max-w-7xl bg-gradient-to-b from-amber-500/10 via-orange-500/5 to-transparent blur-3xl" />

        {/* Header com Saudações e Data */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-0.5 text-xs font-semibold text-amber-400 capitalize">
                <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
                {formattedToday}
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight font-heading bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text">
              Painel de Controle
            </h1>
            <p className="text-sm text-muted-foreground">
              Visão geral das operações, faturamento e fluxo de clientes em tempo real.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {shop && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    const url = buildPublicSiteUrl(shop.public_slug)
                    navigator.clipboard.writeText(url)
                    toast.success('Link do site copiado para a área de transferência!')
                  }}
                  className="border-amber-500/25 bg-zinc-900/90 text-zinc-200 hover:bg-amber-500/10 hover:text-amber-300 hover:border-amber-500/50 transition-all duration-200 rounded-xl font-medium"
                  title="Copiar link de agendamento público para enviar no WhatsApp ou Instagram"
                >
                  <Copy className="mr-2 size-4 text-amber-400" /> Copiar Link
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open(buildPublicSiteUrl(shop.public_slug), '_blank')}
                  className="border-amber-500/25 bg-zinc-900/90 text-zinc-200 hover:bg-amber-500/10 hover:text-amber-300 hover:border-amber-500/50 transition-all duration-200 rounded-xl font-medium"
                  title="Abrir página pública de agendamento em nova aba"
                >
                  <Globe className="mr-2 size-4 text-amber-400" /> Ver Site
                </Button>
              </>
            )}
            <Button
              onClick={() => window.location.href = '/appointments'}
              className="bg-gradient-to-r from-amber-500 via-amber-500 to-orange-500 text-zinc-950 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/35 hover:from-amber-400 hover:to-orange-400 transition-all duration-300 font-bold rounded-xl"
            >
              <Calendar className="mr-2 size-4" /> Ver Todos Agendamentos
            </Button>
          </div>
        </div>

        {/* ── Cards de Estatísticas Principais (Linear / Stripe Style) ── */}
        {!counts ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => <StatsCardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-3 lg:grid-cols-5">
            {cards.map((card, i) => {
              const Icon = card.icon
              const keyMap = ['barbers', 'services', 'todayAppointments', 'totalAppointments', 'monthRevenue'] as const
              const rawValue = counts[keyMap[i]]
              const isCurrency = card.label === 'Faturamento do Mês'
              const value = isCurrency ? currency.format(rawValue) : String(rawValue)
              return (
                <div
                  key={card.label}
                  className={`group animate-fade-in-up relative overflow-hidden rounded-2xl border bg-card/60 backdrop-blur-xl p-5 shadow-lg ${card.shadow} ${card.border} transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:border-amber-500/40`}
                  style={{ animationDelay: `${card.delay}ms` }}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${card.from} ${card.to} opacity-[0.03] transition-opacity duration-300 group-hover:opacity-[0.08]`} />
                  
                  {/* Subtle Background Curve (Sparkline SVG) */}
                  <svg className="absolute -bottom-2 -right-4 h-16 w-32 opacity-15 transition-opacity group-hover:opacity-30" viewBox="0 0 100 40" fill="none">
                    <path d="M0 35 Q 25 15, 50 25 T 100 5 L 100 40 L 0 40 Z" fill="currentColor" className="text-amber-500" />
                  </svg>

                  <div className="relative">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{card.label}</span>
                      <div className={`flex size-10 items-center justify-center rounded-xl bg-gradient-to-br ${card.from} ${card.to} text-zinc-950 shadow-md transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-lg`}>
                        <Icon className="size-5" />
                      </div>
                    </div>
                    <p className={isCurrency ? "text-2xl sm:text-3xl font-extrabold tracking-tight font-heading" : "text-3xl sm:text-4xl font-extrabold tracking-tight font-heading"}>
                      {isCurrency ? (
                        <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-green-400 bg-clip-text text-transparent">{value}</span>
                      ) : (
                        <AnimatedCounter value={rawValue} duration={1400} />
                      )}
                    </p>
                    <div className={`mt-3 h-1 w-8 rounded-full bg-gradient-to-r ${card.from} ${card.to} transition-all duration-500 group-hover:w-full`} />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Métricas de Atenção Imediata & Próximos Atendimentos ── */}
        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                label: 'Próximas 2h',
                value: metrics.nextTwoHours,
                description: 'Atendimentos chegando agora',
                icon: Clock,
                from: 'from-amber-500',
                to: 'to-yellow-600',
                border: 'border-amber-500/20',
                badgeBg: 'bg-amber-500/10 text-amber-300',
              },
              {
                label: 'Pendentes hoje',
                value: metrics.pendingToday,
                description: 'Precisam de confirmação',
                icon: AlertCircle,
                from: 'from-orange-500',
                to: 'to-amber-600',
                border: 'border-orange-500/20',
                badgeBg: 'bg-orange-500/10 text-orange-300',
              },
              {
                label: 'Concluídos hoje',
                value: metrics.completedToday,
                description: 'Finalizados até agora',
                icon: CheckCircle2,
                from: 'from-emerald-500',
                to: 'to-green-600',
                border: 'border-emerald-500/20',
                badgeBg: 'bg-emerald-500/10 text-emerald-300',
              },
              {
                label: 'Cancelados hoje',
                value: metrics.cancelledToday,
                description: 'Ocorrências a observar',
                icon: XCircle,
                from: 'from-rose-500',
                to: 'to-red-600',
                border: 'border-rose-500/20',
                badgeBg: 'bg-rose-500/10 text-rose-300',
              },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.label}
                  className={`relative overflow-hidden rounded-2xl border bg-card/60 backdrop-blur-xl p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${item.border}`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${item.from} ${item.to} opacity-[0.03]`} />
                  <div className="relative">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{item.label}</span>
                      <div className={`flex size-9 items-center justify-center rounded-xl bg-gradient-to-br ${item.from} ${item.to} text-zinc-950 shadow-md`}>
                        <Icon className="size-4.5" />
                      </div>
                    </div>
                    <p className="text-3xl font-extrabold tracking-tight font-heading">
                      <AnimatedCounter value={item.value} duration={1200} />
                    </p>
                    <p className="mt-1.5 text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="rounded-2xl border border-amber-500/15 bg-card/60 backdrop-blur-xl p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-zinc-950 shadow-md">
                  <Clock className="size-4 font-bold" />
                </div>
                <div>
                  <h2 className="text-base font-bold">Próximos atendimentos</h2>
                  <p className="text-xs text-muted-foreground">Janela de foco operacional</p>
                </div>
              </div>
              <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400">
                {metrics.nextTwoHours} agora
              </span>
            </div>

            {upcomingAppointments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-amber-500/15 bg-amber-500/5 p-4 text-sm text-muted-foreground">
                Nenhum atendimento nas próximas 2 horas.
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingAppointments.map((appt) => (
                  <div
                    key={appt.id}
                    className="rounded-xl border border-amber-500/10 bg-background/80 p-3 transition-colors hover:border-amber-500/30 hover:bg-amber-500/5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground">{appt.client_name}</p>
                          <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${statusColors[appt.status] ?? 'bg-muted text-muted-foreground'}`}>
                            {statusLabels[appt.status] ?? appt.status}
                          </span>
                        </div>
                        <p className="truncate text-sm text-muted-foreground">
                          {appt.barber_name} · {appt.service_name}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDateTime(appt.start_time)}
                        </p>
                      </div>
                      <div className="shrink-0 rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-sm font-bold text-amber-400">
                        {formatTime(appt.start_time)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-amber-500/15 bg-card/60 backdrop-blur-xl p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-zinc-950 shadow-md">
              <Users className="size-4 font-bold" />
            </div>
            <div>
              <h2 className="text-base font-bold">Carga por barbeiro</h2>
              <p className="text-xs text-muted-foreground">Volume de hoje e próximo horário livre</p>
            </div>
          </div>

          {barberLoad.length === 0 ? (
            <div className="rounded-xl border border-dashed border-amber-500/15 bg-amber-500/5 p-4 text-sm text-muted-foreground">
              Nenhum dado de carga disponível.
            </div>
          ) : (
            <div className="space-y-4">
              {barberLoad.map((item) => {
                const progress = Math.max((item.total / maxLoad) * 100, 6)
                return (
                  <div key={item.id} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.nextStart ? `Próximo às ${formatTime(item.nextStart)}` : 'Sem atendimentos nas próximas 2h'}
                        </p>
                      </div>
                      <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400">
                        {item.total} hoje
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-amber-500/10">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="mb-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-zinc-950 shadow-md">
                <Calendar className="size-4 font-bold" />
              </div>
              <h2 className="text-lg font-bold">Agenda Semanal</h2>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedBarber} onValueChange={(v) => setSelectedBarber(v ?? '')}>
                <SelectTrigger className="w-36 border-amber-500/20 sm:w-44">
                {selectedBarber ? (
                  <span className="truncate">{barbers.find((b) => b.id === selectedBarber)?.name ?? selectedBarber}</span>
                ) : (
                  <SelectValue placeholder="Todos os barbeiros" />
                )}
              </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os barbeiros</SelectItem>
                  {barbers.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" onClick={() => setWeekStart((current) => addUTC3Days(current, -7))} className="text-muted-foreground hover:text-amber-400">
                <ChevronLeft className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setWeekStart((current) => addUTC3Days(current, 7))} className="text-muted-foreground hover:text-amber-400">
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-amber-500/15 bg-card/60 backdrop-blur-xl shadow-lg">
            <div className="flex" style={{ minWidth: '700px' }}>
              <div className="w-14 shrink-0 border-r border-amber-500/10 bg-amber-500/[0.02]">
                <div className="h-11 border-b border-amber-500/10" />
                {HOURS.map((h) => (
                  <div key={h} className="flex h-[60px] items-end justify-center pb-1 text-[11px] font-semibold text-muted-foreground">
                    {formatHour(h)}
                  </div>
                ))}
              </div>
              {weekDays.map((day) => {
                const dayStr = formatDateISO(day)
                const todayStr = formatDateISO(new Date())
                const isToday = dayStr === todayStr
                const appts = getApptsForDay(day)
                return (
                  <div key={dayStr} className={`relative min-w-0 flex-1 border-r border-amber-500/10 last:border-r-0 ${isToday ? 'bg-amber-500/[0.04]' : ''}`}>
                    <div className={`border-b border-amber-500/10 p-2.5 text-center text-xs font-semibold ${isToday ? 'bg-amber-500/10 text-amber-400 font-bold' : 'text-muted-foreground'}`}>
                      <span className="hidden sm:inline">{formatDateBR(day)}</span>
                      <span className="sm:hidden">
                        {WEEKDAY_LABELS[day.getDay()]}
                      </span>
                      {isToday && (
                        <span className="ml-1.5 inline-block size-1.5 rounded-full bg-amber-500 animate-pulse" />
                      )}
                    </div>
                    <div className="relative" style={{ height: `${HOURS.length * 60}px` }}>
                      {HOURS.map((h) => (
                        <div key={h} className="absolute left-0 right-0 border-t border-amber-500/5" style={{ top: `${((h - 8) / 12) * 100}%` }} />
                      ))}

                      {/* 🔴 Linha do Tempo em Tempo Real (Hoje) */}
                      {isToday && isTimeInBusinessHours && (
                        <div
                          className="pointer-events-none absolute left-0 right-0 z-20 flex items-center"
                          style={{ top: `${currentTimeTopPercent}%` }}
                        >
                          <span className="size-2 rounded-full bg-amber-400 ring-4 ring-amber-400/30 animate-pulse -ml-1" />
                          <div className="h-[2px] w-full bg-amber-400 shadow-sm shadow-amber-400/50" />
                        </div>
                      )}

                      {appts.map((appt) => {
                        const pos = getApptPosition(appt)
                        return (
                          <div
                            key={appt.id}
                            className={`absolute left-1 right-1 overflow-hidden rounded-xl border-l-[3px] p-1.5 text-xs shadow-sm transition-all duration-200 hover:z-30 hover:scale-[1.02] hover:shadow-md ${statusColors[appt.status] ?? 'border-l-zinc-500 bg-zinc-800/40 text-zinc-300'}`}
                            style={{ top: pos.top, height: pos.height }}
                          >
                            <p className="truncate font-bold leading-tight text-foreground">{appt.client_name}</p>
                            <p className="truncate text-[11px] leading-tight text-muted-foreground mt-0.5">{appt.service_name}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}

export default Dashboard
