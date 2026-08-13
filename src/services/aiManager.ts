import type {
  AutonomyTier,
  BalDoXIntent,
  BalDoXKnowledge,
  BalDoXPlan,
  BalDoXPlanStep,
  IntentResult,
  ParsedEntities,
} from "../types/baldox";

interface IntentPattern {
  intent: BalDoXIntent;
  patterns: RegExp[];
  keywords: string[];
  tier: AutonomyTier;
  weight: number;
}

const INTENT_PATTERNS: IntentPattern[] = [
  {
    intent: "SEARCH_FILES",
    patterns: [
      /ach(e|a|ar)\s+(meus?\s+)?(pdf|arquivos?|pastas?)/i,
      /encontr(e|ar|a)\s+(pdf|arquivos?|pastas?)/i,
      /busc(e|ar|a)\s+(pdf|arquivos?|pastas?|por)/i,
      /procur(e|ar|a)\s+(pdf|arquivos?|pastas?)/i,
      /me\s+mostr(e|a)\s+(os\s+)?(pdf|arquivos?|pastas?)/i,
      /list(e|ar|a)\s+(pdf|arquivos?|pastas?)/i,
      /arquivos?\s+(grandes?|pdf|antigos?)/i,
      /maiores?\s+arquivos?/i,
      /\.(pdf|docx?|xlsx?|zip|rar|mp4|mkv)/i,
      /quantos?\s+(pdf|arquivos?)/i,
    ],
    keywords: ["acha", "achar", "encontre", "busca", "procura", "mostra", "lista", "pdf", "arquivo", "grande", "antigo"],
    tier: "safe",
    weight: 1,
  },
  {
    intent: "SCAN",
    patterns: [
      /escane/i,
      /varrer/i,
      /scan/i,
      /analis(e|ar|a)\s+(o\s+)?(pc|computador|disco|d:|c:)/i,
      /index(e|ar|a)\s+(arquivos?|pastas?)/i,
      /faz(e|er|a)\s+(um\s+)?scan/i,
    ],
    keywords: ["escane", "scan", "varrer", "analisar pc", "indexar"],
    tier: "safe",
    weight: 1,
  },
  {
    intent: "CLEANUP",
    patterns: [
      /limp(e|ar|a)\s+(temp|cache|temporários?|lixo)/i,
      /liber(e|ar|a)\s+\d*\s*(gb|giga|espaço)/i,
      /liber(e|ar|a)\s+espaço/i,
      /preciso de espaço/i,
      /quanto\s+espaço/i,
      /limpeza/i,
      /rotina\s+de\s+manutenção/i,
      /manutenção\s+completa/i,
      /manter\s+pc/i,
      /apag(e|ar|a)\s+(temp|cache|lixo)/i,
    ],
    keywords: ["limpa", "limpar", "libere", "espaço", "temp", "cache", "manutenção", "apaga"],
    tier: "review",
    weight: 1,
  },
  {
    intent: "ORGANIZE",
    patterns: [
      /organiz(e|ar|a)\s+(meus?\s+)?(downloads?|pastas?|arquivos?)/i,
      /arrum(e|ar|a)\s+(downloads?|pastas?)/i,
      /orden(e|ar|a)\s+(downloads?|pastas?)/i,
    ],
    keywords: ["organiza", "organizar", "arruma", "downloads", "ordenar"],
    tier: "review",
    weight: 1,
  },
  {
    intent: "DIAGNOSE",
    patterns: [
      /pc\s+lento/i,
      /computador\s+lento/i,
      /deixando\s+lento/i,
      /performance/i,
      /o que (está|ta)\s+(lento|travando)/i,
      /diagnóstic/i,
      /como\s+está\s+(o\s+)?(disco|pc|ram)/i,
      /quanto\s+(espaço|memória)/i,
      /status\s+(do\s+)?(disco|pc)/i,
      /quanto\s+espaço\s+(tem\s+)?(no\s+)?[a-z]:/i,
      /espaço\s+(livre\s+)?(no\s+)?[a-z]:/i,
      /mostre\s+pastas?\s+grandes?/i,
      /pastas?\s+grandes?/i,
      /o que ocupa/i,
      /saúde\s+do\s+sistema/i,
    ],
    keywords: ["lento", "performance", "diagnóstico", "travando", "ram", "memória", "espaço", "pastas grandes"],
    tier: "safe",
    weight: 1,
  },
  {
    intent: "MANAGE_FILES",
    patterns: [
      /mov(e|er|a)\s+(para|arquivo|pasta)/i,
      /apag(e|ar|a)\s+(o\s+)?(arquivo|pasta|isso)/i,
      /delet(e|ar|a)\s+/i,
      /exclu(e|ir|a)\s+/i,
      /quarenten(e|ar|a)/i,
      /remov(e|er|a)\s+(arquivo|pasta)/i,
    ],
    keywords: ["move", "mover", "apaga", "deleta", "exclui", "quarentena", "remove"],
    tier: "review",
    weight: 1.2,
  },
  {
    intent: "LIST_APPS",
    patterns: [
      /apps?\s+instalados?/i,
      /programas?\s+instalados?/i,
      /aplicativos?/i,
      /list(e|ar|a)\s+(apps?|programas?)/i,
      /quantos?\s+(apps?|programas?)/i,
    ],
    keywords: ["apps", "programas", "aplicativos", "instalados"],
    tier: "safe",
    weight: 1,
  },
  {
    intent: "DUPLICATES",
    patterns: [
      /duplicad/i,
      /cópias?\s+iguais/i,
      /arquivos?\s+repetidos?/i,
      /arquivos?\s+duplicados?/i,
    ],
    keywords: ["duplicado", "cópias", "repetidos"],
    tier: "review",
    weight: 1,
  },
  {
    intent: "QUARANTINE",
    patterns: [
      /quarenten(e|ar|a)/i,
      /itens?\s+na\s+quarentena/i,
      /ver\s+quarentena/i,
      /restaur(e|ar|a)\s+quarentena/i,
    ],
    keywords: ["quarentena", "restaurar"],
    tier: "review",
    weight: 1,
  },
  {
    intent: "NAVIGATE",
    patterns: [
      /abr(e|ir|a)\s+(a\s+)?(página|pagina|scanner|limpeza|duplicados?|explorador|apps?|configurações?)/i,
      /vai\s+(para|pro)\s+/i,
      /me\s+leva\s+(para|pro|ao)/i,
      /mostr(e|a)\s+(a\s+)?(página|scanner|limpeza)/i,
      /ir\s+(para|pro|ao)\s+/i,
    ],
    keywords: ["abrir", "vai para", "leva", "página", "scanner", "limpeza"],
    tier: "safe",
    weight: 0.9,
  },
  {
    intent: "GENERAL_HELP",
    patterns: [
      /o que (você|vc|voce)\s+(faz|pode|sabe)/i,
      /ajuda/i,
      /help/i,
      /como\s+funciona/i,
      /quem\s+(é|e)\s+(você|vc|baldox)/i,
      /olá|oi|bom dia|boa tarde|boa noite/i,
    ],
    keywords: ["ajuda", "help", "o que faz", "como funciona", "olá", "oi"],
    tier: "safe",
    weight: 0.7,
  },
];

