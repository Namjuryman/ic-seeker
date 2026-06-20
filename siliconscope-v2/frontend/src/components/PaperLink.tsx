import type { MouseEventHandler } from 'react'
import { Link } from 'react-router-dom'
import { paperPath } from '../utils/routes'

interface PaperLinkProps {
  id?: number | string | null
  title: string
  className?: string
  onClick?: MouseEventHandler<HTMLAnchorElement>
}

export function PaperLink({ id, title, className, onClick }: PaperLinkProps) {
  if (!id) return <span className={className}>{title}</span>
  return (
    <Link className={className} to={paperPath(id)} onClick={onClick}>
      {title}
    </Link>
  )
}
