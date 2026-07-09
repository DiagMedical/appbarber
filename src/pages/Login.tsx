import { useState } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ShieldCheck, Scissors, Clock3, MessageSquare } from 'lucide-react'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const { signIn, signUp, user } = useAuth()
  const navigate = useNavigate()

  if (user) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')

    try {
      if (isRegister) {
        await signUp(email, password)
        setMessage('Conta criada. Verifique seu email para confirmar.')
      } else {
        await signIn(email, password)
        navigate('/')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro')
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent" />
      <div className="relative grid w-full max-w-5xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="hidden rounded-3xl border border-white/10 bg-white/5 p-8 text-white shadow-2xl shadow-indigo-500/10 backdrop-blur lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="mb-6 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg shadow-indigo-500/30">
              <Scissors className="size-8 text-white" />
            </div>
            <h1 className="mb-3 text-4xl font-black tracking-tight">AppBarber</h1>
            <p className="max-w-md text-sm leading-6 text-indigo-100/80">
              Operação diária de barbearias com agenda clara, confirmação automática e controle do que realmente importa.
            </p>
          </div>
          <div className="grid gap-3 text-sm text-indigo-100/80">
            {[
              { icon: Clock3, text: 'Agenda e disponibilidade em tempo real' },
              { icon: MessageSquare, text: 'Confirmações e lembretes via WhatsApp' },
              { icon: ShieldCheck, text: 'Fluxo confiável para operação diária' },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div key={item.text} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-white/10">
                    <Icon className="size-4" />
                  </div>
                  <span>{item.text}</span>
                </div>
              )
            })}
          </div>
        </div>

        <Card className="animate-scale-in relative w-full max-w-xl border-indigo-500/20 bg-white/95 shadow-2xl shadow-indigo-500/10 backdrop-blur dark:bg-gray-950/95">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg shadow-indigo-500/30">
              <Scissors className="size-8 text-white" />
            </div>
            <CardTitle className="bg-gradient-to-r from-indigo-700 to-blue-700 bg-clip-text text-3xl font-black tracking-tight text-transparent dark:from-indigo-300 dark:to-blue-300">
              AppBarber
            </CardTitle>
            <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-muted-foreground/60">Sistema de Gestão</p>
            <CardDescription>
              {isRegister ? 'Crie sua conta para começar' : 'Entre para continuar a operação'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">Email</label>
                <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="border-indigo-500/20 focus:ring-indigo-500" />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">Senha</label>
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="border-indigo-500/20 focus:ring-indigo-500" />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              {message && <p className="text-sm text-emerald-500">{message}</p>}
              <Button type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md hover:from-indigo-500 hover:to-blue-500">
                {isRegister ? 'Criar conta' : 'Entrar'}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              {isRegister ? 'Já tem conta?' : 'Não tem conta?'}{' '}
              <button
                type="button"
                className="font-medium text-indigo-600 underline underline-offset-4 transition-colors hover:text-indigo-500 dark:text-indigo-400"
                onClick={() => { setIsRegister(!isRegister); setError(''); setMessage('') }}
              >
                {isRegister ? 'Fazer login' : 'Cadastre-se'}
              </button>
            </p>
            <div className="mt-5 rounded-2xl border border-indigo-500/10 bg-indigo-500/5 p-4 text-xs text-muted-foreground">
              Dark mode, horários em UTC-3 e foco operacional desde a entrada.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Login
