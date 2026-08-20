import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { ListSkeleton } from '@/components/Skeleton'
import PageTransition from '@/components/PageTransition'
import { Plus, Pencil, Trash2, Package, Search, Filter, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/providers/AuthProvider'
import type { Product } from '@/types/database'

type ProductFilter = 'all' | 'active' | 'inactive' | 'low_stock'

const productSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  price: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: 'Preço de venda deve ser maior que 0',
  }),
  cost_price: z.string().refine((val) => val === '' || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0), {
    message: 'Preço de custo inválido',
  }),
  stock_quantity: z.string().refine((val) => val === '' || (!isNaN(parseInt(val, 10)) && parseInt(val, 10) >= 0), {
    message: 'Quantidade deve ser 0 ou maior',
  }),
  active: z.boolean(),
})

type ProductFormValues = z.infer<typeof productSchema>

export default function Products() {
  const { shop } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<ProductFilter>('all')

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      price: '',
      cost_price: '',
      stock_quantity: '0',
      active: true,
    },
  })

  useEffect(() => {
    if (editing) {
      form.reset({
        name: editing.name,
        price: String(editing.price),
        cost_price: editing.cost_price ? String(editing.cost_price) : '',
        stock_quantity: editing.stock_quantity !== null ? String(editing.stock_quantity) : '0',
        active: editing.active,
      })
    } else {
      form.reset({
        name: '',
        price: '',
        cost_price: '',
        stock_quantity: '0',
        active: true,
      })
    }
  }, [editing, form])

  async function load() {
    if (!shop) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('shop_id', shop.id)
        .order('name')
      if (error) throw error
      setProducts((data as Product[]) ?? [])
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar produtos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [shop?.id])

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesQuery = product.name.toLowerCase().includes(query.toLowerCase())
      let matchesFilter = true

      if (filter === 'active') matchesFilter = product.active
      if (filter === 'inactive') matchesFilter = !product.active
      if (filter === 'low_stock') matchesFilter = (product.stock_quantity ?? 0) <= 3

      return matchesQuery && matchesFilter
    })
  }, [products, query, filter])

  const metrics = useMemo(() => {
    const total = products.length
    const active = products.filter((p) => p.active).length
    const lowStock = products.filter((p) => (p.stock_quantity ?? 0) <= 3).length
    const totalStockValue = products.reduce((acc, p) => acc + p.price * (p.stock_quantity ?? 0), 0)

    return { total, active, lowStock, totalStockValue }
  }, [products])

  function reset() {
    setEditing(null)
    form.reset({
      name: '',
      price: '',
      cost_price: '',
      stock_quantity: '0',
      active: true,
    })
  }

  async function onSubmit(values: ProductFormValues) {
    if (!shop) return
    try {
      const payload = {
        name: values.name.trim(),
        price: parseFloat(values.price),
        cost_price: values.cost_price ? parseFloat(values.cost_price) : 0,
        stock_quantity: values.stock_quantity ? parseInt(values.stock_quantity, 10) : 0,
        active: values.active,
      }

      if (editing) {
        const { error } = await supabase.from('products').update(payload).eq('id', editing.id)
        if (error) throw error
        toast.success('Produto atualizado')
      } else {
        const { error } = await supabase.from('products').insert({ ...payload, shop_id: shop.id })
        if (error) throw error
        toast.success('Produto cadastrado')
      }

      reset()
      setOpen(false)
      load()
    } catch (err) {
      toast.error('Erro ao salvar produto')
      console.error(err)
    }
  }

  async function remove(id: string) {
    if (!confirm('Deseja realmente remover este produto?')) return
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) {
      toast.error('Erro ao remover produto')
    } else {
      toast.success('Produto removido')
      load()
    }
  }

  function edit(product: Product) {
    setEditing(product)
    setOpen(true)
  }

  return (
    <PageTransition>
      <div className="p-4 sm:p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-lg shadow-indigo-500/20">
              <Package className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Produtos Balcão</h1>
              <p className="text-sm text-muted-foreground">Pomadas, bebidas, óleos e cosméticos para venda na barbearia</p>
            </div>
          </div>
          <Dialog
            open={open}
            onOpenChange={(v) => {
              if (!v && form.formState.isDirty && !confirm('Você tem alterações não salvas. Deseja realmente sair?')) return
              setOpen(v)
              if (!v) reset()
            }}
          >
            <DialogTrigger>
              <Button className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md hover:from-indigo-500 hover:to-blue-500">
                <Plus className="mr-2 size-4" /> Novo Produto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editing ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Produto *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Pomada Efeito Matte 150g" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preço de Venda (R$) *</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="45.00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="cost_price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preço de Custo (R$)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="20.00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="stock_quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estoque Disponível</FormLabel>
                          <FormControl>
                            <Input type="number" step="1" placeholder="10" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="active"
                      render={({ field }) => (
                        <FormItem className="flex flex-col justify-end">
                          <label className="flex h-9 cursor-pointer items-center gap-2 text-sm font-medium">
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={(e) => field.onChange(e.target.checked)}
                              className="size-4 accent-indigo-600"
                            />
                            Produto Ativo
                          </label>
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md hover:from-indigo-500 hover:to-blue-500">
                    {editing ? 'Salvar Alterações' : 'Cadastrar Produto'}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Métricas Rápidas */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <Card className="border-indigo-500/10 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">Total de Produtos</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{metrics.total}</p>
            </CardContent>
          </Card>
          <Card className="border-indigo-500/10 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">Produtos Ativos</p>
              <p className="mt-1 text-2xl font-bold text-indigo-600 dark:text-indigo-400">{metrics.active}</p>
            </CardContent>
          </Card>
          <Card className="border-indigo-500/10 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">Estoque Baixo (≤3)</p>
              <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">{metrics.lowStock}</p>
            </CardContent>
          </Card>
          <Card className="border-indigo-500/10 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">Valor em Estoque</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.totalStockValue)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Barra de Filtros */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar produto por nome..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-muted-foreground" />
            <Select value={filter} onValueChange={(val) => setFilter(val as ProductFilter)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtro">
                  {(value) => {
                    const labels: Record<string, string> = {
                      all: 'Todos os produtos',
                      active: 'Apenas ativos',
                      inactive: 'Apenas inativos',
                      low_stock: 'Estoque baixo',
                    }
                    return labels[value as string] ?? 'Filtro'
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os produtos</SelectItem>
                <SelectItem value="active">Apenas ativos</SelectItem>
                <SelectItem value="inactive">Apenas inativos</SelectItem>
                <SelectItem value="low_stock">Estoque baixo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Lista de Produtos */}
        {loading ? (
          <ListSkeleton count={4} />
        ) : filteredProducts.length === 0 ? (
          <Card className="border-dashed border-indigo-500/20 bg-card/40">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-600 mb-4">
                <Package className="size-7" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Nenhum produto encontrado</h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-sm">
                Cadastre produtos como pomadas, óleos ou bebidas para vender e faturar mais a cada atendimento.
              </p>
              <Button
                onClick={() => { reset(); setOpen(true) }}
                className="mt-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white"
              >
                <Plus className="mr-2 size-4" /> Cadastrar Primeiro Produto
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => {
              const stock = product.stock_quantity ?? 0
              const isLowStock = stock <= 3

              return (
                <Card
                  key={product.id}
                  className={`border-indigo-500/10 bg-card/60 backdrop-blur-sm transition-all hover:border-indigo-500/30 hover:shadow-md ${!product.active ? 'opacity-60' : ''}`}
                >
                  <CardContent className="p-5 flex flex-col justify-between h-full">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-foreground text-base leading-snug">{product.name}</h3>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                            </span>
                            {product.cost_price ? (
                              <span className="text-xs text-muted-foreground">
                                (Custo: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.cost_price)})
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => edit(product)}
                            className="size-8 text-muted-foreground hover:text-indigo-600"
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(product.id)}
                            className="size-8 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={`rounded-full px-2.5 py-0.5 font-medium ${
                            product.active
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {product.active ? 'Ativo' : 'Inativo'}
                        </span>

                        <span
                          className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 font-medium ${
                            isLowStock
                              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                              : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                          }`}
                        >
                          {isLowStock && <AlertTriangle className="size-3" />}
                          Estoque: {stock} un
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </PageTransition>
  )
}
