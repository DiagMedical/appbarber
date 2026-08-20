import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import PageTransition from '@/components/PageTransition'
import { Settings, Save, Loader2, Upload, Trash2, Star, Calendar, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/providers/AuthProvider'
import { Link } from 'react-router-dom'
import { ensureGalleryBucket, uploadLogoPhoto, deletePhoto } from '@/lib/storage'

// ─── Schema ────────────────────────────────────────────────────────────────────

const shopSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  phone: z
    .string()
    .regex(/^\d{10,15}$/, 'Formato inválido. Use código do país + DDD + número (ex: 5511999999999)')
    .or(z.literal('')),
  address: z.string().max(200, 'Endereço muito longo').or(z.literal('')),
  logo_url: z.string().url('URL inválida').or(z.literal('')),
  google_review_url: z.string().url('URL inválida').or(z.literal('')),
})

type ShopFormValues = z.infer<typeof shopSchema>

// ─── Component ─────────────────────────────────────────────────────────────────

function ShopSettings() {
  const { shop, refreshShop, isAdmin } = useAuth()

  // Admin sem loja vê mensagem em vez de erro
  if (isAdmin && !shop) {
    return (
      <PageTransition>
        <div className="p-4 sm:p-6">
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Settings className="mb-4 size-12 text-indigo-500" />
            <h2 className="mb-2 text-xl font-semibold">Sem barbearia vinculada</h2>
            <p className="mb-6 max-w-md text-muted-foreground">
              Você é admin do sistema mas não é dono de nenhuma barbearia.
              Para configurar o logo, fotos e site público, acesse o painel{' '}
              <Link to="/whatsapp" className="text-indigo-400 underline underline-offset-2 hover:text-indigo-300">
                WhatsApp &gt; Site Público
              </Link>.
            </p>
            <Link
              to="/admin"
              className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-2 text-sm font-medium text-white shadow-md hover:from-indigo-500 hover:to-blue-500"
            >
              Ir para o painel Admin
            </Link>
          </div>
        </div>
      </PageTransition>
    )
  }

  const form = useForm<ShopFormValues>({
    resolver: zodResolver(shopSchema),
    defaultValues: {
      name: '',
      phone: '',
      address: '',
      logo_url: '',
      google_review_url: '',
    },
  })

  const { formState: { isSubmitting, isDirty }, watch, setValue } = form
  useUnsavedChanges(isDirty)
  const logoUrl = watch('logo_url')

  // Google Calendar integration state
  const [googleCalendarToken, setGoogleCalendarToken] = useState<import('@/types/database').GoogleCalendarToken | null>(null)
  const [loadingCalendar, setLoadingCalendar] = useState(true)

  async function loadGoogleCalendar() {
    if (!shop) return
    setLoadingCalendar(true)
    try {
      const { data } = await supabase
        .from('google_calendar_tokens')
        .select('*')
        .eq('shop_id', shop.id)
        .maybeSingle()
      setGoogleCalendarToken(data as import('@/types/database').GoogleCalendarToken | null)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingCalendar(false)
    }
  }

  // Populate form when shop data is available
  useEffect(() => {
    if (shop) {
      form.reset({
        name: shop.name ?? '',
        phone: shop.phone ?? '',
        address: shop.address ?? '',
        logo_url: shop.logo_url ?? '',
        google_review_url: shop.google_review_url ?? '',
      })
      loadGoogleCalendar()
    }
  }, [shop, form])

  async function onSubmit(values: ShopFormValues) {
    if (!shop) return

    const { error } = await supabase
      .from('shops')
      .update({
        name: values.name.trim(),
        phone: values.phone.trim() || null,
        address: values.address.trim() || null,
        logo_url: values.logo_url.trim() || null,
        google_review_url: values.google_review_url.trim() || null,
      })
      .eq('id', shop.id)

    if (error) {
      toast.error('Erro ao salvar configurações da barbearia')
      return
    }

    form.reset(values)
    toast.success('Configurações salvas com sucesso!')
    await refreshShop()
  }

  async function toggleGoogleSync(enabled: boolean) {
    if (!shop || !googleCalendarToken) return
    const { error } = await supabase
      .from('google_calendar_tokens')
      .update({ sync_enabled: enabled })
      .eq('shop_id', shop.id)
    if (error) {
      toast.error('Erro ao atualizar sincronização')
    } else {
      toast.success(enabled ? 'Sincronização ativada' : 'Sincronização pausada')
      loadGoogleCalendar()
    }
  }

  async function disconnectGoogleCalendar() {
    if (!shop || !confirm('Deseja realmente desconectar o Google Calendar?')) return
    const { error } = await supabase
      .from('google_calendar_tokens')
      .delete()
      .eq('shop_id', shop.id)
    if (error) {
      toast.error('Erro ao desconectar')
    } else {
      toast.success('Google Calendar desconectado')
      setGoogleCalendarToken(null)
    }
  }

  async function handleLogoUpload(file: File) {
    if (!shop) return
    try {
      await ensureGalleryBucket()
      const url = await uploadLogoPhoto(shop.id, file)
      if (!url) {
        toast.error('Upload retornou URL vazia.')
        return
      }
      const { error } = await supabase
        .from('shops')
        .update({ logo_url: url })
        .eq('id', shop.id)
      if (error) throw error
      setValue('logo_url', url, { shouldValidate: true })
      toast.success('Logo atualizado e salvo!')
      await refreshShop()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error('Erro no upload: ' + msg)
    }
  }

  async function handleLogoRemove() {
    if (logoUrl.includes('/storage/')) {
      await deletePhoto(logoUrl)
    }
    setValue('logo_url', '', { shouldValidate: true })
  }

  if (!shop) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-8 animate-spin text-indigo-500" />
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-zinc-950 shadow-lg shadow-amber-500/20">
            <Settings className="size-5 font-bold" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-heading">Configurações</h1>
            <p className="text-sm text-muted-foreground">Informações da sua barbearia</p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-2">

            {/* ── Dados da Loja ── */}
            <Card className="border-amber-500/15 bg-card/60 backdrop-blur-xl shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 font-bold">
                    <Settings className="size-4" />
                  </div>
                  <div>
                    <CardTitle className="font-heading">Dados da Barbearia</CardTitle>
                    <CardDescription>Nome, telefone e endereço visíveis no sistema</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da Barbearia</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: Studio Lima"
                          className="border-amber-500/20 focus:ring-amber-500"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone / WhatsApp da Loja</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: 5511999999999"
                          className="border-amber-500/20 focus:ring-amber-500"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Código do país + DDD + número, sem espaços ou traços.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: Rua das Flores, 123 — São Paulo/SP"
                          className="border-amber-500/20 focus:ring-amber-500"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="google_review_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5 font-semibold text-foreground">
                        <Star className="size-4 text-amber-500 fill-amber-500" />
                        Link de Avaliação Google (Google Meu Negócio)
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: https://g.page/r/Cb7e.../review"
                          className="border-amber-500/20 focus:ring-amber-500"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Enviaremos este link automaticamente no WhatsApp após o atendimento ser concluído para gerar avaliações 5 estrelas.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-amber-500 via-amber-500 to-orange-500 text-zinc-950 font-bold shadow-md hover:from-amber-400 hover:to-orange-400"
                >
                  {isSubmitting ? (
                    <><Loader2 className="mr-2 size-4 animate-spin" /> Salvando...</>
                  ) : (
                    <><Save className="mr-2 size-4" /> Salvar configurações</>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* ── Logo ── */}
            <Card className="border-amber-500/15 bg-card/60 backdrop-blur-xl shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 font-bold">
                    <Upload className="size-4" />
                  </div>
                  <div>
                    <CardTitle className="font-heading">Logo da Barbearia</CardTitle>
                    <CardDescription>Imagem exibida no painel administrativo</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Preview */}
                {logoUrl ? (
                  <div className="relative overflow-hidden rounded-2xl border border-amber-500/15">
                    <img
                      src={logoUrl}
                      alt="Logo"
                      className="h-40 w-full bg-card/50 object-contain p-4"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-2 bg-black/50 text-white hover:bg-black/70"
                      onClick={handleLogoRemove}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-amber-500/20 bg-amber-500/5 text-sm text-muted-foreground">
                    Nenhum logo configurado
                  </div>
                )}

                {/* Upload button */}
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-muted-foreground transition hover:bg-amber-500/10">
                  <Upload className="size-4 text-amber-400" />
                  {logoUrl ? 'Trocar logo' : 'Fazer upload do logo'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleLogoUpload(file)
                    }}
                  />
                </label>

                <p className="text-xs text-muted-foreground">
                  Formatos aceitos: JPG, PNG, WebP, SVG. Tamanho máximo: 5 MB.
                </p>
              </CardContent>
            </Card>

            {/* ── Integração Google Calendar ── */}
            <Card className="border-amber-500/15 bg-card/60 backdrop-blur-xl shadow-lg lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 font-bold">
                      <Calendar className="size-4" />
                    </div>
                    <div>
                      <CardTitle className="font-heading">Integração Google Calendar</CardTitle>
                      <CardDescription>Sincronize agendamentos automaticamente com sua conta do Google Agenda</CardDescription>
                    </div>
                  </div>
                  {googleCalendarToken && (
                    <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                      <CheckCircle2 className="size-3.5" /> Conectado
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingCalendar ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="size-4 animate-spin" /> Carregando status da integração...
                  </div>
                ) : googleCalendarToken ? (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs">
                      <div>
                        <p className="font-semibold text-foreground text-sm">Google Agenda Ativa</p>
                        <p className="text-muted-foreground mt-0.5">
                          Agendamentos criados ou alterados serão espelhados automaticamente no seu calendário.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => toggleGoogleSync(!googleCalendarToken.sync_enabled)}
                        >
                          {googleCalendarToken.sync_enabled ? 'Pausar Sincronização' : 'Ativar Sincronização'}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={disconnectGoogleCalendar}
                        >
                          Desconectar
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-dashed border-amber-500/20 bg-amber-500/5 p-5">
                    <div className="space-y-1">
                      <p className="font-semibold text-sm text-foreground">Conectar Conta Google</p>
                      <p className="text-xs text-muted-foreground max-w-md">
                        Conecte sua agenda para visualizar horários e compromissos diretamente no celular ou smartwatch.
                      </p>
                    </div>
                    <Button
                      type="button"
                      onClick={() => {
                        toast.info('Para ativar OAuth2 com o Google, configure as credenciais no Google Cloud Console e insira o Client ID nas variáveis de ambiente.')
                      }}
                      className="bg-gradient-to-r from-amber-500 via-amber-500 to-orange-500 text-zinc-950 font-bold shadow-md hover:from-amber-400 hover:to-orange-400 shrink-0"
                    >
                      <Calendar className="mr-2 size-4" /> Conectar Google Agenda
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Info da loja (leitura) ── */}
            <Card className="border-amber-500/15 bg-card/60 backdrop-blur-xl shadow-lg lg:col-span-2">
              <CardContent className="pt-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-amber-500/10 bg-amber-500/5 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">ID da Loja</p>
                    <p className="mt-1 font-mono text-sm font-medium">{shop.id.slice(0, 8)}…</p>
                  </div>
                  <div className="rounded-xl border border-amber-500/10 bg-amber-500/5 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Slug Público</p>
                    <p className="mt-1 font-mono text-sm font-medium">
                      {shop.public_slug ?? 'Não configurado'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

          </form>
        </Form>
      </div>
    </PageTransition>
  )
}

export default ShopSettings