const NAV_TARGETS: Record<string, string> = {
  scanner: "/scanner",
  scan: "/scanner",
  explorador: "/files",
  arquivos: "/files",
  files: "/files",
  limpeza: "/cleanup",
  cleanup: "/cleanup",
  duplicados: "/duplicates",
  duplicates: "/duplicates",
  grandes: "/large-files",
  "large-files": "/large-files",
  antigos: "/old-files",
  organize: "/organize",
  organizar: "/organize",
  apps: "/apps",
  programas: "/apps",
  quarentena: "/quarantine",
  historico: "/history",
  histórico: "/history",
  configurações: "/settings",
  configuracoes: "/settings",
  settings: "/settings",
  assistente: "/assistant",
  dashboard: "/",
};

export function extractEntities(input: string): ParsedEntities {
  const paths: string[] = [];
  const pathRegex = /([A-Za-z]:\\(?:[^\s,;]+)?)/g;
  let m: RegExpExecArray | null;
  while ((m = pathRegex.exec(input)) !== null) {
    paths.push(m[1].replace(/[.,;!?]+$/, ""));
  }

  const driveLetters = [...input.matchAll(/\b([A-Za-z]:)\b/g)].map((x) => x[1].toUpperCase());

  const sizes: ParsedEntities["sizes"] = [];
  for (const sm of input.matchAll(/(\d+(?:[.,]\d+)?)\s*(gb|giga|mb|mega|tb|tera|kb)/gi)) {
    const value = parseFloat(sm[1].replace(",", "."));
    const unit = sm[2].toLowerCase();
    const mult =
      unit.startsWith("tb") || unit.startsWith("tera") ? 1024 ** 4
      : unit.startsWith("gb") || unit.startsWith("giga") ? 1024 ** 3
      : unit.startsWith("mb") || unit.startsWith("mega") ? 1024 ** 2
      : 1024;
    sizes.push({ value, unit, bytes: Math.round(value * mult) });
  }

  const extensions = [...input.matchAll(/\.([a-z0-9]{1,8})\b/gi)].map((x) => x[1].toLowerCase());
  const extKeywords = [...input.matchAll(/\b(pdf|docx?|xlsx?|zip|rar|mp4|mkv|jpg|png)\b/gi)].map((x) =>
    x[1].toLowerCase(),
  );
  const allExtensions = [...new Set([...extensions, ...extKeywords])];

  const numbers = [...input.matchAll(/\b(\d+)\b/g)].map((x) => parseInt(x[1], 10));

  let days: number | null = null;
  const dayMatch = input.match(/(\d+)\s*(dias?|meses?|anos?)/i);
  if (dayMatch) {
    const n = parseInt(dayMatch[1], 10);
    const unit = dayMatch[2].toLowerCase();
    days = unit.startsWith("ano") ? n * 365 : unit.startsWith("mes") ? n * 30 : n;
  } else if (/1\s*ano|um\s*ano|há\s*1\s*ano/i.test(input)) {
    days = 365;
  }

  const gbMatch = input.match(/(\d+)\s*(gb|giga)/i);
  const freeSpaceTargetGb = gbMatch ? parseInt(gbMatch[1], 10) : null;

  const confirmAction = /\b(confirmo|confirmar|pode\s+executar|pode\s+fazer|sim,?\s+executa|aprovado)\b/i.test(input);

  let navigateTarget: string | null = null;
  const lower = input.toLowerCase();
  for (const [key, route] of Object.entries(NAV_TARGETS)) {
    if (lower.includes(key)) {
      navigateTarget = route;
      break;
    }
  }

  return {
    paths,
    sizes,
    extensions: allExtensions,
    numbers,
    days,
    driveLetters,
    freeSpaceTargetGb,
    confirmAction,
    navigateTarget,
  };
}

