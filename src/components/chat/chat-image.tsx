import { useQuery } from '@tanstack/react-query'
import { ImageOff } from 'lucide-react'
import { signedChatImageUrl } from '@/services/storage-service'
import { Skeleton } from '@/components/ui/feedback-states'

/** Private bucket → short-lived signed URL, cached slightly shorter than its 60 min lifetime. */
export function ChatImage({ path }: { path: string }) {
  const url = useQuery({ queryKey: ['chat-image', path], queryFn: () => signedChatImageUrl(path), staleTime: 50 * 60_000, gcTime: 55 * 60_000 })

  if (url.isPending) return <Skeleton className="h-48 w-40 rounded-xl" />
  if (url.isError) {
    return (
      <div className="flex h-24 w-32 items-center justify-center rounded-xl border border-line text-ink-faint">
        <ImageOff className="h-5 w-5" aria-hidden />
      </div>
    )
  }
  return (
    <a href={url.data} target="_blank" rel="noreferrer">
      <img src={url.data} alt="" loading="lazy" onError={() => void url.refetch()} className="max-h-72 max-w-[16rem] rounded-xl border border-line object-cover" />
    </a>
  )
}
