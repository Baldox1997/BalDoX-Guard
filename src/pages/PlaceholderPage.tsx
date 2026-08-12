import { Construction } from "lucide-react";

interface PlaceholderPageProps {
  feature: string;
  phase: number;
  description?: string;
}

export function PlaceholderPage({ feature, phase, description }: PlaceholderPageProps) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-elevated px-8 py-16 text-center">
      <div className="rounded-full bg-surface-muted p-4 text-text-secondary">
        <Construction className="h-8 w-8" />
      </div>
      <h2 className="mt-5 text-lg font-semibold text-text-primary">{feature}</h2>
      <p className="mt-2 text-sm text-text-secondary">
        {description ??
          `Este módulo será implementado na Fase ${phase}. A interface base já está pronta.`}
      </p>
    </div>
  );
}
