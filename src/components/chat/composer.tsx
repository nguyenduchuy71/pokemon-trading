import { useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { ImagePlus, Layers, SendHorizontal } from 'lucide-react'
import { ACCEPTED_INPUT_TYPES, ImageInputError, validateImageFile } from '@/utils/image-processing'
import { toast } from '@/components/ui/toast'
import { ShareListingSheet } from './share-listing-sheet'

const MAX = 2000

interface ComposerProps {
  onSendText: (body: string) => void
  onSendPhoto: (file: File) => void
  onShareListing: (listingId: string) => void
  disabled?: boolean
}

/** Enter sends, Shift+Enter adds a newline (desktop); explicit send button everywhere. */
export function Composer({ onSendText, onSendPhoto, onShareListing, disabled }: ComposerProps) {
  const { t } = useTranslation('chat')
  const [text, setText] = useState('')
  const [sharing, setSharing] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const areaRef = useRef<HTMLTextAreaElement>(null)

  function send() {
    const body = text.trim()
    if (!body || disabled) return
    onSendText(body.slice(0, MAX))
    setText('')
    areaRef.current?.focus()
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia('(pointer: fine)').matches) {
      e.preventDefault()
      send()
    }
  }

  function pickPhoto(file?: File) {
    if (!file) return
    try {
      validateImageFile(file)
      onSendPhoto(file)
    } catch (e) {
      if (e instanceof ImageInputError) toast.error(t('collection:photos.invalid'))
    }
  }

  return (
    <div className="border-t border-line bg-bg/95 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur-md">
      <div className="flex items-end gap-2">
        <button type="button" onClick={() => fileRef.current?.click()} disabled={disabled} className="rounded-full p-2.5 text-ink-muted hover:bg-raised hover:text-ink" aria-label={t('attach_photo')}>
          <ImagePlus className="h-5 w-5" />
        </button>
        <button type="button" onClick={() => setSharing(true)} disabled={disabled} className="rounded-full p-2.5 text-ink-muted hover:bg-raised hover:text-ink" aria-label={t('share_listing')}>
          <Layers className="h-5 w-5" />
        </button>
        <label className="relative flex-1">
          <span className="sr-only">{t('placeholder')}</span>
          <textarea
            ref={areaRef}
            rows={1}
            value={text}
            maxLength={MAX}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t('placeholder')}
            className="field-sizing-content max-h-40 min-h-11 w-full resize-none rounded-2xl border border-line bg-surface px-4 py-2.5 text-sm placeholder:text-ink-faint focus:border-brass focus:outline-none"
          />
          {text.length > 1800 && <span className="absolute bottom-1 right-3 font-mono text-[10px] text-ink-faint">{MAX - text.length}</span>}
        </label>
        <button type="button" onClick={send} disabled={!text.trim() || disabled} className="rounded-full bg-brass p-2.5 text-on-brass transition-opacity disabled:opacity-40" aria-label={t('send')}>
          <SendHorizontal className="h-5 w-5" />
        </button>
      </div>
      <input ref={fileRef} type="file" accept={ACCEPTED_INPUT_TYPES.join(',')} className="sr-only" tabIndex={-1} onChange={(e) => { pickPhoto(e.target.files?.[0]); e.target.value = '' }} />
      <ShareListingSheet
        open={sharing}
        onClose={() => setSharing(false)}
        onPick={(id) => {
          setSharing(false)
          onShareListing(id)
        }}
      />
    </div>
  )
}
