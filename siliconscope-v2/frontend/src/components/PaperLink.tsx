import type { MouseEventHandler, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { paperPath } from '../utils/routes'

interface PaperLinkProps {
  id?: number | string | null
  title: string
  className?: string
  children?: ReactNode
  onClick?: MouseEventHandler<HTMLAnchorElement>
}

export function PaperLink({ id, title, className, children, onClick }: PaperLinkProps) {
  if (!id) return <span className={className}>{children || title}</span>
  return (
    <Link className={className} to={paperPath(id)} onClick={onClick} title={title}>
      {children || title}
    </Link>
  )
}
