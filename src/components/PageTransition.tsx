import type { ReactNode } from 'react'

function PageTransition({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`animate-page-enter w-full min-w-0 max-w-full ${className}`}>
      {children}
    </div>
  )
}

export default PageTransition