export function parseIntent(input: string, contextIntent?: BalDoXIntent | null): IntentResult {
  const normalized = input.trim().toLowerCase();
  const entities = extractEntities(input);

  if (entities.confirmAction && contextIntent) {
    return { intent: contextIntent, confidence: 0.95, entities };
  }

  const scores = new Map<BalDoXIntent, number>();

  for (const def of INTENT_PATTERNS) {
    let score = 0;
    for (const p of def.patterns) {
      if (p.test(normalized)) score += 2 * def.weight;
    }
    for (const kw of def.keywords) {
      if (normalized.includes(kw)) score += 0.5 * def.weight;
    }
    if (score > 0) scores.set(def.intent, (scores.get(def.intent) ?? 0) + score);
  }

  if (entities.extensions.length > 0 && !scores.has("SEARCH_FILES")) {
    scores.set("SEARCH_FILES", 1.5);
  }
  if (entities.freeSpaceTargetGb && !scores.has("CLEANUP")) {
    scores.set("CLEANUP", (scores.get("CLEANUP") ?? 0) + 2);
  }
  if (entities.paths.length > 0 && entities.confirmAction) {
    scores.set("MANAGE_FILES", (scores.get("MANAGE_FILES") ?? 0) + 1);
  }
  if (entities.navigateTarget) {
    scores.set("NAVIGATE", (scores.get("NAVIGATE") ?? 0) + 2);
  }

  if (scores.size === 0) {
    if (/^(oi|olá|ola|hey|e aí|eai)\b/i.test(normalized)) {
      return { intent: "GENERAL_HELP", confidence: 0.8, entities };
    }
    return { intent: "UNKNOWN", confidence: 0, entities };
  }

  const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const [intent, score] = sorted[0];
  const confidence = Math.min(score / 4, 1);

  return { intent, confidence, entities };
}

