import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PaginationProps {
  page: number
  totalPages: number
  totalItems: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, totalPages, totalItems, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  const pages: (number | '...')[] = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...')
    }
  }

  return (
    <div className="flex items-center justify-between border-t border-indigo-500/10 pt-4">
      <p className="text-xs text-muted-foreground">
        {totalItems} registro{totalItems !== 1 ? 's' : ''}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="size-8 text-muted-foreground hover:text-indigo-600 disabled:opacity-30"
        >
          <ChevronLeft className="size-4" />
        </Button>

        {pages.map((p, idx) =>
          p === '...' ? (
            <span key={`ellipsis-${idx}`} className="px-1 text-xs text-muted-foreground">
              ...
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? 'default' : 'ghost'}
              size="icon"
              onClick={() => onPageChange(p)}
              className={`size-8 text-xs ${
                p === page
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-indigo-600'
              }`}
            >
              {p}
            </Button>
          ),
        )}

        <Button
          variant="ghost"
          size="icon"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="size-8 text-muted-foreground hover:text-indigo-600 disabled:opacity-30"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
