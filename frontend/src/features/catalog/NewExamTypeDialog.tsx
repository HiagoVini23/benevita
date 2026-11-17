import { useState } from 'react';
import { toast } from 'sonner';
import { FormDialog } from '@/components/FormDialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { ExamType } from './catalog.api.ts';
import { reportRegistrationError } from './registration-error.ts';
import { useCreateExamType } from './useCatalog.ts';

export function NewExamTypeDialog({ onCreated }: { onCreated: (examType: ExamType) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [invalid, setInvalid] = useState(false);
  const createExamType = useCreateExamType();

  const close = () => {
    setOpen(false);
    setName('');
    setInvalid(false);
    createExamType.reset();
  };

  return (
    <FormDialog
      triggerLabel="Novo exame"
      title="Novo tipo de exame"
      description="O tipo fica disponível para todos os agendamentos."
      submitLabel="Cadastrar exame"
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) setOpen(true);
        else close();
      }}
      canSubmit={name.trim() !== ''}
      isPending={createExamType.isPending}
      onSubmit={() => {
        createExamType.mutate(
          { name: name.trim() },
          {
            onError: (error) => {
              setInvalid(reportRegistrationError(error, { EXAM_TYPE_EXISTS: 'name' }) === 'name');
            },
            onSuccess: (examType) => {
              toast.success(`Tipo de exame "${examType.name}" cadastrado.`);
              onCreated(examType);
              close();
            },
          },
        );
      }}
    >
      <Field>
        <FieldLabel htmlFor="new-exam-type-name">Nome do exame</FieldLabel>
        <Input
          id="new-exam-type-name"
          required
          maxLength={80}
          placeholder="Ex.: Mamografia"
          value={name}
          aria-invalid={invalid}
          onChange={(event) => {
            setName(event.target.value);
            setInvalid(false);
          }}
        />
      </Field>
    </FormDialog>
  );
}
