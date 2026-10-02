export interface FirstStepsInput {
  totalCards: number
  listed: number
  wishlist: number
  hasAvatar: boolean
  hasBio: boolean
}

export type FirstStepKey = 'step_add' | 'step_list' | 'step_wish' | 'step_profile'

export interface FirstStep {
  key: FirstStepKey
  to: string
  done: boolean
}

/** Onboarding checklist for new collectors; hidden once everything is done. */
export function firstSteps(s: FirstStepsInput): FirstStep[] {
  return [
    { key: 'step_add', to: '/cards/add', done: s.totalCards > 0 },
    { key: 'step_list', to: '/collection', done: s.listed > 0 },
    { key: 'step_wish', to: '/wishlist', done: s.wishlist > 0 },
    { key: 'step_profile', to: '/profile', done: s.hasAvatar && s.hasBio },
  ]
}