export function getIntentTier(intent: BalDoXIntent): AutonomyTier {
  const match = INTENT_PATTERNS.find((p) => p.intent === intent);
  if (match) return match.tier;
  if (intent === "UNKNOWN") return "blocked";
  if (intent === "GENERAL_HELP" || intent === "DIAGNOSE" || intent === "SEARCH_FILES") return "safe";
  return "review";
}

export function buildActionPlan(
  intent: BalDoXIntent,
  userInput: string,
  entities: ParsedEntities,
): BalDoXPlan {
  const id = crypto.randomUUID();
  const tier = getIntentTier(intent);

  const builders: Record<BalDoXIntent, () => BalDoXPlan> = {
    SEARCH_FILES: () => {
      const ext = entities.extensions[0] ?? null;
      const minSize = entities.sizes[0]?.bytes ?? (/\bgrandes?\b/i.test(userInput) ? 100 * 1024 * 1024 : undefined);
      const days = entities.days ?? (/\bantigos?\b/i.test(userInput) ? 365 : undefined);
      return {
        id,
        intent,
        title: ext ? `Buscar .${ext}` : days ? "Arquivos antigos" : "Buscar arquivos",
        summary: ext
          ? `Vou buscar arquivos .${ext} no índice do último scan.`
          : days
            ? `Arquivos sem modificação há ${days} dias.`
            : "Consulta ao banco de dados de arquivos indexados.",
        tier: "safe",
        steps: [
          step("search", "Buscar arquivos", "Consultar banco de dados", "safe", "search_files", {
            extension: ext,
            minSize,
            days,
            query: userInput,
          }),
        ],
      };
    },
    SCAN: () => ({
      id,
      intent,
      title: "Varredura completa",
      summary: entities.paths.length
        ? `Escanear: ${entities.paths.join(", ")}`
        : "Analisar pastas principais e indexar arquivos.",
      tier: "safe",
      steps: [
        step("scan", "Escanear", "Varredura incremental", "safe", "start_scan", {
          paths: entities.paths,
        }),
      ],
    }),
    CLEANUP: () => {
      const targetGb = entities.freeSpaceTargetGb ?? 20;
      const isTempOnly = /temp|cache|temporário/i.test(userInput) && !entities.freeSpaceTargetGb;
      if (isTempOnly) {
        return {
          id,
          intent,
          title: "Limpar temporários",
          summary: "Analisar e limpar arquivos temp/cache em caminhos seguros.",
          tier: "safe",
          steps: [
            step("analyze-temp", "Analisar temp", "Identificar candidatos seguros", "safe", "analyze_cleanup"),
            step("clean", "Limpar selecionados", "Remover após revisão", "safe", "auto_clean_temp"),
          ],
        };
      }
      return {
        id,
        intent,
        title: `Liberar ~${targetGb} GB`,
        summary: "Plano: escanear → grandes/duplicados/temp → quarentena segura dos selecionados.",
        tier: "review",
        estimatedBytes: targetGb * 1024 ** 3,
        steps: [
          step("scan", "Escanear PC", "Indexar arquivos", "safe", "start_scan"),
          step("analyze-large", "Arquivos grandes", "Maiores consumidores", "safe", "get_large_files"),
          step("analyze-dupes", "Duplicados", "Cópias idênticas", "review", "find_duplicates"),
          step("analyze-temp", "Temp e cache", "Limpeza segura", "safe", "analyze_cleanup"),
          step("quarantine", "Quarentena selecionados", "Mover itens aprovados (reversível)", "review", "quarantine_paths"),
        ],
      };
    },
    ORGANIZE: () => ({
      id,
      intent,
      title: "Organizar pasta",
      summary: entities.paths[0]
        ? `Organizar: ${entities.paths[0]}`
        : "Categorizar Downloads em Images, Documents, Installers, Archives e Other.",
      tier: "review",
      steps: [
        step("analyze", "Analisar pasta", "Classificar por extensão", "safe", "analyze_organization", {
          path: entities.paths[0],
        }),
        step("preview", "Pré-visualizar", "Mostrar destino de cada arquivo", "review"),
        step("execute", "Executar organização", "Mover após confirmação", "review", "execute_organization"),
      ],
    }),
    DIAGNOSE: () => ({
      id,
      intent,
      title: "Diagnóstico do sistema",
      summary: entities.driveLetters.length
        ? `Relatório de espaço no ${entities.driveLetters[0]} e saúde geral do PC.`
        : "Relatório: todos os drives, arquivos grandes, temp acumulado e pastas maiores.",
      tier: "safe",
      steps: [
        step("disk", "Status dos drives", "Espaço livre e uso em todos os drives", "safe", "get_all_drives_stats"),
        step("large", "Arquivos grandes", "Top consumidores", "safe", "get_large_files"),
        step("folders", "Pastas grandes", "Maiores diretórios do scan", "safe", "get_largest_folders"),
        step("temp", "Temp acumulado", "Cache e temporários", "safe", "analyze_cleanup"),
        step("nav", "Abrir Diagnóstico", "Ver painel completo", "safe", "navigate", { route: "/diagnostics" }),
      ],
    }),
    MANAGE_FILES: () => ({
      id,
      intent,
      title: "Gerenciar arquivos",
      summary: entities.paths.length
        ? `Ação sobre: ${entities.paths.slice(0, 3).join(", ")}${entities.paths.length > 3 ? "…" : ""}`
        : "Informe caminhos completos para mover, apagar ou colocar em quarentena.",
      tier: entities.paths.length ? "review" : "blocked",
      steps: entities.paths.length
        ? [
            step("preview", "Pré-visualizar ação", "Verificar segurança dos caminhos", "review", "preview_manage"),
            step("execute", "Executar ação", /quarenten/i.test(userInput) ? "Quarentena" : /apag|delet|exclu/i.test(userInput) ? "Exclusão" : "Mover", "review", "execute_manage", {
              paths: entities.paths,
              action: /quarenten/i.test(userInput) ? "quarantine" : /apag|delet|exclu/i.test(userInput) ? "delete" : "quarantine",
            }),
          ]
        : [],
    }),
    LIST_APPS: () => ({
      id,
      intent,
      title: "Apps instalados",
      summary: "Listar programas detectados no sistema.",
      tier: "safe",
      steps: [step("apps", "Listar apps", "Consultar banco de apps", "safe", "scan_apps")],
    }),
    DUPLICATES: () => ({
      id,
      intent,
      title: "Arquivos duplicados",
      summary: "Pipeline: tamanho → hash parcial → hash completo.",
      tier: "review",
      steps: [
        step("dupes", "Detectar duplicados", "Agrupar arquivos idênticos", "review", "find_duplicates"),
        step("nav", "Abrir Duplicados", "Navegar para revisão", "safe", "navigate", { route: "/duplicates" }),
      ],
    }),
    QUARANTINE: () => ({
      id,
      intent,
      title: "Quarentena",
      summary: "Ver itens em quarentena e estatísticas.",
      tier: "safe",
      steps: [step("quarantine-stats", "Status quarentena", "Listar itens isolados", "safe", "quarantine_stats")],
    }),
    NAVIGATE: () => ({
      id,
      intent,
      title: "Navegar",
      summary: entities.navigateTarget ? `Abrir ${entities.navigateTarget}` : "Abrir página do app.",
      tier: "safe",
      steps: [
        step("nav", "Navegar", "Ir para a página solicitada", "safe", "navigate", {
          route: entities.navigateTarget ?? "/",
        }),
      ],
    }),
    GENERAL_HELP: () => ({
      id,
      intent,
      title: "Ajuda BalDoX",
      summary: "Posso escanear, buscar arquivos, limpar temp, organizar Downloads, diagnosticar lentidão e muito mais.",
      tier: "safe",
      steps: [],
    }),
    UNKNOWN: () => ({
      id,
      intent,
      title: "Comando não reconhecido",
      summary: "Tente: 'acha PDFs no D:', 'libere 20 GB', 'organiza downloads', 'quanto espaço no C:', 'PC lento'.",
      tier: "blocked",
      steps: [],
    }),
  };

  const plan = builders[intent]();
  return { ...plan, tier: plan.steps.length === 0 && intent === "UNKNOWN" ? "blocked" : tier };
}

