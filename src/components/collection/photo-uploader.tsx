import { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Camera, ImagePlus, X } from 'lucide-react'
import { ACCEPTED_INPUT_TYPES, ImageInputError, validateImageFile } from '@/utils/image-processing'
import { useAppLimits } from '@/queries/use-app-limits'
import { toast } from '@/components/ui/toast'
import { cn } from '@/utils/cn'

interface ExistingPhoto {
  id: string
  url: string
}

interface PhotoUploaderProps {
  files: File[]
  onFilesChange: (files: File[]) => void
  existing?: ExistingPhoto[]
  onRemoveExisting?: (id: string) => void
  error?: string
}

/** New photos are previewed locally; processing/upload happens on submit. */
export function PhotoUploader({ files, onFilesChange, existing = [], onRemoveExisting, error }: PhotoUploaderProps) {
  const { t } = useTranslation('collection')
  const pickRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files])
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews])

  const { maxPhotosPerItem } = useAppLimits()
  const remaining = maxPhotosPerItem - existing.length - files.length

  function accept(list: FileList | null) {
    if (!list) return
    const valid: File[] = []
    for (const file of Array.from(list)) {
      try {
        validateImageFile(file)
        valid.push(file)
      } catch (e) {
        if (e instanceof ImageInputError) toast.error(t('photos.invalid'))
      }
    }
    if (valid.length > remaining) toast.info(t('photos.max', { count: maxPhotosPerItem }))
    onFilesChange([...files, ...valid.slice(0, Math.max(remaining, 0))])
  }

  const tile = 'relative aspect-[63/88] overflow-hidden rounded-[10px] border border-line bg-raised'

  return (
    <fieldset>
      <legend className="text-xs font-medium tracking-wide text-ink-muted">{t('photos.title')}</legend>
      <p className="mt-1 text-xs text-ink-faint">{t('photos.hint')}</p>
      <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
        {existing.map((p) => (
          <div key={p.id} className={tile}>
            <img src={p.url} alt="" className="h-full w-full object-cover" />
            {onRemoveExisting && (
              <button type="button" onClick={() => onRemoveExisting(p.id)} className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white" aria-label={t('photos.remove')}>
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
        {previews.map((url, i) => (
          <div key={url} className={tile}>
            <img src={url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onFilesChange(files.filter((_, j) => j !== i))}
              className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white"
              aria-label={t('photos.remove')}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {remaining > 0 && (
          <>
            <button type="button" onClick={() => pickRef.current?.click()} className={cn(tile, 'flex flex-col items-center justify-center gap-1.5 border-dashed text-ink-faint hover:border-brass hover:text-brass', error && 'border-ember')}>
              <ImagePlus className="h-5 w-5" aria-hidden />
              <span className="text-[11px]">{t('photos.add')}</span>
            </button>
            <button type="button" onClick={() => cameraRef.current?.click()} className={cn(tile, 'flex flex-col items-center justify-center gap-1.5 border-dashed text-ink-faint hover:border-brass hover:text-brass sm:hidden')}>
              <Camera className="h-5 w-5" aria-hidden />
              <span className="text-[11px]">{t('photos.camera')}</span>
            </button>
          </>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-ember">{error}</p>}
      <input ref={pickRef} type="file" accept={ACCEPTED_INPUT_TYPES.join(',')} multiple className="sr-only" tabIndex={-1} onChange={(e) => { accept(e.target.files); e.target.value = '' }} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} onChange={(e) => { accept(e.target.files); e.target.value = '' }} />
    </fieldset>
  )
}
