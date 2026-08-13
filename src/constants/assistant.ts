import { ASSISTANT_NAME, TAGLINE } from "./brand";

export { ASSISTANT_NAME };

export const ASSISTANT_CARD_TITLE = `${ASSISTANT_NAME} — ${TAGLINE}`;

export const ASSISTANT_SUBTITLE = "BalDoX Local — inteligente no seu PC";

export const ASSISTANT_GREETING =
  "Comandante, sou BalDoX Local — inteligente no seu PC. Posso manter temp e alertas sozinho; para limpar, mover ou organizar, sempre pergunto antes.";

export const ASSISTANT_OPEN_LABEL = `Conversar com ${ASSISTANT_NAME}`;

export const ASSISTANT_WELCOME_MESSAGE =
  "Comandante, sou BalDoX Local — seu guardião inteligente. Analiso, sugiero e executo só com sua confirmação. Temp e alertas cuido sozinho em modo seguro. Diga o que precisa ou escolha uma sugestão.";

export const ASSISTANT_STATUS_READY = "Pronto para ajudar";

export const ASSISTANT_INPUT_PLACEHOLDER = "Peça ao BalDoX: acha PDFs, libere espaço, PC lento… (sempre confirmo antes de agir)";

export type BalDoXAnimationState =
  | "idle"
  | "walking"
  | "thinking"
  | "scanning"
  | "organizing"
  | "success"
  | "warning";

export const BALDOX_STATE_LABELS: Record<BalDoXAnimationState, string> = {
  idle: "Pronto para ajudar",
  walking: "Patrulhando o desktop…",
  thinking: "Analisando sua solicitação…",
  scanning: "Varrendo arquivos…",
  organizing: "Organizando itens…",
  success: "Tarefa concluída",
  warning: "Aguardando confirmação",
};

export const VOICE_HINT_LABEL = "Fale com o BalDoX";
export const VOICE_LISTENING_LABEL = "Ouvindo…";
export const VOICE_PROCESSING_LABEL = "Processando fala…";
export const VOICE_UNSUPPORTED_MESSAGE =
  "Comando de voz não disponível neste ambiente. Use o teclado ou ative o microfone nas permissões do Windows.";
export const VOICE_MIC_ARIA = "Ativar/desativar microfone";
