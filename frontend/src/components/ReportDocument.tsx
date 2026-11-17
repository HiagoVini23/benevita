import type { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface ReportDocumentProps {
  title: string;
  body: string;
  professional: { name: string; crm: string; specialty: string };
  /** Status line under the body, e.g. who published it and when. */
  footer?: ReactNode;
}

/**
 * Read-only rendering of a report, laid out like the document a patient receives. Used by the
 * staff report page and the patient portal.
 */
export function ReportDocument({ title, body, professional, footer }: ReportDocumentProps) {
  return (
    <Card>
      <CardHeader>
        <h2 className="font-heading text-xl font-semibold tracking-tight">{title}</h2>
        <CardDescription>
          {professional.name} · {professional.specialty} · {professional.crm}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <Separator />
        <p className="max-w-[70ch] leading-relaxed whitespace-pre-wrap">{body}</p>
        {footer !== undefined && (
          <>
            <Separator />
            <div className="text-sm text-muted-foreground">{footer}</div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
