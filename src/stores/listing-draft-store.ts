import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { PokemonCard } from '@/types/models'
import type { AddCardInput } from '@/schemas/add-card-schema'

interface ListingDraftState {
  card: PokemonCard | null
  values: AddCardInput | null
  /** Photos stay in memory only (File objects can't be serialised). */
  photos: File[]
  setCard: (card: PokemonCard | null) => void
  setValues: (values: AddCardInput) => void
  setPhotos: (photos: File[]) => void
  clear: () => void
}

/** Temporary add-card form state; survives route changes and reloads within the tab. */
export const useListingDraft = create<ListingDraftState>()(
  persist(
    (set) => ({
      card: null,
      values: null,
      photos: [],
      setCard: (card) => set({ card }),
      setValues: (values) => set({ values }),
      setPhotos: (photos) => set({ photos }),
      clear: () => set({ card: null, values: null, photos: [] }),
    }),
    {
      name: 'cardswap.listing-draft',
      storage: createJSONStorage(() => sessionStorage),
      partialize: ({ card, values }) => ({ card, values }),
    },
  ),
)
