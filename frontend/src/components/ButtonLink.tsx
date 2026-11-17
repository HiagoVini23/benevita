import type { VariantProps } from 'class-variance-authority';
import { Link, type LinkProps } from 'react-router';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ButtonLinkProps = LinkProps & VariantProps<typeof buttonVariants>;

/** A real link styled as a button, so screen readers and middle-click treat it as a link. */
export function ButtonLink({ variant, size, className, ...props }: ButtonLinkProps) {
  return (
    <Link
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
