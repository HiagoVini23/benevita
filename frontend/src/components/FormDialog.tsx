import { PlusIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { FieldGroup } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';

interface FormDialogProps {
  /** Text of the small "+ Novo …" trigger shown next to a field label. */
  triggerLabel: string;
  title: string;
  description: string;
  submitLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  canSubmit: boolean;
  isPending: boolean;
  children: ReactNode;
}

/**
 * Small creation form in a modal, opened from inside another form (e.g. a new exam type while
 * booking). Server errors are shown as error toasts by each dialog, which keeps the modal open
 * with the typed values and marks the offending field. The submit event is stopped here: React
 * events bubble through portals, and the outer form must not submit when the inner one does.
 */
export function FormDialog({
  triggerLabel,
  title,
  description,
  submitLabel,
  open,
  onOpenChange,
  onSubmit,
  canSubmit,
  isPending,
  children,
}: FormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        render={
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-primary" />
        }
      >
        <PlusIcon />
        {triggerLabel}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (canSubmit && !isPending) onSubmit();
          }}
        >
          <FieldGroup>{children}</FieldGroup>
          <DialogFooter className="mt-6">
            <DialogClose render={<Button type="button" variant="outline" />}>Voltar</DialogClose>
            <Button type="submit" disabled={!canSubmit || isPending}>
              {isPending && <Spinner />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
