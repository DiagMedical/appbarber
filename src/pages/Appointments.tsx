import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Pagination } from '@/components/Pagination'
import { ListSkeleton } from '@/components/Skeleton'
import PageTransition from '@/components/PageTransition'
import { usePagination } from '@/hooks/usePagination'
import { Check, CheckCircle2, XCircle, Calendar, Plus, Trash2, Phone, User, Scissors, CalendarDays, ArrowRight, DollarSign, CreditCard, Banknote, QrCode, Wallet, Package, Minus } from 'lucide-react'
import { toast } from 'sonner'
import { sendText } from '@/lib/evolution'
import { endOfUTC3DayISO, formatDateTime, formatTime, getUTC3DateKey, startOfUTC3DayISO } from '@/lib/timezone'
import { getAvailableSlots } from '@/lib/availability'
import { useAuth } from '@/providers/AuthProvider'
import type { Appointment, Barber, Service, PaymentMethod, Product } from '@/types/database'

type AppointmentItem = Appointment & {
  barberName: string
  serviceName: string
  clientName: string
  clientPhone: string
}

const statusLabels: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
  completed: 'Concluído',
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  confirmed: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  cancelled: 'bg-red-500/10 text-red-600 dark:text-red-400',
  completed: 'bg-green-500/10 text-green-600 dark:text-green-400',
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, { label: string; icon: typeof QrCode }> = {
  pix: { label: 'Pix', icon: QrCode },
  credit_card: { label: 'Cartão de Crédito', icon: CreditCard },
  debit_card: { label: 'Cartão de Débito', icon: CreditCard },
  cash: { label: 'Dinheiro', icon: Banknote },
  other: { label: 'Outro', icon: Wallet },
}

