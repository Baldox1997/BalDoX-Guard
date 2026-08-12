import { Check, Eye, X } from "lucide-react";
import type { BalDoXPlan } from "../../types/baldox";

interface BalDoXPlanCardProps {
  plan: BalDoXPlan;
  onApply: () => void;
  onReview: () => void;
  onCancel: () => void;
}

const TIER_LABELS = {
  safe: { label: "Seguro", color: "text-green-600 dark:text-green-400 bg-green-500/10 border-green-500/20" },
  review: { label: "Revisão obrigatória", color: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20" },
  blocked: { label: "Bloqueado", color: "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20" },
};

export function BalDoXPlanCard({ plan, onApply, onReview, onCancel }: BalDoXPlanCardProps) {
  const tier = TIER_LABELS[plan.tier];

  return (
    <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">{plan.title}</h3>
          <p className="mt-1 text-xs text-text-secondary">{plan.summary}</p>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${tier.color}`}>
          {tier.label}
        </span>
      </div>

      {plan.steps.length > 0 && (
        <ol className="mt-3 space-y-1.5">
          {plan.steps.map((step, i) => (
            <li key={step.id} className="flex items-start gap-2 text-xs text-text-secondary">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[10px] font-bold text-accent">
                {i + 1}
              </span>
              <span>
                <strong className="text-text-primary">{step.label}</strong> — {step.description}
              </span>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {plan.tier !== "blocked" && (
          <>
            <button
              type="button"
              onClick={onApply}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover"
            >
              <Check className="h-3.5 w-3.5" />
              Aplicar
            </button>
            <button
              type="button"
              onClick={onReview}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-surface-muted"
            >
              <Eye className="h-3.5 w-3.5" />
              Revisar
            </button>
          </>
        )}
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-muted"
        >
          <X className="h-3.5 w-3.5" />
          Cancelar
        </button>
      </div>
    </div>
  );
}
