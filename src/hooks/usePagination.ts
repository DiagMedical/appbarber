import { useMemo, useState } from 'react'

interface UsePaginationResult<T> {
  page: number
  setPage: (page: number) => void
  totalPages: number
  pageItems: T[]
  totalItems: number
}

export function usePagination<T>(
  items: T[],
  pageSize: number = 20,
): UsePaginationResult<T> {
  const [page, setPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))

  const safePage = Math.min(page, totalPages)

  const pageItems = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize],
  )

  return {
    page: safePage,
    setPage: (p: number) => setPage(Math.max(1, Math.min(p, totalPages))),
    totalPages,
    pageItems,
    totalItems: items.length,
  }
}
