import { useState, useRef, useEffect, useCallback } from 'react'

interface AutocompleteOption {
  label: string
  value: string
  subtitle?: string
}

interface AutocompleteInputProps {
  value: string
  onChange: (value: string) => void
  onSelect: (value: string) => void
  options: AutocompleteOption[]
  placeholder?: string
  disabled?: boolean
  loading?: boolean
}

export function AutocompleteInput({
  value,
  onChange,
  onSelect,
  options,
  placeholder,
  disabled,
  loading,
}: AutocompleteInputProps) {
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = options.filter((opt) =>
    opt.label.toLowerCase().includes(value.trim().toLowerCase())
  )

  const showDropdown = open && (loading || filtered.length > 0 || value.trim().length > 0)

  const handleSelect = useCallback(
    (val: string) => {
      onSelect(val)
      setOpen(false)
      setHighlighted(-1)
    },
    [onSelect]
  )

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  useEffect(() => {
    if (open) {
      setHighlighted(filtered.length > 0 ? 0 : -1)
    }
  }, [open, filtered.length])

  return (
    <div ref={containerRef} className="relative flex-1">
      <input
        type="text"
        value={value}
        disabled={disabled || loading}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => {
          if (value.trim().length > 0) setOpen(true)
        }}
        onKeyDown={(e) => {
          if (!open) return
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setHighlighted((prev) => (prev + 1) % filtered.length)
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setHighlighted((prev) => (prev - 1 + filtered.length) % filtered.length)
          } else if (e.key === 'Enter') {
            e.preventDefault()
            if (highlighted >= 0 && filtered[highlighted]) {
              handleSelect(filtered[highlighted].value)
            }
          } else if (e.key === 'Escape') {
            setOpen(false)
          }
        }}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border border-line bg-surface-elevated text-sm text-ink-text focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-300 disabled:opacity-50"
      />
      {showDropdown && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-line bg-surface-panel shadow-lg">
          {loading && (
            <div className="px-3 py-2 text-sm text-ink-muted">
              加载中...
            </div>
          )}
          {!loading && filtered.length > 0 && filtered.slice(0, 20).map((opt, idx) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleSelect(opt.value)}
              onMouseEnter={() => setHighlighted(idx)}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                idx === highlighted
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-ink-secondary hover:bg-surface-elevated'
              }`}
            >
              <div className="font-medium">{opt.label}</div>
              {opt.subtitle && (
                <div className="text-xs text-ink-subtle">{opt.subtitle}</div>
              )}
            </button>
          ))}
          {!loading && value.trim().length > 0 && filtered.length === 0 && (
            <div className="px-3 py-2 text-sm text-ink-muted">
              未找到匹配项
            </div>
          )}
        </div>
      )}
    </div>
  )
}
