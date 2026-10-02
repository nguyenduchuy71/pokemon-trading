import { create } from 'zustand'
import { CheckCircle2, Info, XCircle } from 'lucide-react'
import { cn } from '@/utils/cn'

type ToastTone = 'success' | 'error' | 'info'
interface ToastItem {
  id: number
  tone: ToastTone
  message: string
  action?: { label: string; onClick: () => void }
}

interface ToastState {
  toasts: ToastItem[]
  push: (toast: Omit<ToastItem, 'id'>) => void
  dismiss: (id: number) => void
}

let nextId = 1

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (toast) => {
    const id = nextId++
    set({ toasts: [...get().toasts, { ...toast, id }] })
    setTimeout(() => get().dismiss(id), toast.action ? 6000 : 4000)
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}))

/** Imperative helpers usable from mutations/services. */
export const toast = {
  success: (message: string, action?: ToastItem['action']) => useToastStore.getState().push({ tone: 'success', message, action }),
  error: (message: string) => useToastStore.getState().push({ tone: 'error', message }),
  info: (message: string) => useToastStore.getState().push({ tone: 'info', message }),
}

const ICONS = { success: CheckCircle2, error: XCircle, info: Info }

export function Toaster() {
  const { toasts, dismiss } = useToastStore()
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6">
      {toasts.map((t) => {
        const Icon = ICONS[t.tone]
        return (
          <div key={t.id} className="card-surface pointer-events-auto flex w-full max-w-sm items-center gap-3 px-4 py-3 text-sm">
            <Icon className={cn('h-4 w-4 shrink-0', t.tone === 'success' && 'text-moss', t.tone === 'error' && 'text-ember', t.tone === 'info' && 'text-brass')} />
            <span className="flex-1">{t.message}</span>
            {t.action && (
              <button
                type="button"
                className="font-medium text-brass hover:text-brass-strong"
                onClick={() => {
                  t.action?.onClick()
                  dismiss(t.id)
                }}
              >
                {t.action.label}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
