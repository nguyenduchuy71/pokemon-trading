import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getProfile, updateProfile, type ProfileUpdate } from '@/services/profile-service'
import { useCurrentUserId } from '@/stores/auth-store'

export const meKey = (userId?: string) => ['me', userId] as const

/** The signed-in collector's own profile (null-safe when signed out). */
export function useMe() {
  const userId = useCurrentUserId()
  return useQuery({
    queryKey: meKey(userId),
    queryFn: () => getProfile(userId!),
    enabled: Boolean(userId),
    staleTime: 5 * 60_000,
  })
}

export function useUpdateMe() {
  const userId = useCurrentUserId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: ProfileUpdate) => updateProfile(userId!, patch),
    onSuccess: (profile) => {
      qc.setQueryData(meKey(userId), profile)
      void qc.invalidateQueries({ queryKey: ['public-profile'] })
    },
  })
}