function step(
  id: string,
  label: string,
  description: string,
  tier: AutonomyTier,
  command?: string,
  params?: Record<string, unknown>,
): BalDoXPlanStep {
  return { id, label, description, tier, command, params };
}

export function buildKnowledgeSummary(knowledge: BalDoXKnowledge): string {
  const parts: string[] = [];
  if (knowledge.dashboard) {
    const s = knowledge.dashboard.storage;
    const freeGb = (s.free_bytes / 1024 ** 3).toFixed(1);
    parts.push(`Seu ${s.drive_letter} tem ${freeGb} GB livres (${s.usage_percent.toFixed(0)}% usado).`);
    const cleanup = knowledge.dashboard.stats.find((x) => x.id === "cleanup");
    if (cleanup && cleanup.count > 0) {
      parts.push(`${cleanup.count} itens de limpeza segura (${cleanup.value}).`);
    }
    if (knowledge.dashboard.lastScanStatus === "completed") {
      const large = knowledge.dashboard.stats.find((x) => x.id === "large");
      if (large && large.count > 0) {
        parts.push(`${large.count} arquivos grandes indexados (${large.value}).`);
      }
    } else {
      parts.push("Ainda não há scan recente concluído.");
    }
    parts.push(`${knowledge.dashboard.appCount} apps instalados.`);
  }
  if (knowledge.quarantineCount > 0) {
    parts.push(`${knowledge.quarantineCount} itens na quarentena.`);
  }
  return parts.join(" ");
}

