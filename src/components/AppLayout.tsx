import { useState, useMemo } from 'react'
import { Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { useAuth } from '@/providers/AuthProvider'
import { useTheme } from '@/hooks/useTheme'
import { Button } from '@/components/ui/button'
import { buildPublicSiteUrl } from '@/lib/site'
import { useWhatsAppStatus } from '@/hooks/useWhatsAppStatus'

import { Loader2 } from 'lucide-react'
import { Sun, Moon, LogOut, Scissors, Calendar, Users, LayoutDashboard, MessageSquare, Menu, X, Contact, BarChart3, Globe, Settings, ShieldCheck, Package } from 'lucide-react'

const baseNavItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/barbers', label: 'Barbeiros', icon: Users },
  { href: '/services', label: 'Serviços', icon: Scissors },
  { href: '/products', label: 'Produtos', icon: Package },
  { href: '/clients', label: 'Clientes', icon: Contact },
  { href: '/appointments', label: 'Agendamentos', icon: Calendar },
  { href: '/reports', label: 'Relatórios', icon: BarChart3 },
]

const adminNavItems = [
  { href: '/admin', label: 'Admin', icon: ShieldCheck },
  { href: '/whatsapp', label: 'WhatsApp', icon: MessageSquare },
]

const settingsNavItem = { href: '/settings', label: 'Configurações', icon: Settings } as const

function NoShopPage({ user, signOut }: { user: import('@supabase/supabase-js').User; signOut: () => Promise<void> }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent" />
      <div className="relative max-w-md text-center">
        <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-2xl shadow-indigo-500/30">
          <Scissors className="size-10 text-white" />
        </div>
        <h1 className="mb-2 text-2xl font-black text-white">AppBarber</h1>
        <p className="mb-6 text-sm leading-relaxed text-indigo-200/70">
          Sua barbearia ainda não foi criada.
          <br />
          Entre em contato com o administrador para liberar seu acesso.
        </p>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left text-xs text-indigo-200/50">
          <p className="mb-1 font-medium text-indigo-200/80">Conta</p>
          <p className="font-mono">{user.email}</p>
        </div>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/20"
          >
            Tentar novamente
          </button>
          <button
            onClick={() => { signOut() }}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500"
          >
            Sair
          </button>
        </div>
      </div>
    </div>
  )
}

