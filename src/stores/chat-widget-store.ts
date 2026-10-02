import { create } from 'zustand'

/** Messenger-style chat popup: closed, showing the inbox, or showing one thread. */
interface ChatWidgetState {
  open: boolean
  conversationId: string | null
  openInbox: () => void
  openThread: (conversationId: string) => void
  back: () => void
  close: () => void
  toggle: () => void
}

export const useChatWidget = create<ChatWidgetState>()((set) => ({
  open: false,
  conversationId: null,
  openInbox: () => set({ open: true, conversationId: null }),
  openThread: (conversationId) => set({ open: true, conversationId }),
  back: () => set({ conversationId: null }),
  close: () => set({ open: false }),
  toggle: () => set((s) => ({ open: !s.open })),
}))
