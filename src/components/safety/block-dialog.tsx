import { useTranslation } from 'react-i18next'
import { useBlockUser } from '@/queries/use-safety'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { errorKey, toAppError } from '@/utils/app-error'

interface BlockDialogProps {
  open: boolean
  onClose: () => void
  userId: string
  username: string
  onBlocked?: () => void
}

export function BlockDialog({ open, onClose, userId, username, onBlocked }: BlockDialogProps) {
  const { t } = useTranslation('safety')
  const { t: tc } = useTranslation()
  const block = useBlockUser()

  async function confirm() {
    try {
      await block.mutateAsync(userId)
      toast.success(t('blocked_done', { username }))
      onClose()
      onBlocked?.()
    } catch (error) {
      // Already blocked counts as success from the user's point of view.
      if (toAppError(error).code === 'duplicate') onClose()
      else toast.error(tc(errorKey(error)))
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('block_title', { username })}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {tc('actions.cancel')}
          </Button>
          <Button variant="danger" onClick={() => void confirm()} loading={block.isPending}>
            {tc('actions.block')}
          </Button>
        </>
      }
    >
      <p className="text-sm text-ink-muted">{t('block_body')}</p>
    </Dialog>
  )
}
