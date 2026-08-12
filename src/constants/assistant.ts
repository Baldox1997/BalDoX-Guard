import { ASSISTANT_NAME, TAGLINE } from "./brand";

export { ASSISTANT_NAME };

export const ASSISTANT_CARD_TITLE = `${ASSISTANT_NAME} — ${TAGLINE}`;

export const ASSISTANT_SUBTITLE = "Comandos em linguagem natural com BalDoX";

export const ASSISTANT_GREETING =
  "Comandante, sou BalDoX — seu guerreiro digital. Posso analisar, organizar e defender seu PC — basta me dizer o que precisa.";

export const ASSISTANT_OPEN_LABEL = `Conversar com ${ASSISTANT_NAME}`;

export const ASSISTANT_WELCOME_MESSAGE =
  "Comandante, sou BalDoX — seu guerreiro digital. Posso escanear, organizar, limpar e otimizar seu PC. Diga o que precisa ou escolha uma sugestão abaixo.";

export const ASSISTANT_STATUS_READY = "Pronto para ajudar";

export const ASSISTANT_INPUT_PLACEHOLDER = "Peça ao BalDoX: acha PDFs, libere 20 GB, PC lento…";

export type BalDoXAnimationState =
  | "idle"
  | "thinking"
  | "scanning"
  | "organizing"
  | "success"
  | "warning";

export const BALDOX_STATE_LABELS: Record<BalDoXAnimationState, string> = {
  idle: "Pronto para ajudar",
  thinking: "Analisando sua solicitação…",
  scanning: "Varrendo arquivos…",
  organizing: "Organizando itens…",
  success: "Tarefa concluída",
  warning: "Aguardando confirmação",
};