export function getPersonalityResponse(
  intent: BalDoXIntent,
  personality: string,
  knowledge?: BalDoXKnowledge,
): string {
  const facts = knowledge ? buildKnowledgeSummary(knowledge) : "";

  const professional: Record<BalDoXIntent, string> = {
    SEARCH_FILES: "Às ordens. Vou vasculhar o índice de arquivos e trazer os resultados.",
    SCAN: "Comandante, iniciando varredura tática do seu território digital.",
    CLEANUP: "Missão recebida: recuperar espaço. Nada será destruído sem sua aprovação.",
    ORGANIZE: "Campo de batalha caótico detectado. Traço a estratégia de organização.",
    DIAGNOSE: "Investigando o que freia seu exército digital. Relatório em preparação.",
    MANAGE_FILES: "Arquivos identificados. Preparo ação com revisão obrigatória.",
    LIST_APPS: "Recenseando o arsenal de programas instalados.",
    DUPLICATES: "Caçando clones de arquivos — cada byte duplicado será exposto.",
    QUARANTINE: "Consultando a câmara de quarentena.",
    NAVIGATE: "Abrindo canal tático solicitado.",
    GENERAL_HELP:
      "Comandante, sou BalDoX Local — inteligente no seu PC. Escaneio, busco, limpo, organizo e diagnostico. Posso manter temp e alertas sozinho; qualquer outra ação preciso da sua confirmação.",
    UNKNOWN: "Comandante, não decifrei sua ordem. Reformule ou escolha uma sugestão abaixo.",
  };

  const friendly: Record<BalDoXIntent, string> = {
    SEARCH_FILES: "Vou buscar esses arquivos pra você!",
    SCAN: "Vou dar uma olhada completa no seu PC.",
    CLEANUP: "Entendi! Vou montar um plano para liberar espaço com segurança.",
    ORGANIZE: "Downloads bagunçados? Deixa comigo!",
    DIAGNOSE: "Vou investigar o que pode estar deixando o PC lento.",
    MANAGE_FILES: "Ok, vou preparar a ação nos arquivos — com confirmação.",
    LIST_APPS: "Listando os programas instalados.",
    DUPLICATES: "Hora de achar arquivos duplicados!",
    QUARANTINE: "Vou mostrar o que está na quarentena.",
    NAVIGATE: "Te levo lá agora!",
    GENERAL_HELP:
      "Oi! Sou o BalDoX Local — inteligente no seu PC. Posso cuidar de temp e alertas sozinho; para limpar, mover ou organizar arquivos, sempre pergunto antes. O que precisa?",
    UNKNOWN: "Hmm, não entendi. Pode reformular?",
  };

  const base = personality === "friendly" ? friendly[intent] : professional[intent];
  if (facts && (intent === "DIAGNOSE" || intent === "GENERAL_HELP" || intent === "UNKNOWN")) {
    return `${base} ${facts}`;
  }
  if (facts && intent === "CLEANUP") {
    return `${base} ${facts}`;
  }
  return base;
}

