import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Field, Input, Textarea } from '@/components/ui/form-controls'

export interface BinderFormValues {
  name: string
  description: string
  is_public: boolean
}

interface BinderDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (values: BinderFormValues) => Promise<void>
  initial?: BinderFormValues
  title: string
}

/** Create / rename a binder. */
export function BinderDialog({ open, onClose, onSubmit, initial, title }: BinderDialogProps) {
  const { t } = useTranslation('collection')
  const { t: tc } = useTranslation()
  const [values, setValues] = useState<BinderFormValues>(initial ?? { name: '', description: '', is_public: true })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setValues(initial ?? { name: '', description: '', is_public: true })
  }, [open, initial])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!values.name.trim()) return
    setSaving(true)
    try {
      await onSubmit({ ...values, name: values.name.trim(), description: values.description.trim() })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <form onSubmit={submit} className="space-y-4">
        <Field label={t('page.binder_name')}>
          {(p) => <Input {...p} value={values.name} maxLength={60} required autoFocus onChange={(e) => setValues({ ...values, name: e.target.value })} placeholder="Trade Binder, 151, Vintage…" />}
        </Field>
        <Field label={t('page.binder_description')}>
          {(p) => <Textarea {...p} value={values.description} maxLength={300} className="min-h-16" onChange={(e) => setValues({ ...values, description: e.target.value })} />}
        </Field>
        <label className="flex items-center gap-3 text-sm text-ink-muted">
          <input type="checkbox" checked={values.is_public} onChange={(e) => setValues({ ...values, is_public: e.target.checked })} className="h-4 w-4 accent-[var(--brass)]" />
          {t('page.binder_public')}
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            {tc('actions.cancel')}
          </Button>
          <Button type="submit" loading={saving} disabled={!values.name.trim()}>
            {tc('actions.save')}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
