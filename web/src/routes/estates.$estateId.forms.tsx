import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { FileText, Loader2, Download, ShieldCheck, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  listForms,
  fillForm,
  fillableFields,
  downloadPdf,
  type FormSchema,
} from '../lib/forms';

export const Route = createFileRoute('/estates/$estateId/forms')({
  component: FormsPage,
});

export function FormsPage() {
  const [forms, setForms] = useState<FormSchema[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<FormSchema | null>(null);

  useEffect(() => {
    let active = true;
    listForms()
      .then((f) => active && setForms(f))
      .catch((e) => active && setError(e instanceof Error ? e.message : 'Failed to load forms'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-[var(--royal)]">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center text-red-700">
            Could not load statutory forms. {error}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (selected) {
    return <FillForm form={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="font-[Cinzel] text-2xl tracking-wide text-[var(--royal)] uppercase flex items-center gap-2">
          <FileText className="w-6 h-6 text-[var(--gold)]" /> Statutory Forms
        </h1>
        <p className="text-sm text-[var(--royal)]/80">
          Generate print-ready Illinois statutory documents pre-filled with your information.
          Signature, witness, and notary lines are intentionally left blank — these documents
          are signed by hand (and notarized where required).
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {forms.map((form) => (
          <Card
            key={form.formId}
            className="cursor-pointer transition-shadow hover:shadow-md border-[var(--gold)]/30"
            onClick={() => setSelected(form)}
          >
            <CardContent className="p-5 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-medium text-[var(--royal)] leading-snug">{form.title}</h2>
                <Badge variant="outline" className="shrink-0 border-[var(--royal)]/30 text-[var(--royal)]">
                  {form.jurisdiction}
                </Badge>
              </div>
              <p className="text-xs text-[var(--royal)]/60">{form.citation}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function FillForm({ form, onBack }: { form: FormSchema; onBack: () => void }) {
  const fields = useMemo(() => fillableFields(form), [form]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);

  const set = (key: string, v: string) => setValues((prev) => ({ ...prev, [key]: v }));

  const generate = async () => {
    setGenerating(true);
    try {
      const result = await fillForm(form.formId, values);
      downloadPdf(result.blob, form.formId);
      if (result.missingRequired.length > 0) {
        toast.warning('Draft generated with blank required fields', {
          description: `Still needed: ${result.missingRequired.join(', ')}`,
        });
      } else {
        toast.success('Form generated', {
          description: 'Print it, then sign by hand where indicated.',
        });
      }
    } catch (e) {
      toast.error('Could not generate the form', {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1 text-sm text-[var(--royal)]/70 hover:text-[var(--royal)]"
      >
        <ArrowLeft className="w-4 h-4" /> All forms
      </button>

      <header className="space-y-1">
        <h1 className="font-[Cinzel] text-xl tracking-wide text-[var(--royal)]">{form.title}</h1>
        <p className="text-xs text-[var(--royal)]/60">{form.citation}</p>
      </header>

      <Card className="border-[var(--gold)]/30">
        <CardContent className="p-5 space-y-4">
          {fields.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label htmlFor={field.key} className="text-[var(--royal)]">
                {field.label || field.key}
                {field.required && <span className="text-[var(--gold)] ml-1">*</span>}
              </Label>
              <Input
                id={field.key}
                value={values[field.key] ?? ''}
                onChange={(e) => set(field.key, e.target.value)}
                placeholder={field.label || field.key}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 text-xs text-[var(--royal)]/70">
        <ShieldCheck className="w-4 h-4 text-[var(--gold)]" />
        Signature, witness, and notary lines are never auto-filled — sign the printed form by hand.
      </div>

      <Button
        onClick={generate}
        disabled={generating}
        className="w-full bg-[var(--royal)] hover:bg-[var(--royal)] text-white"
      >
        {generating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        Generate print-ready PDF
      </Button>
    </div>
  );
}
