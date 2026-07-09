# Refinamento Visual — Site Público (Estilo Sancho)

## Tipografia
- **Títulos:** DM Serif Display (Google Fonts)
- **Corpo:** Inter (Google Fonts)

## Paleta
- Fundo: `#0a0a0a` (neutral-950)
- Cards: `bg-white/[0.03] border-white/[0.06]`
- Texto: `text-neutral-100` / `text-neutral-400`
- Botões CTA: `bg-white text-neutral-900`
- Sem índigo/azul — só preto, branco e cinza

## Layout (7 seções)
1. Hero — fullscreen, foto fundo, overlay, CTAs
2. Serviços — grid 3 col, card com nome + descrição + preço
3. Equipe — grid 2-3 col, foto circular grande
4. Galeria — grid 3 col, hover zoom
5. Localização + Horários — 2 col, maps + tabela
6. Agendamento — formulário limpo, summary sticky
7. Footer — logo, redes, copyright

## Animações
- fade-in-up nas seções ao scroll (Intersection Observer)
- Hover suave em cards e galeria
- Transições em inputs e slots

## Arquivos alterados
- index.html — Google Fonts
- src/index.css — font-family + animações globais
- src/pages/PublicSite.tsx — reescrita visual