/** Comandos permitidos para execução autônoma em background (Tier 1). */
export const AUTONOMOUS_BACKGROUND_COMMANDS = new Set(["auto_clean_temp", "auto_clean_temp_safe"]);

/**
 * Autonomia BalDoX — regras de execução sem confirmação do usuário.
 *
 * - **Chat:** NUNCA auto-executa. Usuário deve clicar [Sim, executar] ou dizer "confirmo".
 * - **Background (secretary):** apenas `auto_clean_temp` em caminhos seguros (SafetyManager),
 *   quando `auto_clean_temp` + `baldox_secretary_active` estão habilitados.
 * - **Proibido autonomamente:** delete, mover, organizar, quarentena, uninstall, caminhos protegidos.
 */
export function canAutoExecute(
  tier: AutonomyTier,
  settings: { auto_clean_temp: boolean; baldox_secretary_active?: boolean },
  intent: BalDoXIntent,
  plan: BalDoXPlan,
  fromChat = true,
): boolean {
  if (fromChat) return false;

  if (tier === "blocked" || tier === "review") return false;
  if (!settings.baldox_secretary_active) return false;

  const onlyAutonomousSteps = plan.steps.every(
    (s) => !s.command || AUTONOMOUS_BACKGROUND_COMMANDS.has(s.command),
  );
  if (
    intent === "CLEANUP" &&
    onlyAutonomousSteps &&
    settings.auto_clean_temp
  ) {
    return true;
  }

  return false;
}

export async function tryOpenAiIntent(
  input: string,
  apiKey: string,
): Promise<IntentResult | null> {
  if (!apiKey.trim()) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        messages: [
          {
            role: "system",
            content: `Classifique a intenção do usuário em um dos valores: SEARCH_FILES, SCAN, CLEANUP, ORGANIZE, DIAGNOSE, MANAGE_FILES, LIST_APPS, DUPLICATES, QUARANTINE, NAVIGATE, GENERAL_HELP, UNKNOWN. Responda só JSON: {"intent":"...","confidence":0.0-1.0}`,
          },
          { role: "user", content: input },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim()) as {
      intent?: string;
      confidence?: number;
    };
    const validIntents: BalDoXIntent[] = [
      "SEARCH_FILES", "SCAN", "CLEANUP", "ORGANIZE", "DIAGNOSE", "MANAGE_FILES",
      "LIST_APPS", "DUPLICATES", "QUARANTINE", "NAVIGATE", "GENERAL_HELP", "UNKNOWN",
    ];
    if (parsed.intent && validIntents.includes(parsed.intent as BalDoXIntent)) {
      return {
        intent: parsed.intent as BalDoXIntent,
        confidence: parsed.confidence ?? 0.85,
        entities: extractEntities(input),
      };
    }
  } catch {
    /* offline fallback */
  }
  return null;
}

/** @deprecated use buildActionPlan */
export function buildPlan(intent: BalDoXIntent, userInput: string): BalDoXPlan {
  return buildActionPlan(intent, userInput, extractEntities(userInput));
}

export interface InterpretationResult {
  intent: BalDoXIntent;
  confidence: number;
  entities: ParsedEntities;
  reply: string;
  suggestedActions: { label: string; intent: string }[];
  isGeneralQuestion: boolean;
  source: "llm" | "local_llm" | "local";
}

const PROGRAMMING_KEYWORDS = [
  "código", "codigo", "programar", "programação", "programacao", "bug", "debug",
  "python", "javascript", "typescript", "rust", "react", "função", "funcao",
];

function isProgrammingQuestion(input: string): boolean {
  const lower = input.toLowerCase();
  return PROGRAMMING_KEYWORDS.some((kw) => lower.includes(kw));
}

