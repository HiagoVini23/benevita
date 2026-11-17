import { CircleAlertIcon, SendIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { useProfessionals } from '@/features/catalog/useCatalog';
import { ApiError } from '@/lib/api-client';
import { formatDateTime } from '@/lib/clinic-time';
import type { SaveDraftInput, StaffReport } from './reports.api.ts';
import { usePublishReport, useSaveDraft } from './useReport.ts';

// UI limits mirroring the backend schema (backend/src/features/reports/reports.schemas.ts).
const TITLE_MAX_LENGTH = 200;
const BODY_MAX_LENGTH = 20_000;

interface ReportEditorProps {
  appointmentId: string;
  /** Latest saved draft, or `null` while the report does not exist yet. */
  draft: StaffReport | null;
  /** Exam start (ISO UTC). A report can be drafted in advance but published only afterwards. */
  examAt: string;
  /** Reference "now" for that check (epoch ms). The backend enforces the rule anyway. */
  checkedAt: number;
}

function toMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export function ReportEditor({ appointmentId, draft, examAt, checkedAt }: ReportEditorProps) {
  const [title, setTitle] = useState(draft?.title ?? '');
  const [body, setBody] = useState(draft?.body ?? '');
  const [professionalId, setProfessionalId] = useState<string | null>(
    draft?.professional.id ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const professionals = useProfessionals();
  const saveDraft = useSaveDraft(appointmentId);
  const publish = usePublishReport(appointmentId);

  const professionalOptions = (professionals.data ?? []).map((professional) => ({
    value: professional.id,
    label: `${professional.name} · ${professional.specialty}`,
  }));
  // The backend trims title and body, so the form compares and sends trimmed values.
  const trimmedTitle = title.trim();
  const trimmedBody = body.trim();
  const hasKnownProfessional = professionalOptions.some(({ value }) => value === professionalId);
  const values: SaveDraftInput | null =
    trimmedTitle !== '' && trimmedBody !== '' && professionalId !== null && hasKnownProfessional
      ? { title: trimmedTitle, body: trimmedBody, professionalId }
      : null;
  // With no draft yet, `draft?.title` is undefined, so everything counts as unsaved.
  const hasUnsavedChanges =
    draft?.title !== trimmedTitle ||
    draft.body !== trimmedBody ||
    draft.professional.id !== professionalId;
  const isBusy = saveDraft.isPending || publish.isPending;
  const examHasHappened = new Date(examAt).getTime() <= checkedAt;

  const handleSave = async () => {
    if (values === null) return;
    setError(null);
    try {
      await saveDraft.mutateAsync(values);
      toast.success('Rascunho salvo. Ele fica visível apenas para a equipe.');
    } catch (saveError) {
      setError(toMessage(saveError, 'Não foi possível salvar o rascunho.'));
    }
  };

  /** Publishing always sends the current text: unsaved edits are saved first, then frozen. */
  const handlePublish = async () => {
    if (values === null) return;
    setError(null);
    try {
      if (hasUnsavedChanges) await saveDraft.mutateAsync(values);
      await publish.mutateAsync();
      toast.success('Laudo publicado. O paciente já pode acessá-lo.');
    } catch (publishError) {
      setError(toMessage(publishError, 'Não foi possível publicar o laudo.'));
    } finally {
      setConfirmOpen(false);
    }
  };

  const statusText =
    draft === null
      ? 'O rascunho fica visível apenas para a equipe até ser publicado.'
      : `Rascunho salvo em ${formatDateTime(draft.updatedAt)}${
          hasUnsavedChanges ? ' · há alterações não salvas' : ''
        }.`;

  return (
    <Card>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void handleSave();
        }}
      >
        <CardContent>
          <FieldGroup>
            {error !== null && (
              <Alert variant="destructive">
                <CircleAlertIcon />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {professionals.isError && (
              <Alert variant="destructive">
                <CircleAlertIcon />
                <AlertDescription>
                  Não foi possível carregar os profissionais: {professionals.error.message}
                </AlertDescription>
              </Alert>
            )}
            <Field>
              <FieldLabel htmlFor="report-title">Título</FieldLabel>
              <Input
                id="report-title"
                required
                value={title}
                maxLength={TITLE_MAX_LENGTH}
                placeholder="Ex.: Raio-X de tórax PA e perfil"
                onChange={(event) => {
                  setTitle(event.target.value);
                }}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="report-professional">Profissional responsável</FieldLabel>
              <Select
                items={professionalOptions}
                value={professionalId}
                onValueChange={setProfessionalId}
                disabled={!professionals.isSuccess}
              >
                <SelectTrigger id="report-professional" aria-required="true" className="w-full">
                  <SelectValue
                    placeholder={
                      professionals.isPending ? 'Carregando…' : 'Selecione o profissional'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {professionalOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="report-body">Texto do laudo</FieldLabel>
              <Textarea
                id="report-body"
                required
                value={body}
                rows={14}
                maxLength={BODY_MAX_LENGTH}
                className="leading-relaxed"
                onChange={(event) => {
                  setBody(event.target.value);
                }}
              />
              <FieldDescription>{statusText}</FieldDescription>
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter className="mt-6 flex flex-wrap items-center justify-end gap-2">
          {values === null && (
            <p className="mr-auto text-sm text-muted-foreground">
              Preencha título, profissional e texto para salvar ou publicar.
            </p>
          )}
          {values !== null && !examHasHappened && (
            <p className="mr-auto text-sm text-muted-foreground">
              A publicação fica disponível a partir de {formatDateTime(examAt)}, horário do exame.
            </p>
          )}
          <Button
            type="submit"
            variant="outline"
            disabled={values === null || !hasUnsavedChanges || isBusy}
          >
            {saveDraft.isPending && !publish.isPending && <Spinner />}
            Salvar rascunho
          </Button>
          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogTrigger
              render={<Button disabled={values === null || isBusy || !examHasHappened} />}
            >
              <SendIcon />
              Publicar
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Publicar laudo?</AlertDialogTitle>
                <AlertDialogDescription>
                  O laudo ficará disponível para o paciente e não poderá mais ser editado.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Voltar</AlertDialogCancel>
                <Button
                  onClick={() => {
                    void handlePublish();
                  }}
                  disabled={isBusy}
                >
                  {isBusy && <Spinner />}
                  Publicar laudo
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </form>
    </Card>
  );
}
