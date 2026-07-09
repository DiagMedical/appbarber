import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ListSkeleton } from '@/components/Skeleton'
import PageTransition from '@/components/PageTransition'
import { Plus, Pencil, Trash2, Phone, User, Search, ArrowDownAZ, Clock3, Mail, StickyNote } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/timezone'
import { useAuth } from '@/providers/AuthProvider'
import type { Client } from '@/types/database'

type ClientSort = 'name' | 'recent'

function Clients() {
  const { shop, loading: shopLoading } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState<ClientSort>('name')

  useEffect(() => {
    load()
  }, [shop?.id, shopLoading])

  const visibleClients = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = clients.filter((client) => {
      const haystack = [client.name, client.phone, client.email ?? '', client.notes ?? ''].join(' ').toLowerCase()
      return !q || haystack.includes(q)
    })

    return [...filtered].sort((a, b) => {
      if (sortBy === 'recent') {
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      }
      return a.name.localeCompare(b.name, 'pt-BR')
    })
  }, [clients, query, sortBy])

  async function load() {
    if (shopLoading) return
    if (!shop) {
      setClients([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const { data } = await supabase.from('clients').select('*').eq('shop_id', shop.id).order('name')
      if (data) setClients(data as Client[])
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setName('')
    setPhone('')
    setEmail('')
    setNotes('')
    setEditing(null)
  }

  async function save() {
    if (!shop) return
    if (!name.trim() || !phone.trim()) return
    const payload = { shop_id: shop.id, name: name.trim(), phone: phone.replace(/\D/g, ''), email: email.trim() || null, notes: notes.trim() || null }
    if (editing) {
      await supabase.from('clients').update(payload).eq('id', editing.id).eq('shop_id', shop.id)
      toast.success('Cliente atualizado')
    } else {
      await supabase.from('clients').insert(payload)
      toast.success('Cliente cadastrado')
    }
    reset()
    setOpen(false)
    load()
  }

  async function remove(id: string) {
    if (!shop) return
    await supabase.from('clients').delete().eq('id', id).eq('shop_id', shop.id)
    toast.success('Cliente removido')
    load()
  }

  function edit(client: Client) {
    setEditing(client)
    setName(client.name)
    setPhone(client.phone)
    setEmail(client.email ?? '')
    setNotes(client.notes ?? '')
    setOpen(true)
  }

  const noteCount = clients.filter((client) => Boolean(client.notes)).length
  const emailCount = clients.filter((client) => Boolean(client.email)).length

  return (
    <PageTransition>
      <div className="p-4 sm:p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/20">
              <User className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Clientes</h1>
              <p className="text-sm text-muted-foreground">Busque rápido, edite em poucos cliques e veja o histórico essencial</p>
            </div>
          </div>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
            <DialogTrigger>
              <Button className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md hover:from-indigo-500 hover:to-blue-500">
                <Plus className="mr-2 size-4" /> Novo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} className="border-indigo-500/20 focus:ring-indigo-500" />
                <Input placeholder="WhatsApp" value={phone} onChange={(e) => setPhone(e.target.value)} className="border-indigo-500/20 focus:ring-indigo-500" />
                <Input placeholder="Email (opcional)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="border-indigo-500/20 focus:ring-indigo-500" />
                <Input placeholder="Observações (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} className="border-indigo-500/20 focus:ring-indigo-500" />
                <Button onClick={save} className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md hover:from-indigo-500 hover:to-blue-500">Salvar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          {[
            { label: 'Total', value: clients.length, border: 'border-sky-500/20', from: 'from-sky-500', to: 'to-indigo-600' },
            { label: 'Com e-mail', value: emailCount, border: 'border-violet-500/20', from: 'from-violet-500', to: 'to-indigo-600' },
            { label: 'Com notas', value: noteCount, border: 'border-indigo-500/20', from: 'from-indigo-500', to: 'to-blue-600' },
          ].map((item) => (
            <div key={item.label} className={`rounded-2xl border bg-card p-4 shadow-sm ${item.border}`}>
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className="mt-1 text-3xl font-bold">{item.value}</p>
              <div className={`mt-3 h-1 w-16 rounded-full bg-gradient-to-r ${item.from} ${item.to}`} />
            </div>
          ))}
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente, telefone, e-mail ou nota..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 border-indigo-500/20 focus:ring-indigo-500"
            />
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as ClientSort)}>
            <SelectTrigger className="w-44 border-indigo-500/20 focus:ring-indigo-500">
              <ArrowDownAZ className="mr-2 size-4 text-muted-foreground" />
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Nome</SelectItem>
              <SelectItem value="recent">Mais recentes</SelectItem>
            </SelectContent>
          </Select>
          {query && (
            <Button variant="ghost" onClick={() => setQuery('')} className="text-muted-foreground hover:text-indigo-600">
              Limpar busca
            </Button>
          )}
        </div>

        {loading ? (
          <ListSkeleton count={5} />
        ) : visibleClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-indigo-500/15 bg-indigo-500/5 py-16 text-muted-foreground">
            <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted">
              <User className="size-8 text-indigo-400" />
            </div>
            <p className="mb-1 font-medium">{query ? 'Nenhum resultado encontrado' : 'Nenhum cliente ainda'}</p>
            <p className="text-sm">{query ? 'Tente outro termo de busca' : 'Clientes são cadastrados automaticamente nos agendamentos'}</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleClients.map((client, i) => (
              <Card key={client.id} className="animate-fade-in border-indigo-500/10 transition-all duration-200 hover:-translate-y-1 hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5" style={{ animationDelay: `${i * 50}ms` }}>
                <CardContent className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500/20 to-indigo-600/20 text-indigo-600 dark:text-indigo-400">
                        <User className="size-4" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium">{client.name}</p>
                        <p className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="size-3" /> {client.phone}
                        </p>
                        {client.email && (
                          <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Mail className="size-3" /> {client.email}
                          </p>
                        )}
                        {client.notes && (
                          <p className="flex items-start gap-1 text-xs text-muted-foreground italic">
                            <StickyNote className="mt-0.5 size-3 shrink-0" /> {client.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="rounded-full bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                      <Clock3 className="mr-1 inline size-3" />
                      {formatDate(client.updated_at)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">Última atualização</p>
                    <span className="text-xs font-medium text-muted-foreground">
                      {formatDate(client.updated_at)}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => edit(client)} className="text-muted-foreground hover:text-indigo-600">
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(client.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  )
}

export default Clients
