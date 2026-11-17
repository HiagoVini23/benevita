import { cn } from '@/lib/utils';

/** Detailed mark for 32px or more; smaller sizes use the favicon. */
export function BrandMark({ className }: { className?: string }) {
  return (
    // The viewBox is cropped to the drawing so the B sits at the same height as the wordmark.
    <svg viewBox="6 1 46 62" aria-hidden="true" className={cn('h-8 w-auto shrink-0', className)}>
      <path d="M20 58 V15" stroke="var(--mark-stem)" strokeWidth="6" strokeLinecap="round" />
      <path d="M20 15 C13 15 9 10 9 4 C16 4 20 9 20 15 Z" fill="var(--mark-leaf)" />
      <path d="M20 16 Q45 13 43 25 Q41 33 20 33 Z" fill="var(--mark-leaf)" />
      <path
        d="M22 25 h5 l2.5 -4.5 3.5 9 2.5 -4.5 h6"
        fill="none"
        stroke="var(--mark-vein)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M20 35 Q50 32 47 46 Q44 57 20 57 Z" fill="var(--mark-deep)" />
    </svg>
  );
}

export function BrandLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'flex items-center gap-1.5 font-heading font-extrabold tracking-tight',
        className,
      )}
    >
      <BrandMark />
      {/* Bene in the stem color, vita in the leaf color: the name echoes the mark. */}
      <span>
        <span className="text-foreground">Bene</span>
        <span className="text-primary">vita</span>
      </span>
    </span>
  );
}
