import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Link, type LinkProps } from 'react-router'
import { cn } from '@/utils/cn'
import { Spinner } from './spinner'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg' | 'icon'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brass text-on-brass hover:bg-brass-strong shadow-[0_1px_0_0_rgb(255_255_255/0.25)_inset]',
  secondary: 'bg-raised text-ink border border-line hover:border-line-strong',
  ghost: 'text-ink-muted hover:text-ink hover:bg-raised',
  danger: 'bg-transparent text-ember border border-ember/50 hover:bg-ember/10',
}

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
  icon: 'h-10 w-10 justify-center',
}

/** Shared by <Button> and <ButtonLink> so links look identical to buttons. */
export function buttonClasses(variant: Variant = 'primary', size: Size = 'md', className?: string): string {
  return cn(
    'inline-flex items-center justify-center rounded-full font-medium tracking-tight whitespace-nowrap',
    'transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none select-none',
    VARIANTS[variant],
    SIZES[size],
    className,
  )
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, loading, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} className={buttonClasses(variant, size, className)} disabled={disabled || loading} {...rest}>
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  )
})

interface ButtonLinkProps extends LinkProps {
  variant?: Variant
  size?: Size
}

export function ButtonLink({ variant, size, className, ...rest }: ButtonLinkProps) {
  return <Link className={buttonClasses(variant, size, typeof className === 'string' ? className : undefined)} {...rest} />
}
