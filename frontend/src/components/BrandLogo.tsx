import { cn } from '@/lib/utils';

/**
 * Benevita mark: a B whose stem sprouts and whose bowls are two leaves; the upper leaf carries a
 * pulse line as its vein. Colors come from the brand tokens in index.css. Use it at 32px or more;
 * below that, use the leaf-pulse icon (favicon).
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={cn('size-8 shrink-0', className)}>
      <path d="M20 58 V15" stroke="var(--brand-seiva)" strokeWidth="6" strokeLinecap="round" />
      <path d="M20 15 C13 15 9 10 9 4 C16 4 20 9 20 15 Z" fill="var(--brand-broto)" />
      <path d="M20 16 Q45 13 43 25 Q41 33 20 33 Z" fill="var(--brand-broto)" />
      <path
        d="M22 25 h5 l2.5 -4.5 3.5 9 2.5 -4.5 h6"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M20 35 Q50 32 47 46 Q44 57 20 57 Z" fill="var(--brand-pulso)" />
    </svg>
  );
}

export function BrandLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'flex items-center gap-2 font-heading font-extrabold tracking-tight text-foreground',
        className,
      )}
    >
      <BrandMark />
      <span>Benevita</span>
    </span>
  );
}
