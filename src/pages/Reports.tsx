import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import PageTransition from '@/components/PageTransition'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { BarChart3, TrendingUp, DollarSign, Users, Calendar, Sparkles, Wallet, QrCode, CreditCard, Banknote, Landmark, Receipt, TrendingDown, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '@/providers/AuthProvider'
import { getUTC3DateParts, getUTC3MonthKey, getUTC3DateKey, startOfUTC3MonthISO } from '@/lib/timezone'
import { toast } from 'sonner'
import type { PaymentMethod, Expense } from '@/types/database'

interface BarberStats {
  id: string
  name: string
  commissionRate: number
  total: number
  completed: number
  cancelled: number
  revenue: number
  commissionTotal: number
  shopRetained: number
}

interface MonthlyStats {
  key: string
  label: string
  total: number
  revenue: number
  commission: number
}

interface PaymentStats {
  method: PaymentMethod | 'unspecified'
  label: string
  count: number
  total: number
}

const PERIOD_LABELS: Record<string, string> = {
  month: 'Este mês',
  '3months': 'Últimos 3 meses',
  year: 'Este ano',
}

const EXPENSE_CATEGORIES: Record<string, string> = {
  aluguel: 'Aluguel & Condomínio',
  produtos: 'Produtos & Insumos',
  energia_agua: 'Energia, Água & Internet',
  manutencao: 'Manutenção & Limpeza',
  marketing: 'Marketing & Divulgação',
  outros: 'Outros',
}

const PAYMENT_LABELS: Record<string, { label: string; icon: typeof QrCode }> = {
  pix: { label: 'Pix', icon: QrCode },
  credit_card: { label: 'Cartão de Crédito', icon: CreditCard },
  debit_card: { label: 'Cartão de Débito', icon: CreditCard },
  cash: { label: 'Dinheiro', icon: Banknote },
  other: { label: 'Outro', icon: Wallet },
  unspecified: { label: 'Não informado', icon: Landmark },
}

function Reports() {
  const { shop, loading: shopLoading } = useAuth()
  const [barberStats, setBarberStats] = useState<BarberStats[]>([])
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([])
  const [paymentStats, setPaymentStats] = useState<PaymentStats[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [period, setPeriod] = useState('month')
  const [loading, setLoading] = useState(true)

  // Modal de Despesas
  const [expenseModalOpen, setExpenseModalOpen] = useState(false)
  const [newExpenseCategory, setNewExpenseCategory] = useState('produtos')
  const [newExpenseDesc, setNewExpenseDesc] = useState('')
  const [newExpenseAmount, setNewExpenseAmount] = useState('')
  const [newExpenseDate, setNewExpenseDate] = useState(() => getUTC3DateKey())
  const [savingExpense, setSavingExpense] = useState(false)

  const [summary, setSummary] = useState({
    total: 0,
    completed: 0,
    cancelled: 0,
    grossRevenue: 0,
    totalCommissions: 0,
    totalExpenses: 0,
    netRevenue: 0,
    avgTicket: 0,
  })

  const currency = useMemo(() => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }), [])

  useEffect(() => {
    load()
  }, [period, shop?.id, shopLoading])

  async function load() {
    setLoading(true)
    try {
      if (shopLoading) return
      if (!shop) {
        setBarberStats([])
        setMonthlyStats([])
        setPaymentStats([])
        setExpenses([])
        setSummary({ total: 0, completed: 0, cancelled: 0, grossRevenue: 0, totalCommissions: 0, totalExpenses: 0, netRevenue: 0, avgTicket: 0 })
        return
      }
      const now = new Date()
      const { month } = getUTC3DateParts(now)
      const startDateIso =
        period === 'month'
          ? startOfUTC3MonthISO(now, 0)
          : period === '3months'
            ? startOfUTC3MonthISO(now, 2)
            : startOfUTC3MonthISO(now, month - 1)

      const startDateKey = startDateIso.split('T')[0]

      const [barbersRes, aptsRes, servicesRes, expensesRes] = await Promise.all([
        supabase.from('barbers').select('id, name, commission_rate').eq('shop_id', shop.id).order('name'),
        supabase.from('appointments').select('*')
          .eq('shop_id', shop.id)
          .gte('start_time', startDateIso)
          .lte('start_time', now.toISOString())
          .neq('status', 'pending'),
        supabase.from('services').select('id, name, price').eq('shop_id', shop.id),
        supabase.from('expenses').select('*')
          .eq('shop_id', shop.id)
          .gte('expense_date', startDateKey)
          .order('expense_date', { ascending: false }),
      ])

      const barbers = (barbersRes.data ?? []) as { id: string; name: string; commission_rate: number | null }[]
      const apts = (aptsRes.data ?? []) as Array<{
        id: string
        barber_id: string
        service_id: string
        start_time: string
        status: string
        price_at_booking: number | null
        payment_method: PaymentMethod | null
        commission_amount: number | null
      }>
      const services = (servicesRes.data ?? []) as { id: string; name: string; price: number }[]
      const loadedExpenses = (expensesRes.data ?? []) as Expense[]
      setExpenses(loadedExpenses)

      const totalExpensesCalculated = loadedExpenses.reduce((acc, e) => acc + Number(e.amount), 0)

      const servicePriceMap = new Map(services.map((s) => [s.id, Number(s.price)]))
      const barberMap = new Map(barbers.map((b) => [b.id, b]))

      const completedApts = apts.filter((a) => a.status === 'completed')
      const cancelledApts = apts.filter((a) => a.status === 'cancelled')

      let totalGrossRevenue = 0
      let totalCommissionsCalculated = 0

      // Métodos de pagamento
      const paymentMap = new Map<string, { count: number; total: number }>()

      for (const a of completedApts) {
        const price = a.price_at_booking ?? servicePriceMap.get(a.service_id) ?? 0
        const barber = barberMap.get(a.barber_id)
        const rate = barber?.commission_rate ?? 50
        const comm = a.commission_amount ?? ((price * rate) / 100)

        totalGrossRevenue += price
        totalCommissionsCalculated += comm

        const pMethod = a.payment_method ?? 'unspecified'
        const currP = paymentMap.get(pMethod) ?? { count: 0, total: 0 }
        currP.count += 1
        currP.total += price
        paymentMap.set(pMethod, currP)
      }

      setSummary({
        total: apts.length,
        completed: completedApts.length,
        cancelled: cancelledApts.length,
        grossRevenue: totalGrossRevenue,
        totalCommissions: totalCommissionsCalculated,
        totalExpenses: totalExpensesCalculated,
        netRevenue: totalGrossRevenue - totalCommissionsCalculated - totalExpensesCalculated,
        avgTicket: completedApts.length > 0 ? Math.round(totalGrossRevenue / completedApts.length) : 0,
      })

      // Estatísticas por Barbeiro
      const stats: BarberStats[] = barbers.map((b) => {
        const barberApts = apts.filter((a) => a.barber_id === b.id)
        const completed = barberApts.filter((a) => a.status === 'completed')
        const cancelled = barberApts.filter((a) => a.status === 'cancelled')
        const rate = b.commission_rate ?? 50

        let revenue = 0
        let commissionTotal = 0

        for (const a of completed) {
          const price = a.price_at_booking ?? servicePriceMap.get(a.service_id) ?? 0
          const comm = a.commission_amount ?? ((price * rate) / 100)
          revenue += price
          commissionTotal += comm
        }

        return {
          id: b.id,
          name: b.name,
          commissionRate: rate,
          total: barberApts.length,
          completed: completed.length,
          cancelled: cancelled.length,
          revenue,
          commissionTotal,
          shopRetained: revenue - commissionTotal,
        }
      })
      setBarberStats(stats)

      // Estatísticas por Método de Pagamento
      const pStatsList: PaymentStats[] = Array.from(paymentMap.entries()).map(([key, val]) => ({
        method: key as PaymentMethod | 'unspecified',
        label: PAYMENT_LABELS[key]?.label ?? key,
        count: val.count,
        total: val.total,
      })).sort((a, b) => b.total - a.total)
      setPaymentStats(pStatsList)

      // Estatísticas Mensais
      const monthMap = new Map<string, { total: number; revenue: number; commission: number }>()
      for (const a of apts) {
        const m = getUTC3MonthKey(a.start_time)
        const entry = monthMap.get(m) ?? { total: 0, revenue: 0, commission: 0 }
        entry.total++
        if (a.status === 'completed') {
          const price = a.price_at_booking ?? servicePriceMap.get(a.service_id) ?? 0
          const barber = barberMap.get(a.barber_id)
          const rate = barber?.commission_rate ?? 50
          const comm = a.commission_amount ?? ((price * rate) / 100)
          entry.revenue += price
          entry.commission += comm
        }
        monthMap.set(m, entry)
      }

      const months: MonthlyStats[] = Array.from(monthMap.entries())
        .map(([key, val]) => {
          const label = new Intl.DateTimeFormat('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            month: 'short',
            year: '2-digit',
          }).format(new Date(`${key}-01T12:00:00-03:00`))
          return { key, label, total: val.total, revenue: val.revenue, commission: val.commission }
        })
        .sort((a, b) => a.key.localeCompare(b.key))

      setMonthlyStats(months)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddExpense() {
    if (!shop) return
    if (!newExpenseDesc.trim() || !newExpenseAmount || parseFloat(newExpenseAmount) <= 0) {
      toast.error('Informe descrição e valor válido da despesa')
      return
    }
    setSavingExpense(true)
    try {
      const { error } = await supabase.from('expenses').insert({
        shop_id: shop.id,
        category: newExpenseCategory,
        description: newExpenseDesc.trim(),
        amount: parseFloat(newExpenseAmount),
        expense_date: newExpenseDate,
      })

      if (error) throw error

      toast.success('Despesa registrada com sucesso!')
      setNewExpenseDesc('')
      setNewExpenseAmount('')
      setExpenseModalOpen(false)
      load()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao salvar despesa')
    } finally {
      setSavingExpense(false)
    }
  }

  async function handleRemoveExpense(id: string) {
    if (!confirm('Deseja realmente excluir esta despesa?')) return
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id)
      if (error) throw error
      toast.success('Despesa removida')
      load()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao excluir despesa')
    }
  }

  const maxRevenue = Math.max(...monthlyStats.map((m) => m.revenue), 1)
  const periodLabel = PERIOD_LABELS[period] ?? 'Período'

  return (
    <PageTransition>
      <div className="p-4 sm:p-6">
        {/* Header com Saudações e Filtro de Período */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-zinc-950 shadow-lg shadow-amber-500/20">
              <BarChart3 className="size-5 font-bold" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-heading">Relatórios & Financeiro</h1>
              <p className="text-sm text-muted-foreground">Faturamento, repasse de comissões e fechamento de caixa</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400 sm:inline-flex">
              {periodLabel}
            </span>
            <Select value={period} onValueChange={(v) => v && setPeriod(v)}>
              <SelectTrigger className="w-40 border-amber-500/20">
                <SelectValue placeholder="Período">
                  {(value) => PERIOD_LABELS[value as string] ?? 'Período'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Este mês</SelectItem>
                <SelectItem value="3months">Últimos 3 meses</SelectItem>
                <SelectItem value="year">Este ano</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-2xl border border-amber-500/10 bg-card/70" />
              ))}
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="h-80 animate-pulse rounded-2xl border border-amber-500/10 bg-card/70" />
              <div className="h-80 animate-pulse rounded-2xl border border-amber-500/10 bg-card/70" />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* ── Cards de Métricas Principais ── */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Card className="border-amber-500/15 bg-card/60 backdrop-blur-xl">
                <CardContent className="flex items-center gap-3 p-4 sm:p-5">
                  <div className="flex size-10 sm:size-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 text-zinc-950 shadow-md">
                    <Calendar className="size-5 font-bold" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Agendamentos</p>
                    <p className="text-xl sm:text-2xl font-bold font-heading">{summary.total}</p>
                    <p className="text-[11px] text-muted-foreground">{summary.completed} concluídos</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-emerald-500/20 bg-emerald-500/5 backdrop-blur-xl">
                <CardContent className="flex items-center gap-3 p-4 sm:p-5">
                  <div className="flex size-10 sm:size-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-zinc-950 shadow-md">
                    <DollarSign className="size-5 font-bold" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-emerald-400">Faturamento Bruto</p>
                    <p className="text-xl sm:text-2xl font-bold text-emerald-400 font-heading">{currency.format(summary.grossRevenue)}</p>
                    <p className="text-[11px] text-muted-foreground">Serviços e Produtos</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-amber-500/20 bg-amber-500/5 backdrop-blur-xl">
                <CardContent className="flex items-center gap-3 p-4 sm:p-5">
                  <div className="flex size-10 sm:size-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-zinc-950 shadow-md">
                    <Wallet className="size-5 font-bold" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-amber-400">Comissões</p>
                    <p className="text-xl sm:text-2xl font-bold text-amber-400 font-heading">{currency.format(summary.totalCommissions)}</p>
                    <p className="text-[11px] text-muted-foreground">Repasse aos barbeiros</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-rose-500/20 bg-rose-500/5 backdrop-blur-xl">
                <CardContent className="flex items-center gap-3 p-4 sm:p-5">
                  <div className="flex size-10 sm:size-11 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-md">
                    <TrendingDown className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-rose-400">Despesas da Loja</p>
                    <p className="text-xl sm:text-2xl font-bold text-rose-400 font-heading">{currency.format(summary.totalExpenses)}</p>
                    <p className="text-[11px] text-muted-foreground">{expenses.length} lançamentos</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-green-500/30 bg-green-500/10 backdrop-blur-xl">
                <CardContent className="flex items-center gap-3 p-4 sm:p-5">
                  <div className="flex size-10 sm:size-11 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-zinc-950 shadow-md">
                    <TrendingUp className="size-5 font-bold" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-green-400">Lucro Líquido Real</p>
                    <p className="text-xl sm:text-2xl font-black text-green-400 font-heading">{currency.format(summary.netRevenue)}</p>
                    <p className="text-[11px] text-muted-foreground">Retido pela barbearia</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ── Tabela de Fechamento de Comissões por Barbeiro ── */}
            <Card className="border-amber-500/15 bg-card/60 backdrop-blur-xl shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div className="flex items-center gap-2">
                  <Users className="size-5 text-amber-400" />
                  <div>
                    <CardTitle className="text-base font-heading">Fechamento & Comissões por Barbeiro</CardTitle>
                    <p className="text-xs text-muted-foreground">Extrato detalhado de repasse e desempenho de cada profissional</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {barberStats.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">Nenhum barbeiro cadastrado ou sem atendimentos no período.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-amber-500/10 text-xs uppercase text-muted-foreground">
                          <th className="pb-3 font-semibold">Barbeiro</th>
                          <th className="pb-3 text-center font-semibold">Taxa</th>
                          <th className="pb-3 text-center font-semibold">Atendimentos</th>
                          <th className="pb-3 text-right font-semibold">Faturamento Gerado</th>
                          <th className="pb-3 text-right font-semibold text-amber-400">Repasse Barbeiro</th>
                          <th className="pb-3 text-right font-semibold text-green-400">Lucro Barbearia</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-500/10">
                        {barberStats.map((b) => (
                          <tr key={b.id} className="transition-colors hover:bg-amber-500/5">
                            <td className="py-3 font-medium">
                              <p className="text-foreground">{b.name}</p>
                              <p className="text-xs text-muted-foreground">{b.completed} concluídos · {b.cancelled} cancelados</p>
                            </td>
                            <td className="py-3 text-center">
                              <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
                                {b.commissionRate}%
                              </span>
                            </td>
                            <td className="py-3 text-center font-medium">{b.completed}</td>
                            <td className="py-3 text-right font-semibold">{currency.format(b.revenue)}</td>
                            <td className="py-3 text-right font-bold text-amber-400">
                              {currency.format(b.commissionTotal)}
                            </td>
                            <td className="py-3 text-right font-bold text-green-400">
                              {currency.format(b.shopRetained)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-amber-500/20 font-bold">
                          <td className="pt-3">Totais do Período</td>
                          <td className="pt-3 text-center">—</td>
                          <td className="pt-3 text-center">{summary.completed}</td>
                          <td className="pt-3 text-right">{currency.format(summary.grossRevenue)}</td>
                          <td className="pt-3 text-right text-amber-400">{currency.format(summary.totalCommissions)}</td>
                          <td className="pt-3 text-right text-green-400">{currency.format(summary.netRevenue)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Despesas & Saídas da Barbearia ── */}
            <Card className="border-rose-500/15 bg-card/60 backdrop-blur-xl shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div className="flex items-center gap-2">
                  <Receipt className="size-5 text-rose-400" />
                  <div>
                    <CardTitle className="text-base font-heading">Despesas & Custos da Barbearia</CardTitle>
                    <p className="text-xs text-muted-foreground">Aluguel, produtos, contas e manutenção no período</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => setExpenseModalOpen(true)}
                  className="bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-sm hover:from-rose-500 hover:to-red-500"
                >
                  <Plus className="mr-1.5 size-4" /> Nova Despesa
                </Button>
              </CardHeader>
              <CardContent>
                {expenses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center text-sm text-muted-foreground border border-dashed border-rose-500/15 rounded-xl bg-rose-500/5">
                    <p>Nenhuma despesa lançada neste período.</p>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setExpenseModalOpen(true)}
                      className="text-rose-400 mt-1"
                    >
                      + Lançar primeira despesa
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-amber-500/10 text-xs uppercase text-muted-foreground">
                          <th className="pb-3 font-semibold">Data</th>
                          <th className="pb-3 font-semibold">Categoria</th>
                          <th className="pb-3 font-semibold">Descrição</th>
                          <th className="pb-3 text-right font-semibold">Valor</th>
                          <th className="pb-3 text-right font-semibold">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-500/10">
                        {expenses.map((exp) => (
                          <tr key={exp.id} className="transition-colors hover:bg-rose-500/5">
                            <td className="py-3 text-xs text-muted-foreground">
                              {new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short' }).format(new Date(`${exp.expense_date}T12:00:00-03:00`))}
                            </td>
                            <td className="py-3">
                              <span className="rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-400">
                                {EXPENSE_CATEGORIES[exp.category] ?? exp.category}
                              </span>
                            </td>
                            <td className="py-3 font-medium text-foreground">{exp.description}</td>
                            <td className="py-3 text-right font-bold text-rose-400">
                              - {currency.format(exp.amount)}
                            </td>
                            <td className="py-3 text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveExpense(exp.id)}
                                className="size-7 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-rose-500/20 font-bold">
                          <td colSpan={3} className="pt-3">Total de Despesas</td>
                          <td className="pt-3 text-right text-rose-400">
                            - {currency.format(summary.totalExpenses)}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Formas de Pagamento & Faturamento Mensal ── */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Meios de Pagamento */}
              <Card className="border-amber-500/15 bg-card/60 backdrop-blur-xl shadow-lg">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Wallet className="size-5 text-amber-400" />
                    <CardTitle className="text-base font-heading">Entradas por Forma de Pagamento</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {paymentStats.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-amber-500/15 bg-amber-500/5 p-4 text-sm text-muted-foreground">
                      Nenhum pagamento registrado no período.
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {paymentStats.map((p) => {
                        const Icon = PAYMENT_LABELS[p.method]?.icon ?? Wallet
                        const pct = summary.grossRevenue > 0 ? Math.round((p.total / summary.grossRevenue) * 100) : 0
                        return (
                          <div key={p.method} className="space-y-1.5">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <Icon className="size-4 text-amber-400" />
                                <span className="font-medium">{p.label}</span>
                                <span className="text-xs text-muted-foreground">({p.count} transações)</span>
                              </div>
                              <div className="text-right">
                                <span className="font-semibold">{currency.format(p.total)}</span>
                                <span className="ml-2 text-xs text-muted-foreground">({pct}%)</span>
                              </div>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-amber-500/10">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Faturamento Mensal */}
              <Card className="border-amber-500/15 bg-card/60 backdrop-blur-xl shadow-lg">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="size-5 text-amber-400" />
                    <CardTitle className="text-base font-heading">Faturamento Mensal</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {monthlyStats.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-amber-500/15 bg-amber-500/5 p-4 text-sm text-muted-foreground">
                      Sem dados suficientes para montar o gráfico.
                    </div>
                  ) : (
                    <div className="flex items-end gap-3 pt-4" style={{ height: '190px' }}>
                      {monthlyStats.map((m) => {
                        const height = Math.max((m.revenue / maxRevenue) * 100, m.revenue > 0 ? 8 : 2)
                        return (
                          <div key={m.key} className="flex flex-1 flex-col items-center gap-1.5">
                            <span className="text-[10px] font-semibold text-foreground">{currency.format(m.revenue)}</span>
                            <div
                              className="w-full rounded-md bg-gradient-to-t from-amber-500 via-amber-400 to-yellow-400 shadow-sm transition-all duration-500 hover:opacity-90"
                              style={{ height: `${height}%` }}
                            />
                            <span className="text-[10px] text-muted-foreground uppercase">{m.label}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ── Leitura Rápida ── */}
            <Card className="border-amber-500/15 bg-card/60 backdrop-blur-xl shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles className="size-5 text-amber-400" />
                  <CardTitle className="text-base font-heading">Indicadores Operacionais</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-amber-500/10 bg-amber-500/5 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Taxa de Conclusão</p>
                  <p className="mt-1 text-2xl font-bold font-heading">
                    {summary.total > 0 ? Math.round((summary.completed / summary.total) * 100) : 0}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Eficiência da agenda</p>
                </div>
                <div className="rounded-xl border border-amber-500/10 bg-amber-500/5 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Taxa de Cancelamento</p>
                  <p className="mt-1 text-2xl font-bold text-rose-400 font-heading">
                    {summary.total > 0 ? Math.round((summary.cancelled / summary.total) * 100) : 0}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Faltas e desistências</p>
                </div>
                <div className="rounded-xl border border-amber-500/10 bg-amber-500/5 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Margem de Retenção Real</p>
                  <p className="mt-1 text-2xl font-bold text-green-400 font-heading">
                    {summary.grossRevenue > 0 ? Math.round((summary.netRevenue / summary.grossRevenue) * 100) : 0}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Percentual retido pós-comissão e despesas</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Modal de Nova Despesa ── */}
        <Dialog open={expenseModalOpen} onOpenChange={setExpenseModalOpen}>
          <DialogContent className="sm:max-w-md border-amber-500/20 bg-card/95 backdrop-blur-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="size-5 text-rose-400" />
                Lançar Despesa / Saída de Caixa
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Categoria</label>
                <Select value={newExpenseCategory} onValueChange={(v) => v && setNewExpenseCategory(v)}>
                  <SelectTrigger className="border-amber-500/20">
                    <SelectValue placeholder="Selecione a categoria">
                      {(value) => EXPENSE_CATEGORIES[value as string] ?? 'Categoria'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(EXPENSE_CATEGORIES).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Descrição da Despesa *</label>
                <Input
                  placeholder="Ex: Conta de luz, Compra de pomadas, Aluguel"
                  value={newExpenseDesc}
                  onChange={(e) => setNewExpenseDesc(e.target.value)}
                  className="border-amber-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Valor (R$) *</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="150.00"
                    value={newExpenseAmount}
                    onChange={(e) => setNewExpenseAmount(e.target.value)}
                    className="border-amber-500/20"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Data do Pagamento</label>
                  <Input
                    type="date"
                    value={newExpenseDate}
                    onChange={(e) => setNewExpenseDate(e.target.value)}
                    className="border-amber-500/20"
                  />
                </div>
              </div>

              <Button
                onClick={handleAddExpense}
                disabled={savingExpense}
                className="w-full bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-md hover:from-rose-500 hover:to-red-500 font-bold"
              >
                {savingExpense ? 'Salvando...' : 'Salvar Despesa'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  )
}

export default Reports
