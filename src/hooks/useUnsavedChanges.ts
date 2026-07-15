import { useEffect } from 'react'
import { useBlocker } from 'react-router-dom'

/**
 * Bloqueia navegação (interna via React Router + fechar/recarregar aba)
 * quando o formulário tem alterações não salvas.
 *
 * Uso: useUnsavedChanges(form.formState.isDirty)
 */
export function useUnsavedChanges(isDirty: boolean) {
  // Bloqueia fechar / recarregar a aba do navegador
  useEffect(() => {
    if (!isDirty) return

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  // Bloqueia navegação interna (React Router)
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname,
  )

  useEffect(() => {
    if (blocker.state !== 'blocked') return
    const proceed = window.confirm(
      'Você tem alterações não salvas. Deseja realmente sair?',
    )
    if (proceed) {
      blocker.proceed()
    } else {
      blocker.reset()
    }
  }, [blocker.state])
}