function getProgrammingFallbackReply(personality: string): string {
  if (personality === "friendly") {
    return "Para ajuda com código de verdade, instale o Ollama (ollama.com) e ative **Modo IA: Local LLM (Ollama)** nas configurações. Baixe um modelo como `llama3.2` ou `qwen2.5-coder` com `ollama pull llama3.2`. Enquanto isso, posso escanear, limpar e organizar seu PC!";
  }
  return "Comandante, para programação e debug avançado, recomendo o Ollama local (ollama.com). Ative **Local LLM (Ollama)** em Configurações e baixe um modelo: `ollama pull llama3.2` ou `qwen2.5-coder`. Posso continuar gerenciando seu PC com regras locais.";
}

/** Pipeline unificado: Ollama local → OpenAI online → fallback rule-based local. */
export async function interpretMessage(
  input: string,
  options: {
    apiKey: string;
    aiMode: string;
    personality: string;
    knowledge?: BalDoXKnowledge;
    contextIntent?: BalDoXIntent | null;
    onReplyToken?: (partial: string) => void;
    llmModel?: string;
    llmBaseUrl?: string;
    ollamaUrl?: string;
    ollamaModel?: string;
  },
): Promise<InterpretationResult> {
  const { chatWithLLM, chatWithLocalLLM, isLLMAvailable, isLocalLLMAvailable, mergeEntities, streamTextToCallback } =
    await import("./llmService");

  const localResult = parseIntent(input, options.contextIntent);
  let localReply = getPersonalityResponse(
    localResult.intent,
    options.personality,
    options.knowledge,
  );

  if (localResult.intent === "UNKNOWN" && isProgrammingQuestion(input)) {
    localReply = getProgrammingFallbackReply(options.personality);
  }

  if (isLocalLLMAvailable(options.aiMode)) {
    try {
      const llm = await chatWithLocalLLM(input, {
        ollamaUrl: options.ollamaUrl,
        model: options.ollamaModel,
        personality: options.personality,
        knowledge: options.knowledge,
        contextIntent: options.contextIntent,
      });

      if (llm) {
        const entities = mergeEntities(localResult.entities, llm.entities);
        if (options.onReplyToken) {
          await streamTextToCallback(llm.reply, options.onReplyToken);
        }
        return {
          intent: llm.intent,
          confidence: llm.confidence,
          entities,
          reply: llm.reply,
          suggestedActions: llm.suggestedActions,
          isGeneralQuestion: llm.isGeneralQuestion,
          source: "local_llm",
        };
      }
    } catch {
      /* fallback abaixo */
    }

    return {
      intent: localResult.intent,
      confidence: localResult.confidence,
      entities: localResult.entities,
      reply: `${localReply}\n\n(Ollama não respondeu — verifique se está rodando e se o modelo está instalado.)`,
      suggestedActions: [],
      isGeneralQuestion: localResult.intent === "GENERAL_HELP" || isProgrammingQuestion(input),
      source: "local",
    };
  }

  if (!isLLMAvailable(options.apiKey, options.aiMode)) {
    return {
      intent: localResult.intent,
      confidence: localResult.confidence,
      entities: localResult.entities,
      reply: localReply,
      suggestedActions: [],
      isGeneralQuestion: localResult.intent === "GENERAL_HELP",
      source: "local",
    };
  }

  try {
    const llm = await chatWithLLM(input, {
      apiKey: options.apiKey,
      baseUrl: options.llmBaseUrl,
      model: options.llmModel,
      personality: options.personality,
      knowledge: options.knowledge,
      contextIntent: options.contextIntent,
    });

    if (llm) {
      const entities = mergeEntities(localResult.entities, llm.entities);
      if (options.onReplyToken) {
        await streamTextToCallback(llm.reply, options.onReplyToken);
      }
      return {
        intent: llm.intent,
        confidence: llm.confidence,
        entities,
        reply: llm.reply,
        suggestedActions: llm.suggestedActions,
        isGeneralQuestion: llm.isGeneralQuestion,
        source: "llm",
      };
    }
  } catch {
    /* fallback abaixo */
  }

  return {
    intent: localResult.intent,
    confidence: localResult.confidence,
    entities: localResult.entities,
    reply: localReply,
    suggestedActions: [],
    isGeneralQuestion: localResult.intent === "GENERAL_HELP",
    source: "local",
  };
}
