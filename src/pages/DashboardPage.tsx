import { useEffect, useState } from "react";

import { Link, useNavigate } from "react-router-dom";

import { Shield, Sparkles } from "lucide-react";

import { AiAssistantCard } from "../components/AiAssistantCard";

import { StatCard } from "../components/StatCard";

import { StorageBar } from "../components/StorageBar";

import { fetchDashboardSummary } from "../services/dashboardService";

import { processBalDoXMessage } from "../services/baldoxAgent";

import { initGreeting } from "../stores/baldoxStore";

import { getProactiveGreeting } from "../services/automationService";

import { api } from "../services/apiService";

import {
  ASSISTANT_NAME,
  BRAND_HERO_IMAGE,
  BRAND_ICON_IMAGE,
  PRODUCT_NAME,
  TAGLINE,
} from "../constants/brand";

import type { DashboardSummary } from "../types/dashboard";



const QUICK_ACTIONS = [

  { label: "Analisar computador", intent: "analisar o pc", path: "/scanner" },

  { label: "Liberar 20 GB", intent: "libere 20 gb", path: "/assistant" },

  { label: "Organizar Downloads", intent: "organize downloads", path: "/organize" },

  { label: "Rotina de manutenção", intent: "rotina de manutenção", path: "/assistant" },

];



export function DashboardPage() {

  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();



  useEffect(() => {

    let cancelled = false;



    fetchDashboardSummary()

      .then((data) => { if (!cancelled) setSummary(data); })

      .finally(() => { if (!cancelled) setLoading(false); });



    api.getSettings().then((s) => {

      if (s.baldox_proactive_greeting) {

        getProactiveGreeting().then((g) => initGreeting(g));

      }

    }).catch(() => {});



    return () => { cancelled = true; };

  }, []);



  async function handleQuickAction(intent: string, path: string) {
    if (path === "/scanner") {
      navigate(path);
      return;
    }
    navigate("/assistant");
    await processBalDoXMessage(intent, (p) => navigate(p));
  }



  if (loading || !summary) {

    return (

      <div className="flex h-64 items-center justify-center">

        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />

      </div>

    );

  }



  return (

    <div className="mx-auto max-w-6xl space-y-6">

      <section className="hero-warrior-card relative min-h-[200px] overflow-hidden rounded-xl">

        <img

          src={BRAND_HERO_IMAGE}

          alt=""

          aria-hidden

          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[center_35%] opacity-95"

        />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-surface-elevated via-surface-elevated/92 to-surface-elevated/25 dark:from-[#12121a] dark:via-[#12121a]/94 dark:to-[#12121a]/35" />



        <div className="relative flex flex-col gap-5 p-6 sm:flex-row sm:items-center">

          <img

            src={BRAND_ICON_IMAGE}

            alt={ASSISTANT_NAME}

            className="h-20 w-20 shrink-0 rounded-2xl border border-primary/40 object-cover shadow-lg shadow-primary/20 sm:h-24 sm:w-24"

          />

          <div className="min-w-0 flex-1">

            <div className="flex flex-wrap items-center gap-2">

              <Shield className="h-5 w-5 text-primary" />

              <h2 className="text-lg font-semibold text-text-primary">{PRODUCT_NAME}</h2>

              <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">

                {ASSISTANT_NAME}

              </span>

            </div>

            <p className="mt-2 text-sm text-text-secondary">{TAGLINE}</p>

            <p className="mt-1 max-w-xl text-xs text-text-secondary/80">

              Seu guardião digital monitora disco, scans e limpeza com revisão antes de qualquer ação destrutiva.

            </p>

          </div>

        </div>

      </section>



      <section className="rounded-xl border border-border bg-surface-elevated p-6">

        <StorageBar

          usedLabel={summary.storage.usedLabel}

          totalLabel={summary.storage.totalLabel}

          usagePercent={summary.storage.usagePercent}

        />



        <div className="mt-4 flex flex-wrap gap-2">

          {QUICK_ACTIONS.map((action) => (

            <button

              key={action.label}

              type="button"

              onClick={() => void handleQuickAction(action.intent, action.path)}

              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-primary transition hover:border-primary/40 hover:bg-primary/5"

            >

              <Sparkles className="h-4 w-4 text-primary" />

              {action.label}

            </button>

          ))}

        </div>



        <div className="mt-4 flex flex-wrap gap-3">

        <Link

          to="/control"

          className="inline-flex items-center gap-2 rounded-lg border border-primary/40 px-5 py-2.5 text-sm font-medium text-primary transition hover:bg-primary/5"

        >

          Painel de Controle

        </Link>



        <Link

          to="/scanner"

          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition hover:bg-primary-hover"

        >

          <Sparkles className="h-4 w-4" />

          Iniciar scan completo

        </Link>

        </div>

      </section>



      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        {summary.stats.map((stat) => (

          <StatCard key={stat.id} stat={stat} />

        ))}

      </section>



      <section className="rounded-xl border border-border bg-surface-elevated p-5">

        <div className="flex flex-wrap items-center justify-between gap-4">

          <div>

            <p className="text-sm font-medium text-text-primary">Espaço recuperável estimado</p>

            <p className="mt-1 text-2xl font-semibold text-green-600 dark:text-green-400">

              {summary.potentialCleanupLabel}

            </p>

          </div>

          <p className="max-w-md text-sm text-text-secondary">

            {summary.lastScanId

              ? "Dados do último scan. Use Limpeza ou BalDoX para revisar antes de agir."

              : "Execute um scan para obter estatísticas reais do seu PC."}

          </p>

        </div>

      </section>



      <AiAssistantCard />

    </div>

  );

}


