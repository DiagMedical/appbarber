import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle, AtSign, MapPin, Phone, Scissors, User, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { loadPublicShopContext, resolvePublicShopSlug } from '@/lib/public-site'
import { getAvailableSlots } from '@/lib/availability'
import { getUTC3DateKey } from '@/lib/timezone'
import { sendText } from '@/lib/evolution'
import type { Barber, Service, Shop } from '@/types/database'

function normalizePhone(value: string) {
  return value.replace(/\D/g, '')
}

function formatPhoneInput(value: string) {
  const digits = normalizePhone(value).slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

function buildISO(date: string, time: string) {
  return new Date(`${date}T${time}:00-03:00`)
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

const DAY_LABELS: Record<string, string> = {
  domingo: 'Domingo',
  segunda: 'Segunda-feira',
  terca: 'Terça-feira',
  quarta: 'Quarta-feira',
  quinta: 'Quinta-feira',
  sexta: 'Sexta-feira',
  sabado: 'Sábado',
}

const DAY_ORDER = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']

function getSlugFromPath(): string | null {
  const match = window.location.pathname.match(/^\/public\/([^/]+)/)
  return match?.[1] ?? null
}

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null!)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('animate-fade-in')
          observer.unobserve(el)
        }
      },
      { threshold: 0.15 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return ref
}

function SectionHeading({ overline, title }: { overline: string; title: string }) {
  return (
    <div className="mb-10 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-white/40">{overline}</p>
      <h2 className="mt-3 text-3xl font-display leading-tight sm:text-4xl">{title}</h2>
      <div className="mx-auto mt-4 h-px w-12 bg-white/10" />
    </div>
  )
}

