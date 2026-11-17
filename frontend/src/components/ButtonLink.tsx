import type { VariantProps } from 'class-variance-authority';
import { Link, type LinkProps } from 'react-router';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ButtonLinkProps = LinkProps & VariantProps<typeof buttonVariants>;

/**
 * Navigation that looks like a button. It stays a real link (`<a>`, role "link") for screen
 * readers and middle-click, instead of a button rendered as an anchor.
 */
export function ButtonLink({ variant, size, className, ...props }: ButtonLinkProps) {
  return (
    <Link
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
