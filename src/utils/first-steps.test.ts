import { firstSteps } from './first-steps'

it('marks steps done from collection stats', () => {
  const steps = firstSteps({ totalCards: 3, listed: 0, wishlist: 1, hasAvatar: true, hasBio: false })
  expect(steps.map((s) => [s.key, s.done])).toEqual([
    ['step_add', true],
    ['step_list', false],
    ['step_wish', true],
    ['step_profile', false],
  ])
})
