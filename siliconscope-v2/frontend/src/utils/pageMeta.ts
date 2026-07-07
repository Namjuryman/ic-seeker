type PageMeta = {
  title: string
  description: string
  path?: string
}

function setMeta(selector: string, attribute: string, value: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector)
  if (!element) {
    element = document.createElement('meta')
    const match = selector.match(/\[(name|property)="([^"]+)"\]/)
    if (match) element.setAttribute(match[1], match[2])
    document.head.appendChild(element)
  }
  element.setAttribute(attribute, value)
}

export function setPageMeta({ title, description, path }: PageMeta) {
  const fullTitle = title.includes('SiliconScope') ? title : `${title} | SiliconScope`
  document.title = fullTitle
  setMeta('meta[name="description"]', 'content', description)
  setMeta('meta[property="og:title"]', 'content', fullTitle)
  setMeta('meta[property="og:description"]', 'content', description)
  setMeta('meta[property="og:type"]', 'content', 'website')
  if (path) setMeta('meta[property="og:url"]', 'content', path)
}
