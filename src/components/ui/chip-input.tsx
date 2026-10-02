import { useState, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface ChipInputProps {
  id?: string
  value: string[]
  onChange: (value: string[]) => void
  max?: number
  placeholder?: string
}

/** Free-text chips (e.g. "looking for" cards). Enter/comma adds, Backspace removes last. */
export function ChipInput({ id, value, onChange, max = 10, placeholder }: ChipInputProps) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState('')

  function commit() {
    const v = draft.trim().slice(0, 60)
    if (v && !value.includes(v) && value.length < max) onChange([...value, v])
    setDraft('')
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commit()
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl border border-line bg-surface px-2 py-1.5 focus-within:border-brass">
      {value.map((chip) => (
        <span key={chip} className="inline-flex items-center gap-1 rounded-full border border-verdigris/40 bg-verdigris/10 py-0.5 pl-2.5 pr-1 text-xs text-verdigris">
          {chip}
          <button type="button" onClick={() => onChange(value.filter((c) => c !== chip))} aria-label={`${t('actions.delete')} ${chip}`} className="rounded-full p-0.5 hover:bg-verdigris/20">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      {value.length < max && (
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={commit}
          placeholder={value.length ? '' : placeholder}
          className="min-w-32 flex-1 bg-transparent px-1.5 text-sm placeholder:text-ink-faint focus:outline-none"
        />
      )}
    </div>
  )
}
