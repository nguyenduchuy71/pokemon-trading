import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { blockUser, fileReport, listBlockedUsers, unblockUser, type ReportInput } from '@/services/safety-service'
import { useCurrentUserId } from '@/stores/auth-store'

const blockedKey = (userId?: string) => ['blocked-users', userId] as const

export function useBlockedUsers() {
  const userId = useCurrentUserId()
  return useQuery({ queryKey: blockedKey(userId), queryFn: listBlockedUsers, enabled: Boolean(userId) })
}

/** Blocking changes what search, inbox and profiles return → refresh those caches. */
function useInvalidateAfterBlock() {
  const qc = useQueryClient()
  const userId = useCurrentUserId()
  return () => {
    void qc.invalidateQueries({ queryKey: blockedKey(userId) })
    void qc.invalidateQueries({ queryKey: ['marketplace'] })
    void qc.invalidateQueries({ queryKey: ['inbox'] })
    void qc.invalidateQueries({ queryKey: ['public-profile'] })
    void qc.invalidateQueries({ queryKey: ['thread-members'] })
  }
}

export function useBlockUser() {
  const userId = useCurrentUserId()
  const onSuccess = useInvalidateAfterBlock()
  return useMutation({ mutationFn: (blockedId: string) => blockUser(userId!, blockedId), onSuccess })
}

export function useUnblockUser() {
  const userId = useCurrentUserId()
  const onSuccess = useInvalidateAfterBlock()
  return useMutation({ mutationFn: (blockedId: string) => unblockUser(userId!, blockedId), onSuccess })
}

export function useFileReport() {
  const userId = useCurrentUserId()
  return useMutation({ mutationFn: (input: Omit<ReportInput, 'reporterId'>) => fileReport({ ...input, reporterId: userId! }) })
}