function PublicSite() {
  const slug = getSlugFromPath() ?? resolvePublicShopSlug()

  const [loading, setLoading] = useState(true)
  const [shop, setShop] = useState<Shop | null>(null)
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [barberId, setBarberId] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const context = await loadPublicShopContext(slug)
        if (!context) {
          setError('Nenhuma loja encontrada')
          setShop(null)
          setBarbers([])
          setServices([])
          return
        }
        setShop(context.shop)
        setBarbers(context.barbers)
        setServices(context.services)
        setError('')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Nao foi possivel carregar o site')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [slug])

  const selectedService = services.find((service) => service.id === serviceId)
  const selectedBarber = barbers.find((barber) => barber.id === barberId)

  useEffect(() => {
    if (!shop || !barberId || !serviceId || !date) {
      setAvailableSlots([])
      return
    }
    let active = true
    setTime('')
    setLoadingSlots(true)
    getAvailableSlots(barberId, date, selectedService?.duration_minutes ?? 30)
      .then((slots) => { if (active) setAvailableSlots(slots) })
      .catch(() => { if (active) setAvailableSlots([]) })
      .finally(() => { if (active) setLoadingSlots(false) })
    return () => { active = false }
  }, [shop?.id, barberId, serviceId, date, selectedService?.duration_minutes])

  const bookingSummary = useMemo(() => {
    const duration = selectedService?.duration_minutes ?? 0
    return {
      barberName: selectedBarber?.name ?? 'Barbeiro nao selecionado',
      serviceName: selectedService?.name ?? 'Servico nao selecionado',
      duration,
      timeLabel: time || 'Horario pendente',
      dateLabel: date || 'Data pendente',
      phoneLabel: normalizePhone(phone) ? formatPhoneInput(phone) : 'WhatsApp pendente',
    }
  }, [selectedBarber?.name, selectedService?.name, selectedService?.duration_minutes, date, time, phone])

  const todayStr = getUTC3DateKey()
  const whatsappLink = shop?.phone ? `https://wa.me/${normalizePhone(shop.phone)}` : ''
  const instagramLink = shop?.instagram ? `https://instagram.com/${shop.instagram.replace(/^@/, '')}` : null
  const galleryPhotos: string[] = Array.isArray(shop?.gallery_photos) ? shop.gallery_photos : []
  const workingHours: Record<string, string> = shop?.working_hours ?? {}

  function resetForm() {
    setBarberId('')
    setServiceId('')
    setDate('')
    setTime('')
    setName('')
    setPhone('')
    setError('')
    setSuccess(false)
    setAvailableSlots([])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!shop) return
    const cleanPhone = normalizePhone(phone)
    if (!barberId || !serviceId || !date || !time || !name.trim() || cleanPhone.length < 10) {
      setError('Preencha nome, WhatsApp, barbeiro, servico, data e horario')
      return
    }
    setSaving(true)
    setError('')
    try {
      const duration = selectedService?.duration_minutes ?? 30
      const stillAvailable = await getAvailableSlots(barberId, date, duration)
      if (!stillAvailable.includes(time)) {
        setError('Este horario nao esta mais disponivel. Escolha outro.')
        setSaving(false)
        return
      }
      let clientId = ''
      const { data: existing } = await supabase
        .from('clients').select('id').eq('shop_id', shop.id).eq('phone', cleanPhone).maybeSingle()
      if (existing) {
        clientId = existing.id as string
      } else {
        const { data: newClient, error: clientError } = await supabase
          .from('clients').insert({ shop_id: shop.id, name: name.trim(), phone: cleanPhone }).select('id').single()
        if (clientError) throw clientError
        if (!newClient) throw new Error('Nao foi possivel criar o cliente')
        clientId = newClient.id as string
      }
      const startTime = buildISO(date, time)
      const endTime = new Date(startTime.getTime() + duration * 60000)
      const { error: appointmentError } = await supabase.from('appointments').insert({
        shop_id: shop.id, barber_id: barberId, service_id: serviceId,
        client_id: clientId, start_time: startTime.toISOString(),
        end_time: endTime.toISOString(), status: 'pending',
      })
      if (appointmentError) throw appointmentError
      const message = [
        '*AppBarber*',
        '',
        `Ola ${name.trim()}, seu agendamento foi confirmado!`,
        '',
        `${date} as ${time}`,
        `Servico: ${selectedService?.name ?? 'Servico'}`,
        `Barbeiro: ${selectedBarber?.name ?? 'Barbeiro'}`,
      ].join('\n')
      const sent = await sendText({ number: cleanPhone, text: message })
      if (sent) toast.success('Confirmacao enviada no WhatsApp')
      else toast.warning('Agendamento criado, mas o WhatsApp nao esta configurado')
      setSuccess(true)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Nao foi possivel concluir o agendamento')
    } finally { setSaving(false) }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          <p className="text-sm text-white/60">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!shop) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 p-4 text-white">
        <Card className="w-full max-w-md border-white/[0.06] bg-white/[0.03] text-white backdrop-blur">
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-white/5">
              <Scissors className="size-7 text-white/50" />
            </div>
            <h1 className="text-lg font-semibold">Site nao encontrado</h1>
            <p className="mt-2 text-sm text-white/50">Verifique o link usado para acessar esta barbearia.</p>
            {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white">
        <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-12">
          <Card className="w-full max-w-xl border-white/[0.06] bg-white/[0.03] text-white backdrop-blur">
            <CardContent className="p-8 text-center">
              <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-emerald-500/15">
                <CheckCircle className="size-8 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-display">Agendamento confirmado!</h2>
              <p className="mt-2 text-sm text-white/50">Voce recebera a confirmacao no WhatsApp.</p>
              <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 text-left">
                <p className="text-xs uppercase tracking-[0.15em] text-white/40">Resumo</p>
                <div className="mt-3 space-y-2 text-sm text-white/70">
                  <p>{bookingSummary.barberName}</p>
                  <p>{bookingSummary.serviceName}</p>
                  <p>{bookingSummary.dateLabel} as {bookingSummary.timeLabel}</p>
                </div>
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button onClick={resetForm} className="bg-white text-neutral-900 hover:bg-white/90">
                  Novo agendamento
                </Button>
                {whatsappLink ? (
                  <Button variant="outline" className="border-white/[0.12] text-white hover:bg-white/5" onClick={() => window.open(whatsappLink, '_blank')}>
                    WhatsApp da barbearia
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const heroPhoto = shop.hero_photo
  const heroBg = heroPhoto
    ? `linear-gradient(rgba(10,10,10,0.75),rgba(10,10,10,0.85)),url(${heroPhoto})`
    : 'linear-gradient(180deg,#171717 0%,#0a0a0a 100%)'

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans">

      {/* ── Hero ── */}
      <section
        className="relative flex min-h-screen items-center justify-center bg-cover bg-center"
        style={{ backgroundImage: heroBg }}
      >
        <div className="mx-auto max-w-3xl px-4 py-24 text-center">
          <div className="animate-fade-in flex flex-col items-center gap-5">
            {shop.logo_url ? (
              <img src={shop.logo_url} alt={shop.name} className="size-24 rounded-full border-2 border-white/[0.10] object-cover" />
            ) : (
              <div className="flex size-24 items-center justify-center rounded-full bg-white/[0.06] border border-white/[0.08]">
                <Scissors className="size-10 text-white/50" />
              </div>
            )}
            <h1 className="text-4xl font-display leading-tight sm:text-6xl">{shop.name}</h1>
            <p className="text-base text-white/50 sm:text-lg">Experiência em barbearia premium</p>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-white/50">
              {shop.address ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-3.5" />{shop.address}
                </span>
              ) : null}
              {shop.phone ? (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="size-3.5" />{formatPhoneInput(shop.phone)}
                </span>
              ) : null}
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              {whatsappLink ? (
                <Button
                  className="bg-white text-neutral-900 hover:bg-white/90 px-6 h-11"
                  onClick={() => window.open(whatsappLink, '_blank')}
                >
                  <Phone className="mr-2 size-4" />
                  Falar no WhatsApp
                </Button>
              ) : null}
              {instagramLink ? (
                <Button
                  variant="outline"
                  className="border-white/[0.12] text-white hover:bg-white/5 px-6 h-11"
                  onClick={() => window.open(instagramLink, '_blank')}
                >
                  <AtSign className="mr-2 size-4" />
                  Instagram
                </Button>
              ) : null}
            </div>
          </div>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="size-5 text-white/30" />
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-20 space-y-28 sm:py-28">

        {/* ── Serviços ── */}
        <ScrollRevealSection>
          <SectionHeading overline="Serviços" title="Nossos serviços" />
          {services.length === 0 ? (
            <p className="text-center text-sm text-white/40">Nenhum servico cadastrado.</p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service, i) => (
                <ServiceCard key={service.id} service={service} index={i} />
              ))}
            </div>
          )}
        </ScrollRevealSection>

        {/* ── Equipe ── */}
        <ScrollRevealSection>
          <SectionHeading overline="Equipe" title="Nossos profissionais" />
          {barbers.length === 0 ? (
            <p className="text-center text-sm text-white/40">Nenhum profissional cadastrado.</p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {barbers.map((barber, i) => (
                <TeamCard key={barber.id} barber={barber} index={i} />
              ))}
            </div>
          )}
        </ScrollRevealSection>

        {/* ── Galeria ── */}
        {galleryPhotos.length > 0 ? (
          <ScrollRevealSection>
            <SectionHeading overline="Galeria" title="Conheça nosso espaço" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {galleryPhotos.map((photo, idx) => (
                <div key={idx} className="group overflow-hidden rounded-2xl border border-white/[0.06]">
                  <img
                    src={photo}
                    alt={`Foto ${idx + 1}`}
                    className="aspect-square w-full object-cover transition duration-700 ease-out group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </ScrollRevealSection>
        ) : null}

        {/* ── Localização + Horários ── */}
        <ScrollRevealSection>
          <SectionHeading overline="Localização" title="Onde estamos" />
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-5">
              {shop.address ? (
                <InfoBlock icon={<MapPin className="size-4 text-white/50" />} label="Endereço" value={shop.address} />
              ) : null}
              {shop.phone ? (
                <InfoBlock icon={<Phone className="size-4 text-white/50" />} label="Telefone" value={formatPhoneInput(shop.phone)} />
              ) : null}
              {instagramLink ? (
                <InfoBlockWithLink icon={<AtSign className="size-4 text-white/50" />} label="Instagram" href={instagramLink}>
                  @{shop.instagram?.replace(/^@/, '')}
                </InfoBlockWithLink>
              ) : null}
              {shop.address ? (
                <Button
                  variant="outline"
                  className="border-white/[0.12] text-white hover:bg-white/5 w-full mt-2"
                  onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(shop.address ?? '')}`, '_blank')}
                >
                  <MapPin className="mr-2 size-4" />
                  Abrir no Google Maps
                </Button>
              ) : null}
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
              <p className="mb-5 text-xs uppercase tracking-[0.2em] text-white/40">Horários</p>
              <div className="space-y-3">
                {DAY_ORDER.map((day) => {
                  const hours = workingHours[day] || workingHours[DAY_LABELS[day]]
                  if (!hours) return null
                  return (
                    <div key={day} className="flex items-center justify-between border-b border-white/[0.04] pb-2 text-sm">
                      <span className="text-white/50">{DAY_LABELS[day]}</span>
                      <span className="text-white/80">{hours}</span>
                    </div>
                  )
                })}
                {DAY_ORDER.every((day) => !workingHours[day] && !workingHours[DAY_LABELS[day]]) ? (
                  <p className="text-sm text-white/40">Horarios nao informados.</p>
                ) : null}
              </div>
            </div>
          </div>
        </ScrollRevealSection>

        {/* ── Agendamento ── */}
        <ScrollRevealSection>
          <SectionHeading overline="Agendamento" title="Reserve seu horário" />
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
            <div className="grid gap-8 p-6 lg:grid-cols-[1.1fr_0.9fr] lg:p-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormSelect
                    label="Serviço"
                    value={serviceId}
                    onChange={(e) => setServiceId(e.target.value)}
                    options={services.map((s) => ({ value: s.id, label: `${s.name} - ${formatMoney(s.price)}` }))}
                  />
                  <FormSelect
                    label="Barbeiro"
                    value={barberId}
                    onChange={(e) => setBarberId(e.target.value)}
                    options={barbers.map((b) => ({ value: b.id, label: b.name }))}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormInput label="Data" type="date" value={date} onChange={(e) => setDate(e.target.value)} min={todayStr} />
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm text-white/50">Horário</label>
                    {time ? (
                      <div className="flex h-10 items-center rounded-xl border border-white/20 bg-white/[0.04] px-3 text-sm text-white">
                        {time}
                      </div>
                    ) : (
                      <div className="flex h-10 items-center rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm text-white/40">
                        Escolha abaixo
                      </div>
                    )}
                  </div>
                </div>

                {date && barberId && serviceId ? (
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <p className="mb-3 text-sm text-white/50">Horários disponíveis</p>
                    {loadingSlots ? (
                      <div className="flex items-center gap-2 text-sm text-white/40">
                        <div className="size-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                        Verificando...
                      </div>
                    ) : availableSlots.length === 0 ? (
                      <p className="text-sm text-amber-400/70">Nenhum horário disponível nesta data.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {availableSlots.map((slot) => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setTime(slot)}
                            className={`rounded-xl border px-3 py-1.5 text-sm transition ${
                              time === slot
                                ? 'border-white bg-white text-neutral-900'
                                : 'border-white/[0.08] text-white/70 hover:border-white/20 hover:bg-white/[0.04]'
                            }`}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormInput label="Nome" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm text-white/50">WhatsApp</label>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                      placeholder="(11) 99999-8888"
                      inputMode="numeric"
                      className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm text-white outline-none transition focus:border-white/20 focus:bg-white/[0.04] placeholder:text-white/25"
                    />
                  </div>
                </div>

                {error ? <p className="text-sm text-rose-300">{error}</p> : null}

                <Button
                  type="submit"
                  disabled={saving}
                  className="w-full h-11 bg-white text-neutral-900 hover:bg-white/90 transition"
                >
                  {saving ? 'Agendando...' : 'Confirmar agendamento'}
                </Button>
              </form>

              <aside className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 h-fit lg:sticky lg:top-8">
                <p className="mb-4 text-xs uppercase tracking-[0.2em] text-white/40">Resumo</p>
                <div className="space-y-4 text-sm">
                  <SummaryRow label="Barbeiro" value={bookingSummary.barberName} />
                  <SummaryRow label="Serviço" value={bookingSummary.serviceName} />
                  {bookingSummary.duration ? (
                    <SummaryRow label="Duração" value={`${bookingSummary.duration} min`} />
                  ) : null}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <SummaryRow label="Data" value={bookingSummary.dateLabel} />
                    <SummaryRow label="Horário" value={bookingSummary.timeLabel} />
                  </div>
                  <SummaryRow label="WhatsApp" value={bookingSummary.phoneLabel} />
                  <div className="rounded-xl bg-white/[0.03] p-3 text-xs text-white/40">
                    Horários em UTC-3 (Brasília)
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </ScrollRevealSection>

      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-10 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-white/[0.06]">
              <Scissors className="size-5 text-white/50" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-white">{shop.name}</p>
              <p className="text-[10px] uppercase tracking-[0.15em] text-white/30">Barbearia</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-5 text-sm text-white/40">
            {instagramLink ? (
              <a href={instagramLink} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-white/70 transition">
                <AtSign className="size-3.5" />
                Instagram
              </a>
            ) : null}
            {whatsappLink ? (
              <a href={whatsappLink} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-white/70 transition">
                <Phone className="size-3.5" />
                WhatsApp
              </a>
            ) : null}
          </div>
          <div className="flex flex-col items-center gap-0.5 sm:items-end">
            <p className="text-xs text-white/30">&copy; 2026 {shop.name}</p>
            <p className="text-[10px] text-white/20">Feito com AppBarber</p>
          </div>
        </div>
      </footer>

    </div>
  )
}

/* ── Sub-components ── */

function ScrollRevealSection({ children }: { children: React.ReactNode }) {
  const ref = useScrollReveal()
  return (
    <section ref={ref} className="opacity-0" style={{ willChange: 'opacity, transform' }}>
      {children}
    </section>
  )
}

function ServiceCard({ service, index }: { service: Service; index: number }) {
  const ref = useRef<HTMLDivElement>(null!)
  useEffect(() => {
    const el = ref.current
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.style.opacity = '1'; el.style.transform = 'translateY(0)'; observer.unobserve(el) } },
      { threshold: 0.2 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return (
    <div
      ref={ref}
      style={{ opacity: 0, transform: 'translateY(12px)', transitionDelay: `${index * 80}ms` }}
      className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 transition duration-500 ease-out hover:border-white/[0.12] hover:bg-white/[0.04]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-base font-semibold text-white">{service.name}</h3>
          {service.description ? (
            <p className="mt-1.5 text-sm text-white/45 leading-relaxed">{service.description}</p>
          ) : null}
          <p className="mt-3 text-xs text-white/35">{service.duration_minutes} min</p>
        </div>
        <span className="shrink-0 text-lg font-semibold text-white">{formatMoney(service.price)}</span>
      </div>
    </div>
  )
}

function TeamCard({ barber, index }: { barber: Barber; index: number }) {
  const ref = useRef<HTMLDivElement>(null!)
  useEffect(() => {
    const el = ref.current
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.style.opacity = '1'; el.style.transform = 'translateY(0)'; observer.unobserve(el) } },
      { threshold: 0.2 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return (
    <div
      ref={ref}
      style={{ opacity: 0, transform: 'translateY(12px)', transitionDelay: `${index * 80}ms` }}
      className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-center transition duration-500 ease-out hover:border-white/[0.12] hover:bg-white/[0.04]"
    >
      {barber.photo_url ? (
        <img
          src={barber.photo_url}
          alt={barber.name}
          className="mx-auto size-24 rounded-full border-2 border-white/[0.08] object-cover"
        />
      ) : (
        <div className="mx-auto flex size-24 items-center justify-center rounded-full bg-white/[0.06] border border-white/[0.08]">
          <User className="size-10 text-white/40" />
        </div>
      )}
      <h3 className="mt-5 text-base font-semibold text-white">{barber.name}</h3>
      <p className="mt-1.5 text-sm text-white/45">{barber.bio || 'Profissional da casa'}</p>
    </div>
  )
}

function InfoBlock({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="text-xs uppercase tracking-[0.15em] text-white/40">{label}</p>
        <p className="mt-0.5 text-sm text-white/70">{value}</p>
      </div>
    </div>
  )
}

function InfoBlockWithLink({ icon, label, href, children }: { icon: React.ReactNode; label: string; href: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="text-xs uppercase tracking-[0.15em] text-white/40">{label}</p>
        <a href={href} target="_blank" rel="noreferrer" className="mt-0.5 block text-sm text-white/70 hover:underline">{children}</a>
      </div>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-white/40">{label}</p>
      <p className="mt-0.5 text-sm text-white/80">{value}</p>
    </div>
  )
}

function FormInput({ label, type, value, onChange, placeholder, min }: {
  label: string; type?: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string; min?: string
}) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm text-white/50">{label}</label>
      <input
        type={type ?? 'text'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        min={min}
        className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm text-white outline-none transition focus:border-white/20 focus:bg-white/[0.04] placeholder:text-white/25"
      />
    </div>
  )
}

function FormSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; options: { value: string; label: string }[]
}) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm text-white/50">{label}</label>
      <select
        value={value}
        onChange={onChange}
        className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm text-white outline-none transition focus:border-white/20"
      >
        <option value="">Selecione</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}

export default PublicSite
