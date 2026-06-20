import type { PropsWithChildren } from 'react'
import { Link } from 'react-router-dom'
import { authorPath, institutionPath, mentorPath, searchPath, topicPath, venuePath } from '../utils/routes'

type EntityKind = 'author' | 'institution' | 'topic' | 'venue' | 'search' | 'mentor'

interface EntityLinkProps extends PropsWithChildren {
  kind: EntityKind
  value: string
  className?: string
  params?: Record<string, string | number | boolean | null | undefined>
}

export function EntityLink({ kind, value, params, className, children }: EntityLinkProps) {
  const to =
    kind === 'author' ? authorPath(value)
    : kind === 'institution' ? institutionPath(value)
    : kind === 'topic' ? topicPath(value)
    : kind === 'venue' ? venuePath(value, params)
    : kind === 'mentor' ? mentorPath(value)
    : searchPath({ q: value, ...params })

  return (
    <Link className={className} to={to}>
      {children ?? value}
    </Link>
  )
}
