import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { LISTING_REPORT_REASONS, USER_REPORT_REASONS, type ReportReason } from '@/constants/domain'
import { useFileReport } from '@/queries/use-safety'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Field, Textarea } from '@/components/ui/form-controls'
import { toast } from '@/components/ui/toast'
import { errorKey, toAppError } from '@/utils/app-error'

type Target = { kind: 'user'; userId: string; username: string } | { kind: 'listing'; listingId: string }

interface ReportDialogProps {
  open: boolean
  onClose: () => void
  target: Target
}

export function ReportDialog({ open, onClose, target }: ReportDialogProps) {
  const { t } = useTranslation('safety')
  const { t: tc } = useTranslation()
  const reasons: readonly ReportReason[] = target.kind === 'user' ? USER_REPORT_REASONS : LISTING_REPORT_REASONS
  const [reason, setReason] = useState<ReportReason | null>(null)
  const [details, setDetails] = useState('')
  const report = useFileReport()

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!reason) return
    try {
      await report.mutateAsync({
        reason,
        details,
        ...(target.kind === 'user' ? { targetUserId: target.userId } : { targetListingId: target.listingId }),
      })
      toast.success(t('submitted'))
      setReason(null)
      setDetails('')
      onClose()
    } catch (error) {
      toast.error(toAppError(error).code === 'duplicate' ? t('duplicate') : tc(errorKey(error)))
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={target.kind === 'user' ? t('report_title_user', { username: target.username }) : t('report_title_listing')}
      description={t('report_intro')}
    >
      <form onSubmit={submit} className="space-y-4">
        <fieldset>
          <legend className="text-xs font-medium tracking-wide text-ink-muted">{t('reason')}</legend>
          <div className="mt-2 space-y-1.5">
            {reasons.map((r) => (
              <label key={r} className="flex cursor-pointer items-center gap-3 rounded-lg border border-line px-3 py-2.5 text-sm has-[:checked]:border-brass has-[:checked]:bg-brass/5">
                <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="accent-[var(--brass)]" />
                {t(`reasons.${r}`)}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label={t('details')}>
          {(p) => <Textarea {...p} value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1000} placeholder={t('details_placeholder')} />}
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            {tc('actions.cancel')}
          </Button>
          <Button type="submit" disabled={!reason} loading={report.isPending}>
            {t('submit')}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