function AppLayout() {
  const { user, shop, loading, isAdmin, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { state: waState } = useWhatsAppStatus(shop?.id)
  const navItems = useMemo(() => {
    if (isAdmin && !shop) return adminNavItems
    if (isAdmin) return [...baseNavItems, ...adminNavItems, settingsNavItem]
    return baseNavItems
  }, [isAdmin, shop])

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900">
        <Loader2 className="size-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  if (!shop && !isAdmin) {
    return <NoShopPage user={user!} signOut={signOut} />
  }

  // Admin sem loja própria: só acessa páginas de admin/config
  if (isAdmin && !shop && !['/admin', '/settings', '/whatsapp'].includes(location.pathname)) {
    return <Navigate to="/admin" replace />
  }

  return (
    <div className="flex min-h-screen w-full max-w-full overflow-x-hidden">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-amber-500/15 bg-gradient-to-b from-zinc-950 via-zinc-900 to-black p-4 text-zinc-100 shadow-2xl backdrop-blur-xl transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="mb-6 flex flex-col items-center">
          <div className="relative mb-3 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 shadow-xl shadow-amber-500/25 ring-1 ring-white/20">
            <Scissors className="size-7 text-zinc-950" />
            <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-zinc-950" title="Sistema Online">
              <span className="size-1.5 rounded-full bg-white animate-pulse" />
            </span>
          </div>
          <div className="text-center">
            <h1 className="bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-400 bg-clip-text text-xl font-black tracking-tight text-transparent font-heading">
              {shop?.name || 'AppBarber'}
            </h1>
            <div className="mt-1 flex items-center justify-center gap-1.5">
              <span className="inline-block size-1.5 rounded-full bg-amber-400 animate-pulse" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-200/60">Painel Executivo</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="absolute right-2 top-2 text-zinc-400 hover:bg-white/10 hover:text-white lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="size-4" />
          </Button>
        </div>

        <nav className="flex flex-1 flex-col gap-1.5 overflow-y-auto pr-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = location.pathname === item.href
            return (
              <Button
                key={item.href}
                className={`group relative justify-start font-medium transition-all duration-200 rounded-xl ${
                  active
                    ? 'bg-gradient-to-r from-amber-500 via-amber-500 to-orange-500 text-zinc-950 shadow-lg shadow-amber-500/25 ring-1 ring-white/20 font-bold'
                    : 'bg-transparent text-zinc-300 hover:bg-white/5 hover:text-amber-300'
                }`}
                onClick={() => { navigate(item.href); setSidebarOpen(false) }}
              >
                <Icon className={`mr-2.5 size-4.5 transition-transform duration-200 group-hover:scale-110 ${active ? 'text-zinc-950 font-bold' : 'text-amber-500/70 group-hover:text-amber-400'}`} />
                <span>{item.label}</span>
                {active && (
                  <span className="ml-auto size-1.5 rounded-full bg-zinc-950 shadow-sm" />
                )}
              </Button>
            )
          })}
          {shop ? (
            <Button
              className="justify-start bg-transparent text-zinc-300 hover:bg-white/5 hover:text-amber-300 transition-all duration-200 rounded-xl"
              onClick={() => window.open(buildPublicSiteUrl(shop.public_slug), '_blank')}
            >
              <Globe className="mr-2.5 size-4.5 text-amber-500/70" /> Site Público
            </Button>
          ) : null}
        </nav>

        {/* WhatsApp Status Badge */}
        {isAdmin && waState !== 'loading' && waState !== 'unknown' && (
          <button
            onClick={() => { navigate('/whatsapp'); setSidebarOpen(false) }}
            title={waState === 'connected' ? 'WhatsApp conectado' : 'WhatsApp desconectado — clique para configurar'}
            className={`mb-3 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-200 border ${
              waState === 'connected'
                ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                : 'border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/20 animate-pulse'
            }`}
          >
            <span className={`size-2 rounded-full flex-shrink-0 ${
              waState === 'connected' ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-red-400'
            }`} />
            <MessageSquare className="size-3.5 flex-shrink-0" />
            <span className="truncate">{waState === 'connected' ? 'WhatsApp Online' : 'WhatsApp Desconectado'}</span>
          </button>
        )}

        <div className="flex items-center justify-between border-t border-amber-500/15 pt-3">
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-zinc-400 hover:bg-white/10 hover:text-amber-300 rounded-xl">
            {theme === 'dark' ? <Sun className="size-4.5 text-amber-400" /> : <Moon className="size-4.5 text-zinc-400" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => { signOut(); navigate('/login') }} className="text-zinc-400 hover:bg-rose-500/20 hover:text-rose-300 rounded-xl" title="Sair da conta">
            <LogOut className="size-4.5" />
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col min-w-0 max-w-full overflow-x-hidden lg:ml-64">
        {/* Mobile Top Bar */}
        <header className="flex items-center justify-between border-b border-amber-500/15 bg-gradient-to-r from-zinc-950 via-zinc-900 to-black px-4 py-3 text-white lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="text-amber-400 hover:text-amber-300">
            <Menu className="size-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-md">
              <Scissors className="size-4 text-zinc-950 font-bold" />
            </div>
            <div className="leading-tight">
              <p className="font-bold tracking-tight text-amber-200">AppBarber</p>
              <p className="text-[9px] font-medium uppercase tracking-[0.15em] text-amber-200/50">Executivo</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-zinc-400 hover:text-amber-300">
            {theme === 'dark' ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4" />}
          </Button>
        </header>

        <main className="flex-1 min-w-0 max-w-full">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AppLayout
