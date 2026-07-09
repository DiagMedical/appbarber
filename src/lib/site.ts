function stripPort(hostname: string) {
  return hostname.split(':')[0]?.toLowerCase() ?? hostname.toLowerCase()
}

function isLocalHost(hostname: string) {
  const host = stripPort(hostname)
  return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.localhost')
}

export function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function buildPublicSlug(source: string, uniqueSeed: string) {
  const base = normalizeSlug(source) || 'barbearia'
  const seed = uniqueSeed.replace(/[^a-z0-9]/gi, '').slice(0, 8).toLowerCase() || 'site'
  return `${base}-${seed}`
}

export function shouldRenderPublicSite() {
  // O app sempre renderiza no domínio principal.
  // Site público só é acessível via rota /public/:slug no React Router.
  // O wildcard de subdomínios (ex: studiolima.meudominio.com) é para o futuro,
  // quando houver um DNS wildcard configurado com redirect para /public/:slug.
  return false
}

export function getPublicShopSlugFromLocation() {
  if (typeof window === 'undefined') return null

  const params = new URLSearchParams(window.location.search)
  const explicitSlug = params.get('shop')
  if (explicitSlug) return normalizeSlug(explicitSlug)

  const host = stripPort(window.location.hostname)
  if (isLocalHost(host)) return null

  const labels = host.split('.')
  if (labels.length < 3) return null

  const slug = labels[0]
  if (!slug || slug === 'app' || slug === 'www') return null
  return normalizeSlug(slug)
}

export function buildPublicSiteUrl(slug?: string | null) {
  const finalSlug = slug || 'barbearia'

  if (typeof window === 'undefined') {
    return `https://${finalSlug}.example.com`
  }

  if (isLocalHost(window.location.hostname)) {
    return `${window.location.origin}/public/${encodeURIComponent(finalSlug)}`
  }

  const host = stripPort(window.location.hostname)
  const labels = host.split('.')

  if (labels.length >= 3) {
    const baseDomain = labels.slice(1).join('.')
    const port = window.location.port ? `:${window.location.port}` : ''
    return `${window.location.protocol}//${finalSlug}.${baseDomain}${port}`
  }

  const port = window.location.port ? `:${window.location.port}` : ''
  return `${window.location.protocol}//${finalSlug}.${host}${port}`
}