function Appointments() {
  const { shop, loading: shopLoading } = useAuth()
  const [appointments, setAppointments] = useState<AppointmentItem[]>([])
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('todos')
  const [open, setOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentItem | null>(null)
  const [saving, setSaving] = useState(false)

  // Modal de Conclusão e Pagamento
  const [completeOpen, setCompleteOpen] = useState(false)
  const [completingApt, setCompletingApt] = useState<AppointmentItem | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix')
  const [paidAmount, setPaidAmount] = useState<number>(0)
  const [barberCommissionRate, setBarberCommissionRate] = useState<number>(50)
  const [completing, setCompleting] = useState(false)
  const [availableProducts, setAvailableProducts] = useState<Product[]>([])
  const [checkoutProducts, setCheckoutProducts] = useState<Array<{ product: Product; quantity: number }>>([])

  const [barberId, setBarberId] = useState('')
  const [serviceIds, setServiceIds] = useState<string[]>([])
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  const selectedServices = useMemo(() => services.filter((s) => serviceIds.includes(s.id)), [services, serviceIds])
  const totalDuration = useMemo(() => selectedServices.reduce((acc, s) => acc + s.duration_minutes, 0), [selectedServices])
  const totalPrice = useMemo(() => selectedServices.reduce((acc, s) => acc + Number(s.price), 0), [selectedServices])
  const totalBuffer = useMemo(() => selectedServices.length > 0 ? Math.max(...selectedServices.map((s) => s.buffer_minutes ?? 0)) : 0, [selectedServices])

  const { page, setPage, totalPages, pageItems: pageAppointments } = usePagination(appointments, 20)

  function toggleServiceSelection(id: string) {
    setServiceIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  useEffect(() => {
    load()
  }, [filter, shop?.id, shopLoading])

  useEffect(() => {
    if (shopLoading || !shop) return

    if (barberId && serviceIds.length > 0 && date) {
      setTime('')
      setLoadingSlots(true)
      const dur = totalDuration + totalBuffer
      getAvailableSlots(barberId, date, dur)
        .then((slots) => {
          setAvailableSlots(slots)
          setLoadingSlots(false)
        })
        .catch(() => {
          setAvailableSlots([])
          setLoadingSlots(false)
        })
    } else {
      setAvailableSlots([])
    }
  }, [barberId, serviceIds.join(','), date, totalDuration, totalBuffer, shop?.id, shopLoading])

  async function load() {
    try {
      if (shopLoading) return
      if (!shop) {
        setAppointments([])
        setBarbers([])
        setServices([])
        setLoading(false)
        return
      }
      setLoading(true)

      let query = supabase.from('appointments').select('*').eq('shop_id', shop.id).order('start_time', { ascending: true })

      if (filter === 'hoje') {
        const today = getUTC3DateKey()
        query = query.gte('start_time', startOfUTC3DayISO(today)).lte('start_time', endOfUTC3DayISO(today))
      }

      const [apptRes, barbersRes, servicesRes] = await Promise.all([
        query,
        supabase.from('barbers').select('*').eq('shop_id', shop.id).order('name'),
        supabase.from('services').select('*').eq('shop_id', shop.id).order('name'),
      ])

      if (apptRes.error) throw apptRes.error
      if (barbersRes.error) throw barbersRes.error
      if (servicesRes.error) throw servicesRes.error

      const barberMap = new Map((barbersRes.data as Barber[]).map((b) => [b.id, b.name]))
      const serviceMap = new Map((servicesRes.data as Service[]).map((s) => [s.id, s.name]))

      const rawAppointments = apptRes.data as Appointment[]
      const clientIds = [...new Set(rawAppointments.map((a) => a.client_id))]
      let clientMap = new Map<string, { id: string; name: string; phone: string }>()
      if (clientIds.length > 0) {
        const { data: clients } = await supabase.from('clients').select('id, name, phone').eq('shop_id', shop.id).in('id', clientIds)
        clientMap = new Map((clients ?? []).map((c) => [c.id, c]))
      }

      const aptIds = rawAppointments.map((a) => a.id)
      let multiSvcMap = new Map<string, string>()
      if (aptIds.length > 0) {
        const { data: svcLinks } = await supabase
          .from('appointment_services')
          .select('appointment_id, service_id')
          .in('appointment_id', aptIds)
        if (svcLinks) {
          const extraSvcIds = [...new Set(svcLinks.map((l) => l.service_id))]
          const extraNames = extraSvcIds.length > 0
            ? new Map((servicesRes.data as Service[]).filter((s) => extraSvcIds.includes(s.id)).map((s) => [s.id, s.name]))
            : new Map<string, string>()
          const byApt = new Map<string, string[]>()
          for (const link of svcLinks) {
            const list = byApt.get(link.appointment_id) ?? []
            list.push(extraNames.get(link.service_id) ?? serviceMap.get(link.service_id) ?? '?')
            byApt.set(link.appointment_id, list)
          }
          for (const [aid, names] of byApt) {
            multiSvcMap.set(aid, names.join(', '))
          }
        }
      }

      setAppointments(
        rawAppointments.map((a) => {
          const client = clientMap.get(a.client_id)
          return {
            ...a,
            barberName: barberMap.get(a.barber_id) ?? 'Desconhecido',
            serviceName: multiSvcMap.get(a.id) ?? serviceMap.get(a.service_id) ?? 'Desconhecido',
            clientName: client?.name ?? 'Desconhecido',
            clientPhone: client?.phone ?? '',
          }
        }),
      )

      setBarbers(barbersRes.data as Barber[])
      setServices(servicesRes.data as Service[])
    } catch (err) {
      toast.error('Erro ao carregar agendamentos')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setBarberId('')
    setServiceIds([])
    setClientName('')
    setClientPhone('')
    setDate('')
    setTime('')
    setAvailableSlots([])
  }

  function closeDetails() {
    setDetailOpen(false)
    setSelectedAppointment(null)
  }

  function openDetails(apt: AppointmentItem) {
    setSelectedAppointment(apt)
    setDetailOpen(true)
  }

  function durationMinutes(apt: Appointment) {
    return Math.max((new Date(apt.end_time).getTime() - new Date(apt.start_time).getTime()) / 60000, 0)
  }

  async function createAppointment() {
    if (!barberId || serviceIds.length === 0 || !clientName || !clientPhone || !date || !time) {
      toast.error('Preencha todos os campos')
      return
    }
    if (!shop) {
      toast.error('Barbearia ainda não carregada')
      return
    }
    setSaving(true)

    try {
      let clientId = ''
      const { data: existing } = await supabase.from('clients').select('id').eq('shop_id', shop.id).eq('phone', clientPhone).maybeSingle()
      if (existing) {
        clientId = existing.id as string
      } else {
        const { data: newClient } = await supabase.from('clients').insert({ shop_id: shop.id, name: clientName, phone: clientPhone }).select('id').single()
        if (!newClient) throw new Error('Erro ao criar cliente')
        clientId = newClient.id as string
      }

      const stillAvailable = await getAvailableSlots(barberId, date, totalDuration + totalBuffer)
      if (!stillAvailable.includes(time)) {
        toast.error('Este horário não está mais disponível. Escolha outro.')
        setSaving(false)
        return
      }

      const startTime = new Date(`${date}T${time}:00-03:00`)
      const endTime = new Date(startTime.getTime() + totalDuration * 60000)

      const { data: newApt, error: aptErr } = await supabase.from('appointments').insert({
        shop_id: shop.id,
        barber_id: barberId,
        service_id: serviceIds[0],
        client_id: clientId,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: 'confirmed',
        price_at_booking: totalPrice,
      }).select('id').single()
      if (aptErr) throw aptErr
      if (!newApt) throw new Error('Erro ao criar agendamento')

      if (serviceIds.length > 1) {
        const svcRows = serviceIds.slice(1).map((sid) => ({ appointment_id: newApt.id, service_id: sid }))
        const { error: svcErr } = await supabase.from('appointment_services').insert(svcRows)
        if (svcErr) console.error('Erro ao salvar serviços adicionais:', svcErr)
      }

      const barber = barbers.find((b) => b.id === barberId)
      const svcNames = selectedServices.map((s) => s.name).join(' + ')
      const msg = `🪒 *AppBarber*\n\nOlá ${clientName}, seu agendamento foi confirmado!\n\n📅 ${date} às ${time}\n💈 ${svcNames}\n✂️ ${barber?.name}`
      const sent = await sendText({ number: clientPhone, text: msg, shopId: shop.id })
      if (sent) toast.success('Agendamento criado e WhatsApp enviado!')
      else toast.success('Agendamento criado!')

      resetForm()
      setOpen(false)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar agendamento')
    } finally {
      setSaving(false)
    }
  }

  async function openCompleteDialog(apt: AppointmentItem) {
    const barber = barbers.find((b) => b.id === apt.barber_id)
    const rate = barber?.commission_rate ?? 50
    const price = apt.price_at_booking ?? services.find((s) => s.id === apt.service_id)?.price ?? 0

    setCompletingApt(apt)
    setPaidAmount(price)
    setBarberCommissionRate(rate)
    setPaymentMethod('pix')
    setCheckoutProducts([])

    if (shop) {
      const { data: prods } = await supabase
        .from('products')
        .select('*')
        .eq('shop_id', shop.id)
        .eq('active', true)
        .order('name')
      setAvailableProducts((prods as Product[]) ?? [])
    }

    setCompleteOpen(true)
  }

  function addProductToCheckout(product: Product) {
    setCheckoutProducts((prev) => {
      const exists = prev.find((p) => p.product.id === product.id)
      let next: Array<{ product: Product; quantity: number }>
      if (exists) {
        next = prev.map((p) => p.product.id === product.id ? { ...p, quantity: p.quantity + 1 } : p)
      } else {
        next = [...prev, { product, quantity: 1 }]
      }
      recalculateTotal(next)
      return next
    })
  }

  function removeProductFromCheckout(productId: string) {
    setCheckoutProducts((prev) => {
      const exists = prev.find((p) => p.product.id === productId)
      let next: Array<{ product: Product; quantity: number }>
      if (exists && exists.quantity > 1) {
        next = prev.map((p) => p.product.id === productId ? { ...p, quantity: p.quantity - 1 } : p)
      } else {
        next = prev.filter((p) => p.product.id !== productId)
      }
      recalculateTotal(next)
      return next
    })
  }

  function recalculateTotal(prods: Array<{ product: Product; quantity: number }>) {
    if (!completingApt) return
    const servicePrice = completingApt.price_at_booking ?? services.find((s) => s.id === completingApt.service_id)?.price ?? 0
    const productsTotal = prods.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
    setPaidAmount(servicePrice + productsTotal)
  }

  async function confirmCompleteAppointment() {
    if (!shop || !completingApt) return
    setCompleting(true)
    try {
      const commissionAmount = Number(((paidAmount * barberCommissionRate) / 100).toFixed(2))

      const { error } = await supabase.from('appointments').update({
        status: 'completed',
        price_at_booking: paidAmount,
        payment_method: paymentMethod,
        commission_amount: commissionAmount,
        paid_at: new Date().toISOString(),
      }).eq('id', completingApt.id)

      if (error) throw error

      // Salva itens de produtos no banco se houver
      if (checkoutProducts.length > 0) {
        const prodRows = checkoutProducts.map((cp) => ({
          appointment_id: completingApt.id,
          product_id: cp.product.id,
          quantity: cp.quantity,
          unit_price: cp.product.price,
        }))
        await supabase.from('appointment_products').insert(prodRows)

        // Atualiza estoque
        for (const cp of checkoutProducts) {
          if (cp.product.stock_quantity !== null && cp.product.stock_quantity > 0) {
            await supabase
              .from('products')
              .update({ stock_quantity: Math.max(0, cp.product.stock_quantity - cp.quantity) })
              .eq('id', cp.product.id)
          }
        }
      }

      toast.success('Atendimento concluído e registrado com sucesso!')

      if (completingApt.clientPhone) {
        let msg = `✅ *${shop.name || 'AppBarber'} — Atendimento Concluído*\n\nOlá *${completingApt.clientName}*, seu atendimento com *${completingApt.barberName}* foi concluído com sucesso!`

        if (shop.google_review_url) {
          msg += `\n\n⭐ *Poderia nos avaliar com 5 estrelas no Google?*\nLeva menos de 1 minuto e nos ajuda muito:\n${shop.google_review_url}`
        }

        msg += `\n\nMuito obrigado pela preferência e até a próxima!`
        const sent = await sendText({ number: completingApt.clientPhone, text: msg, shopId: shop.id })
        if (!sent) console.log('WhatsApp não enviado')
      }

      setCompleteOpen(false)
      setCompletingApt(null)
      closeDetails()
      load()
    } catch (err) {
      toast.error('Erro ao concluir atendimento')
      console.error(err)
    } finally {
      setCompleting(false)
    }
  }

  async function handleStatusChange(apt: AppointmentItem, status: 'pending' | 'confirmed' | 'cancelled' | 'completed') {
    if (status === 'completed') {
      openCompleteDialog(apt)
      return
    }
    if (!shop) return
    await supabase.from('appointments').update({ status }).eq('id', apt.id)
    toast.success(`Agendamento ${statusLabels[status]?.toLowerCase()}`)

    if (apt.clientPhone) {
      const msg = status === 'cancelled'
        ? `❌ *AppBarber*\n\nSeu agendamento foi cancelado. Entre em contato para reagendar.`
        : `🪒 *AppBarber*\n\nSeu agendamento foi confirmado!`

      const sent = await sendText({ number: apt.clientPhone, text: msg, shopId: shop.id })
      if (!sent) toast.warning('WhatsApp não configurado ou instância offline')
    }

    closeDetails()
    load()
  }

  async function remove(id: string) {
    await supabase.from('appointments').delete().eq('id', id)
    toast.success('Agendamento excluído')
    closeDetails()
    load()
  }

  return (
    <PageTransition>
      <div className="p-4 sm:p-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20">
              <Calendar className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Agendamentos</h1>
              <p className="text-sm text-muted-foreground">Lista operacional com acesso aos detalhes</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={(v) => v && setFilter(v)}>
              <SelectTrigger className="w-28 border-indigo-500/20 sm:w-32 focus:ring-indigo-500">
                <SelectValue placeholder="Todos">
                  {(value) => ({ hoje: 'Hoje', todos: 'Todos' })[value as string] ?? 'Todos'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hoje">Hoje</SelectItem>
                <SelectItem value="todos">Todos</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm() }}>
              <DialogTrigger>
                <Button className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md hover:from-indigo-500 hover:to-blue-500">
                  <Plus className="mr-2 size-4" /> Novo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Novo Agendamento</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Barbeiro</label>
                    <Select value={barberId} onValueChange={(v) => v && setBarberId(v)}>
                      <SelectTrigger className="border-indigo-500/20 focus:ring-indigo-500">
                        <SelectValue placeholder="Selecione o barbeiro">
                          {(value) => barbers.find((b) => b.id === value)?.name ?? 'Selecione o barbeiro'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {barbers.map((b) => (
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Serviços (selecione um ou mais)</label>
                    <div className="grid gap-2 sm:grid-cols-2 max-h-[260px] overflow-y-auto rounded-xl border border-indigo-500/10 p-2">
                      {services.map((s) => {
                        const isSel = serviceIds.includes(s.id)
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => toggleServiceSelection(s.id)}
                            className={`group flex flex-col items-start gap-1 rounded-xl border p-3 text-left text-sm transition-all ${
                              isSel
                                ? 'border-indigo-500 bg-indigo-500/10 shadow-sm'
                                : 'border-indigo-500/10 hover:border-indigo-500/30 hover:bg-indigo-500/5'
                            }`}
                          >
                            <div className="flex w-full items-center justify-between gap-2">
                              <span className="font-medium">{s.name}</span>
                              <span className="shrink-0 text-xs font-semibold text-indigo-400">R$ {Number(s.price).toFixed(2)}</span>
                            </div>
                            <div className="flex w-full items-center justify-between">
                              <span className="text-xs text-muted-foreground">{s.duration_minutes} min</span>
                              {isSel && <Check className="size-4 text-indigo-400" />}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                    {selectedServices.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {selectedServices.map((s) => s.name).join(' + ')} — {totalDuration} min · R$ {Number(totalPrice).toFixed(2)}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Cliente</label>
                    <Input placeholder="Nome" value={clientName} onChange={(e) => setClientName(e.target.value)} className="border-indigo-500/20 focus:ring-indigo-500" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">WhatsApp</label>
                    <Input placeholder="(11) 99999-8888" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} className="border-indigo-500/20 focus:ring-indigo-500" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Data</label>
                    <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border-indigo-500/20 focus:ring-indigo-500" />
                  </div>
                  {barberId && serviceIds.length > 0 && date && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Horário</label>
                      {loadingSlots ? (
                        <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                          <div className="size-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                          Verificando horários...
                        </div>
                      ) : availableSlots.length === 0 ? (
                        <p className="text-sm text-destructive">Nenhum horário disponível nesta data.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {availableSlots.map((slot) => (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => setTime(slot)}
                              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all duration-200 ${
                                time === slot
                                  ? 'border-indigo-500 bg-indigo-600 text-white shadow-md'
                                  : 'border-indigo-500/20 text-foreground hover:border-indigo-500/50 hover:bg-indigo-500/10'
                              }`}
                            >
                              {slot}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <Button onClick={createAppointment} className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md hover:from-indigo-500 hover:to-blue-500" disabled={saving || !time}>
                    {saving ? 'Criando...' : 'Criar Agendamento'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {loading ? (
          <ListSkeleton count={3} />
        ) : appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted">
              <Calendar className="size-8 text-indigo-400" />
            </div>
            <p className="mb-1 font-medium">Nenhum agendamento</p>
            <p className="text-sm">{filter === 'hoje' ? 'Nenhum agendamento para hoje' : 'Nenhum agendamento encontrado'}</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {pageAppointments.map((apt, i) => (
                <Card
                  key={apt.id}
                  onClick={() => openDetails(apt)}
                  className="animate-slide-left cursor-pointer border-indigo-500/10 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <CardContent className="flex items-center justify-between gap-4 p-4">
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 flex size-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${
                        apt.status === 'completed' ? 'from-green-500 to-emerald-600' :
                        apt.status === 'cancelled' ? 'from-red-500 to-rose-600' :
                        apt.status === 'confirmed' ? 'from-indigo-500 to-blue-600' :
                        'from-amber-500 to-orange-600'
                      } text-white shadow-md`}>
                        <Calendar className="size-4" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{apt.clientName}</p>
                          <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${statusColors[apt.status]}`}>
                            {statusLabels[apt.status] ?? apt.status}
                          </span>
                          {apt.status === 'completed' && apt.payment_method && (
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                              <DollarSign className="size-3" />
                              {PAYMENT_METHOD_LABELS[apt.payment_method]?.label ?? apt.payment_method}
                              {apt.price_at_booking ? ` · R$ ${Number(apt.price_at_booking).toFixed(2)}` : ''}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {apt.barberName} · {apt.serviceName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDateTime(apt.start_time)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="hidden rounded-full bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 sm:inline-flex">
                        Abrir detalhes <ArrowRight className="ml-1 size-3.5" />
                      </span>
                      {apt.status === 'confirmed' && (
                        <>
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openCompleteDialog(apt) }} title="Concluir e Registrar Pagamento" className="text-muted-foreground hover:text-green-500">
                          <CheckCircle2 className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleStatusChange(apt, 'cancelled') }} title="Cancelar" className="text-muted-foreground hover:text-destructive">
                          <XCircle className="size-4" />
                        </Button>
                      </>
                    )}
                    {apt.status === 'pending' && (
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleStatusChange(apt, 'confirmed') }} title="Confirmar" className="text-muted-foreground hover:text-indigo-500">
                        <CheckCircle2 className="size-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); if (confirm('Excluir este agendamento?')) remove(apt.id) }} title="Excluir" className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-4">
            <Pagination page={page} totalPages={totalPages} totalItems={appointments.length} onPageChange={setPage} />
          </div>
          </>
        )}
      </div>

      {/* ── Dialog de Detalhes ── */}
      <Dialog open={detailOpen} onOpenChange={(v) => (v ? setDetailOpen(true) : closeDetails())}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhe do agendamento</DialogTitle>
          </DialogHeader>

          {selectedAppointment && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-indigo-500/10 bg-indigo-500/5 p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <p className="text-lg font-bold">{selectedAppointment.clientName}</p>
                  <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${statusColors[selectedAppointment.status]}`}>
                    {statusLabels[selectedAppointment.status] ?? selectedAppointment.status}
                  </span>
                  {selectedAppointment.status === 'completed' && selectedAppointment.payment_method && (
                    <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      Pago via {PAYMENT_METHOD_LABELS[selectedAppointment.payment_method]?.label}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{selectedAppointment.barberName} · {selectedAppointment.serviceName}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-indigo-500/10 bg-card p-4">
                  <p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                    <User className="size-3.5" /> Cliente
                  </p>
                  <p className="font-medium">{selectedAppointment.clientName}</p>
                  <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="size-4" /> {selectedAppointment.clientPhone || 'Sem telefone'}
                  </p>
                </div>
                <div className="rounded-xl border border-indigo-500/10 bg-card p-4">
                  <p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                    <Scissors className="size-3.5" /> Serviço(s)
                  </p>
                  <p className="font-medium">{selectedAppointment.barberName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{selectedAppointment.serviceName}</p>
                </div>
                <div className="rounded-xl border border-indigo-500/10 bg-card p-4">
                  <p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                    <CalendarDays className="size-3.5" /> Data e horário
                  </p>
                  <p className="font-medium">{formatDateTime(selectedAppointment.start_time)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatTime(selectedAppointment.start_time)} · {durationMinutes(selectedAppointment)} min
                  </p>
                </div>
                <div className="rounded-xl border border-indigo-500/10 bg-card p-4">
                  <p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                    <DollarSign className="size-3.5" /> Financeiro
                  </p>
                  <p className="font-medium">
                    {selectedAppointment.price_at_booking ? `R$ ${Number(selectedAppointment.price_at_booking).toFixed(2)}` : 'A calcular'}
                  </p>
                  {selectedAppointment.commission_amount ? (
                    <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                      Comissão barbeiro: R$ {Number(selectedAppointment.commission_amount).toFixed(2)}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">Identificação: {selectedAppointment.id.slice(0, 8).toUpperCase()}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedAppointment.status === 'pending' && (
                  <Button onClick={() => handleStatusChange(selectedAppointment, 'confirmed')} className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md hover:from-indigo-500 hover:to-blue-500">
                    <CheckCircle2 className="mr-2 size-4" /> Confirmar
                  </Button>
                )}
                {selectedAppointment.status === 'confirmed' && (
                  <>
                    <Button onClick={() => openCompleteDialog(selectedAppointment)} className="bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md hover:from-green-500 hover:to-emerald-500">
                      <CheckCircle2 className="mr-2 size-4" /> Concluir e Cobrar
                    </Button>
                    <Button variant="secondary" onClick={() => handleStatusChange(selectedAppointment, 'cancelled')}>
                      <XCircle className="mr-2 size-4" /> Cancelar
                    </Button>
                  </>
                )}
                <Button variant="outline" onClick={() => { if (confirm('Excluir este agendamento?')) remove(selectedAppointment.id) }}>
                  <Trash2 className="mr-2 size-4" /> Excluir
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Modal de Conclusão & Pagamento ── */}
      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <span className="flex size-8 items-center justify-center rounded-lg bg-green-500/10 text-green-600">
                <CheckCircle2 className="size-5" />
              </span>
              Concluir Atendimento
            </DialogTitle>
          </DialogHeader>

          {completingApt && (
            <div className="space-y-4 pt-2">
              <div className="rounded-xl border border-indigo-500/10 bg-indigo-500/5 p-3">
                <p className="text-xs text-muted-foreground">Cliente & Barbeiro</p>
                <p className="font-semibold text-foreground">{completingApt.clientName} · <span className="font-normal text-muted-foreground">{completingApt.serviceName}</span></p>
                <p className="text-xs text-muted-foreground mt-0.5">Profissional: <strong className="text-foreground">{completingApt.barberName}</strong></p>
              </div>

              {/* Seção de Venda de Produtos */}
              <div className="rounded-xl border border-indigo-500/15 bg-card/60 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
                    <Package className="size-3.5 text-indigo-500" />
                    Produtos Balcão (Opcional)
                  </label>
                  {checkoutProducts.length > 0 && (
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      + R$ {checkoutProducts.reduce((sum, item) => sum + item.product.price * item.quantity, 0).toFixed(2)}
                    </span>
                  )}
                </div>

                {/* Seleção rápida de produtos */}
                {availableProducts.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">Nenhum produto cadastrado no menu Produtos.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {availableProducts.map((prod) => {
                      const inCart = checkoutProducts.find((p) => p.product.id === prod.id)
                      return (
                        <button
                          key={prod.id}
                          type="button"
                          onClick={() => addProductToCheckout(prod)}
                          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-all ${
                            inCart
                              ? 'border-indigo-500 bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-semibold'
                              : 'border-indigo-500/15 bg-background text-foreground hover:bg-indigo-500/5'
                          }`}
                        >
                          <span>{prod.name}</span>
                          <span className="text-[10px] text-muted-foreground">R$ {Number(prod.price).toFixed(2)}</span>
                          {inCart && (
                            <span className="rounded-full bg-indigo-600 text-white text-[10px] size-4 flex items-center justify-center font-bold">
                              {inCart.quantity}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Itens adicionados ao checkout */}
                {checkoutProducts.length > 0 && (
                  <div className="space-y-1.5 border-t border-border/50 pt-2">
                    {checkoutProducts.map((cp) => (
                      <div key={cp.product.id} className="flex items-center justify-between text-xs">
                        <span className="truncate max-w-[180px] font-medium">{cp.product.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">
                            R$ {(cp.product.price * cp.quantity).toFixed(2)}
                          </span>
                          <div className="flex items-center gap-1 bg-muted/60 rounded-md p-0.5">
                            <button
                              type="button"
                              onClick={() => removeProductFromCheckout(cp.product.id)}
                              className="size-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-background"
                            >
                              <Minus className="size-3" />
                            </button>
                            <span className="w-4 text-center font-bold text-[11px]">{cp.quantity}</span>
                            <button
                              type="button"
                              onClick={() => addProductToCheckout(cp.product)}
                              className="size-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-background"
                            >
                              <Plus className="size-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Valor Total Cobrado */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold uppercase text-muted-foreground">Valor Total Cobrado (R$)</label>
                  {checkoutProducts.length > 0 && (
                    <span className="text-[11px] text-muted-foreground">Serviço + Produtos</span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">R$</span>
                  <Input
                    type="number"
                    step="0.50"
                    min="0"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
                    className="border-indigo-500/20 pl-10 text-base font-bold focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Método de Pagamento */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">Forma de Pagamento</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {(Object.entries(PAYMENT_METHOD_LABELS) as [PaymentMethod, { label: string; icon: typeof QrCode }][]).map(([key, { label, icon: Icon }]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPaymentMethod(key)}
                      className={`flex items-center gap-2 rounded-xl border p-2.5 text-xs font-medium transition-all ${
                        paymentMethod === key
                          ? 'border-indigo-500 bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 shadow-sm'
                          : 'border-indigo-500/15 bg-card/60 text-muted-foreground hover:bg-indigo-500/5'
                      }`}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className="truncate">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Prévia da Comissão */}
              <div className="rounded-xl border border-dashed border-indigo-500/20 bg-muted/40 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Taxa do Barbeiro:</span>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={barberCommissionRate}
                      onChange={(e) => setBarberCommissionRate(Number(e.target.value) || 0)}
                      className="h-6 w-14 text-center text-xs font-semibold"
                    />
                    <span className="text-muted-foreground">%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Repasse ao Barbeiro ({barberCommissionRate}%):</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    R$ {((paidAmount * barberCommissionRate) / 100).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-border/50 pt-2 text-xs">
                  <span className="font-medium text-foreground">Fica com a Barbearia:</span>
                  <span className="font-bold text-green-600 dark:text-green-400">
                    R$ {(paidAmount - (paidAmount * barberCommissionRate) / 100).toFixed(2)}
                  </span>
                </div>
              </div>

              <Button
                onClick={confirmCompleteAppointment}
                disabled={completing}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg hover:from-green-500 hover:to-emerald-500"
              >
                {completing ? 'Salvando...' : 'Confirmar e Finalizar Atendimento'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageTransition>
  )
}

export default Appointments
