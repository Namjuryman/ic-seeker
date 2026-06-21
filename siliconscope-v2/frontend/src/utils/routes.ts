export type SearchParamsInput = Record<string, string | number | boolean | null | undefined>

function cleanEntries(params: SearchParamsInput) {
  return Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
}

export function searchPath(params: SearchParamsInput = {}) {
  const query = new URLSearchParams()
  for (const [key, value] of cleanEntries(params)) {
    query.set(key, String(value))
  }
  const qs = query.toString()
  return qs ? `/?${qs}` : '/'
}

export function paperPath(id: number | string) {
  return `/papers/${encodeURIComponent(String(id))}`
}

export function authorPath(name: string) {
  return `/authors/${encodeURIComponent(name)}`
}

export function institutionPath(name: string) {
  return `/institutions/${encodeURIComponent(name)}`
}

export function topicPath(field: string) {
  return `/topics?field=${encodeURIComponent(field)}`
}

export function mentorPath(name: string, kind: 'institution' | 'author' = 'author') {
  return kind === 'institution'
    ? `/mentors/institutions/${encodeURIComponent(name)}`
    : `/mentors/authors/${encodeURIComponent(name)}`
}

export function venuePath(venue: string, extras: SearchParamsInput = {}) {
  return searchPath({ ...extras, venue })
}

export function learningPath() {
  return "/learning"
}

export function roadmapPath(slug: string) {
  return `/learning/roadmaps/${encodeURIComponent(slug)}`
}

export function lessonPath(id: string) {
  return `/learning/lessons/${encodeURIComponent(id)}`
}

export function todayLessonPath() {
  return "/learning/today"
}

export function companyPath(id: string) {
  return `/companies/${encodeURIComponent(id)}`
}
