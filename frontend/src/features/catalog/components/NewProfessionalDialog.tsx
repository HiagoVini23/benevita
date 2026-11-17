import { useState } from 'react';
import { toast } from 'sonner';
import { FormDialog } from '@/components/FormDialog';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BRAZILIAN_STATES,
  type BrazilianState,
  type NewProfessionalInput,
  type Professional,
} from '@/features/catalog/catalog.api';
import { reportRegistrationError } from '@/features/catalog/catalog.errors';
import { useCreateProfessional } from '@/features/catalog/catalog.hooks';

// Mirrors the backend rule (catalog.schemas.ts): CRM numbers have 4 to 7 digits.
const CRM_NUMBER_PATTERN = /^\d{4,7}$/;
const STATE_OPTIONS = BRAZILIAN_STATES.map((state) => ({ value: state, label: state }));

interface FormState {
  name: string;
  crmNumber: string;
  crmState: BrazilianState | null;
  specialty: string;
}

const EMPTY: FormState = { name: '', crmNumber: '', crmState: null, specialty: '' };

export function NewProfessionalDialog({
  onCreated,
}: {
  onCreated: (professional: Professional) => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [invalidCrm, setInvalidCrm] = useState(false);
  const createProfessional = useCreateProfessional();

  const close = () => {
    setOpen(false);
    setForm(EMPTY);
    setInvalidCrm(false);
    createProfessional.reset();
  };

  const input: NewProfessionalInput | null =
    form.name.trim() !== '' &&
    CRM_NUMBER_PATTERN.test(form.crmNumber) &&
    form.crmState !== null &&
    form.specialty.trim() !== ''
      ? {
          name: form.name.trim(),
          crmNumber: form.crmNumber,
          crmState: form.crmState,
          specialty: form.specialty.trim(),
        }
      : null;

  return (
    <FormDialog
      triggerLabel="Novo profissional"
      title="Novo profissional"
      description="Profissional responsável que assina os laudos."
      submitLabel="Cadastrar profissional"
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) setOpen(true);
        else close();
      }}
      canSubmit={input !== null}
      isPending={createProfessional.isPending}
      onSubmit={() => {
        if (input === null) return;
        createProfessional.mutate(input, {
          onError: (error) => {
            setInvalidCrm(reportRegistrationError(error, { CRM_TAKEN: 'crm' }) === 'crm');
          },
          onSuccess: (professional) => {
            toast.success(`${professional.name} cadastrado(a).`);
            onCreated(professional);
            close();
          },
        });
      }}
    >
      <Field>
        <FieldLabel htmlFor="new-professional-name">Nome</FieldLabel>
        <Input
          id="new-professional-name"
          required
          maxLength={120}
          placeholder="Ex.: Dra. Helena Marques"
          value={form.name}
          onChange={(event) => {
            setForm((current) => ({ ...current, name: event.target.value }));
          }}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-[1fr_7rem]">
        <Field>
          <FieldLabel htmlFor="new-professional-crm-number">Número do CRM</FieldLabel>
          <Input
            id="new-professional-crm-number"
            required
            inputMode="numeric"
            maxLength={7}
            placeholder="123456"
            value={form.crmNumber}
            aria-invalid={invalidCrm}
            onChange={(event) => {
              setInvalidCrm(false);
              // Only digits: the state is chosen apart and the system writes "CRM-UF número".
              const digits = event.target.value.replace(/\D/g, '');
              setForm((current) => ({ ...current, crmNumber: digits }));
            }}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="new-professional-crm-state">UF</FieldLabel>
          <Select
            items={STATE_OPTIONS}
            value={form.crmState}
            onValueChange={(state) => {
              setForm((current) => ({ ...current, crmState: state }));
            }}
          >
            <SelectTrigger id="new-professional-crm-state" className="w-full">
              <SelectValue placeholder="UF" />
            </SelectTrigger>
            <SelectContent>
              {STATE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <FieldDescription className="-mt-2">
        Informe só os números; o registro fica como{' '}
        <span className="font-medium text-foreground">
          CRM-{form.crmState ?? 'UF'} {form.crmNumber === '' ? '123456' : form.crmNumber}
        </span>
        .
      </FieldDescription>
      <Field>
        <FieldLabel htmlFor="new-professional-specialty">Especialidade</FieldLabel>
        <Input
          id="new-professional-specialty"
          required
          maxLength={80}
          placeholder="Ex.: Radiologia"
          value={form.specialty}
          onChange={(event) => {
            setForm((current) => ({ ...current, specialty: event.target.value }));
          }}
        />
      </Field>
    </FormDialog>
  );
}
