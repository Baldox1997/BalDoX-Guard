# BalDoX — Visão do Produto

BalDoX é o personagem e assistente inteligente do BalDoX Guard: um secretário digital que acompanha o usuário, entende comandos em linguagem natural e executa tarefas no computador com clareza e confiança.

## Identidade

- **Nome:** BalDoX
- **Papel:** Secretário de desktop — organiza, analisa, limpa e orienta
- **Tom:** Moderno, amigável e profissional; competente sem ser infantil
- **Presença visual:** Cavaleiro fantástico procedural em 3D — armadura esmeralda brilhante, asas dracônicas com bordas flamejantes e espadas duplas emissivas; fallback SVG robótico quando WebGL não está disponível

## Experiência na aplicação (Fase 1.5 → Fase 7)

### Fase 1.5 — Fundação da interface

- Página dedicada do assistente com avatar 3D animado (React Three Fiber)
- Área de chat com mensagem de boas-vindas
- Indicador de status do que BalDoX está fazendo
- Entrada de texto preparada (mock) para conversa futura

### Fase 7 — Presença 3D/animada in-app

- Avatar 3D procedural inspirado em cavaleiro de fantasia épica (essência visual: armadura verde esmeralda, asas dracônicas, espadas duplas)
- Animações idle: flutuação, respiração, batida de asas, rotação lenta, partículas de brasa
- Estados visuais sincronizados com tarefas reais (scan, limpeza, organização)
- Integração com comandos em linguagem natural e execução de ações no PC

## Futuro — Overlay transparente (Tauri)

Opcionalmente, BalDoX poderá aparecer em uma **janela overlay transparente** sobre o desktop do Windows:

- Personagem caminhando ou trabalhando em tempo real na área de trabalho
- Janela sem bordas, click-through configurável
- Controle via Tauri (multi-window + transparência)
- Ativável/desativável nas configurações

Esse modo complementa a interface in-app; não substitui o painel principal de conversa e controle.

## Estados de animação

| Estado | Quando usar | Comportamento visual |
|--------|-------------|----------------------|
| `idle` | Aguardando instrução | Respiração suave, brilho estável |
| `walking` | Patrulha no desktop companion | Ciclo de pernas/braços, olha na direção do movimento |
| `thinking` | Processando linguagem natural | Pulso ciano, olhos ativos |
| `scanning` | Varredura de disco/arquivos | Varredura horizontal, antena ativa |
| `organizing` | Movendo/organizando arquivos | Movimento lateral, indicadores de progresso |
| `success` | Tarefa concluída | Brilho verde breve, postura erguida |
| `warning` | Atenção ou confirmação necessária | Pulso âmbar, sinal de alerta |

## Princípios de design

1. **Clareza primeiro** — o usuário sempre sabe o que BalDoX está fazendo
2. **Ações reversíveis** — limpeza e organização passam por revisão
3. **Presença, não distração** — animações sutis; overlay opcional
4. **Evolução contínua** — cada fase do roadmap reforça a personalidade do BalDoX

## Personagem 3D

O BalDoX é renderizado como um cavaleiro procedural de baixa poligonagem usando **React Three Fiber** e primitivas Three.js — **sem assets de terceiros ou modelos do Mu Online**.

### Essência visual (referência de design)

| Elemento | Descrição |
|----------|-----------|
| Armadura | Placas angulares em teal/esmeralda (`#0d9488`) com emissão verde (`#00ff88`) |
| Asas | Estrutura escura com segmentos e bordas laranja/dourado emissivas (`#ff8800` / `#ffcc00`) |
| Espadas | Duas lâminas grandes com brilho verde emissivo |
| Partículas | Brasas laranjas flutuando das asas (Points + additive blending) |
| Iluminação | Point lights verde e laranja; fundo transparente integrado ao tema do app |

Imagem de referência de design: `public/baldox-reference.png`

### Animações por estado

| Estado | Comportamento 3D |
|--------|------------------|
| `idle` | Flutuação suave, respiração, batida de asas, rotação lenta |
| `thinking` | Pulso emissivo mais intenso, inclinação lateral, visor brilhante |
| `scanning` | Rotação horizontal do corpo, gema torácica pulsante |
| `organizing` | Movimento lateral sutil |
| `success` | Asas expandidas, salto leve |
| `warning` | Tom âmbar na armadura, tremor de alerta |

### Performance

- Geometria procedural (Box, Cylinder, Cone, Octahedron) — contagem baixa de polígonos
- `dpr={[1, 1.5]}` para limitar resolução em telas retina
- `frameloop="always"` para animação idle fluida
- `powerPreference: "low-power"` no contexto WebGL
- Fallback SVG automático via `<Suspense>` durante carregamento

### Onde ver

- **Dashboard** — card do assistente (`AiAssistantCard`, canvas ~128×112 px)
- **Página do assistente** — avatar grande na sidebar (`AssistantPage`, ~224×256 px)

## Referência técnica

- Constantes: `src/constants/assistant.ts`
- Avatar (Canvas + fallback): `src/components/baldox/BalDoXAvatar.tsx`
- Personagem 3D: `src/components/baldox/BalDoXCharacter3D.tsx`
- Chat interativo: `src/components/baldox/BalDoXChat.tsx`
- Plano de ação: `src/components/baldox/BalDoXPlanCard.tsx`
- Notificações proativas: `src/components/baldox/BalDoXNotifications.tsx`
- Intent + planos: `src/services/aiManager.ts`
- Executor de planos: `src/services/planExecutor.ts`
- Automação/background: `src/services/automationService.ts`
- Estado global chat: `src/stores/baldoxStore.ts`
- Página: `src/pages/AssistantPage.tsx`
- Dependências: `three`, `@react-three/fiber`, `@react-three/drei`

---

## Modelo de autonomia BalDoX (Fase 7+)

BalDoX opera como **guardião local inteligente** — proativo em background, mas **sempre pede confirmação no chat** antes de agir sobre arquivos ou executar planos.

### Filosofia: Local primeiro, confirmação sempre

| Princípio | Comportamento |
|-----------|---------------|
| **Inteligência local** | Modo padrão: parser rule-based + contexto do dashboard/scan (sem LLM online) |
| **Confirmação no chat** | Todo comando do usuário gera plano + "Quer que eu faça isso?" — [Sim, executar] / [Revisar] / [Cancelar] |
| **Autonomia segura** | Em background (modo secretário): só temp/cache Tier 1 + notificações proativas |
| **Proteção de dados** | Nunca apaga, move ou organiza arquivos do usuário sem confirmação explícita |

BalDoX explica ao usuário: *"Posso manter temp e alertas sozinho; qualquer outra ação preciso da sua confirmação, Comandante."*

### Comunicação

| Recurso | Descrição |
|---------|-----------|
| Chat completo | Mensagens do usuário + respostas com personalidade (profissional/warrior ou amigável) |
| Saudação proativa | Ao abrir o app, BalDoX informa status do disco e política de confirmação |
| Updates durante tarefas | "Estou analisando C:\...", "Encontrei 324 duplicados" |
| Chips de sugestão | Disparam planos (com confirmação obrigatória) |
| Indicador de digitação | "BalDoX processando…" durante execução |
| Avatar sincronizado | Estados `scanning`, `organizing`, `success`, `warning` |
| Badge **Local** | Padrão — "inteligente no seu PC" |

### Autonomia em background (modo secretário)

| Recurso | Autônomo? | Descrição |
|---------|-----------|-----------|
| Auto-limpar temp | Sim (opt-in) | Tier 1 via SafetyManager — caminhos seguros apenas |
| Alerta disco < N GB | Notificação | Avisa, não age sozinho |
| Scan desatualizado | Notificação | Sugere scan, não executa |
| Organizar Downloads | Notificação | Sugere, **não organiza** automaticamente |
| Delete / mover / quarentena | **Nunca** | Sempre exige confirmação no chat |

### Tiers de segurança

| Tier | Comportamento no chat | Comportamento em background |
|------|----------------------|----------------------------|
| **1 — SAFE** | Plano + confirmação obrigatória | Temp seguro pode auto-executar se habilitado |
| **2 — REVIEW** | Plano + confirmação obrigatória | Apenas notificação, nunca auto-executa |
| **3 — BLOCKED** | Recusado | Recusado |

### Fluxos end-to-end

1. **"Libere 20 GB"** → resposta + plano → "Quer que eu faça isso?" → confirmação → quarentena/limpeza
2. **"Organize Downloads"** → plano → confirmação → move
3. **"PC lento?"** → relatório imediato (disco/stats) + plano opcional de diagnóstico completo
4. **Background** → temp seguro limpo automaticamente (se habilitado) + alertas de disco/scan

### Auditoria

Toda ação BalDoX é registrada em `actions` com `source = "baldox"`. Consulte **Histórico → Auditoria de ações**.

---

## BalDoX IA — Modo online (opcional, avançado)

BalDoX funciona **localmente por padrão**. O modo online (LLM) é opcional e fica em Settings → Avançado.

### Modos de conexão

| Badge | Modo | Descrição |
|-------|------|-----------|
| **Local** | Padrão | Parser rule-based + contexto do PC — inteligente no seu PC |
| **Online** | LLM opt-in | API key + modo online habilitado explicitamente |
| **Offline** | Fallback | Tentou online, caiu para regras locais |

### Configuração (Settings → BalDoX Local → Avançado)

1. Modo padrão: **Local** (sem internet)
2. Opcional: expandir **Avançado: IA online** e configurar chave API
3. Ative **Modo secretário ativo** para monitoramento em background
4. Configure **Auto-limpar temp**, **Intervalo** (5–15 min) e **Minimizar para bandeja**

### Capacidades como secretário

| Recurso | Descrição |
|---------|-----------|
| Conversa local | Parser PT-BR + contexto do PC (disco, scan, apps, quarentena) |
| Conversa online (opcional) | LLM responde em PT-BR quando habilitado |
| Ações no PC | **Sempre** via ActionManager + confirmação explícita no chat |
| System tray | Ícone "BalDoX Guard" — Abrir, Chat, Quick Scan, Sair |
| Notificações nativas | Disco C: crítico, scan desatualizado (>7 dias), sugestões proativas |
| Fallback seguro | Sem API key ou modo local → inteligência rule-based automática |

### Segurança

- API key **nunca** é logada (proxy Rust mascara em erros)
- LLM **não** tem acesso a shell — apenas interpreta intenção
- Todas as operações de arquivo passam pelo **ActionManager** + **SafetyManager**
- Modo online requer opt-in explícito em Settings (seção avançada)
- **Chat nunca auto-executa** — mesmo com LLM online

### Arquivos

| Arquivo | Função |
|---------|--------|
| `src/services/llmService.ts` | Cliente OpenAI-compatible + streaming |
| `src/services/aiManager.ts` | Pipeline interpretMessage (LLM → fallback local) |
| `src/services/baldoxAgent.ts` | Orquestra chat, planos e status de conexão |
| `src/services/automationService.ts` | Secretário background + notificações |
| `src/components/baldox/BalDoXSecretaryInit.tsx` | Init tray + monitoramento |
| `src-tauri/src/commands/llm.rs` | Proxy Rust (evita CORS) |

### Dependências

- `@tauri-apps/plugin-notification` — notificações do sistema
- `tauri-plugin-notification` + `reqwest` (Rust)
- Feature `tray-icon` no Tauri 2

---

## BalDoX IA Local — Ollama (Fase 9)

BalDoX funciona como **IA local completa** via [Ollama](https://ollama.com), sem API key e sem internet obrigatória.

### Como funciona

| Prioridade | Modo | Badge no chat | Descrição |
|------------|------|---------------|-----------|
| 1 | **Local LLM (Ollama)** | `Local LLM` | LLM no seu PC — conversa, raciocínio e programação |
| 2 | **Local (regras)** | `Local` | Regex + contexto do PC — fallback honesto |
| 3 | **Online** (opcional) | `Online` | OpenAI-compatible — avançado |

Pipeline em `interpretMessage`: **Ollama → OpenAI (se configurado) → regras locais**.

### Instalar Ollama (Windows)

1. Baixe em [ollama.com](https://ollama.com) e instale
2. Abra um terminal e baixe um modelo:
   ```bash
   ollama pull llama3.2
   ```
3. Para programação, prefira modelos de código:
   ```bash
   ollama pull qwen2.5-coder
   ollama pull codellama
   ollama pull deepseek-coder
   ```
4. Certifique-se de que o Ollama está rodando (ícone na bandeja)
5. No BalDoX Guard: **Configurações → IA: Ollama local** → modo **Local LLM (Ollama)** → **Testar conexão**

### Modelos recomendados

| Modelo | Uso |
|--------|-----|
| `llama3.2` | Conversa geral e assistente |
| `qwen2.5-coder` | Programação (Python, TS, Rust…) |
| `codellama` | Snippets e debug |
| `deepseek-coder` | Código e refatoração |

### Programação no chat

- BalDoX explica, escreve snippets, debug e sugere correções em **português**
- Blocos de código renderizados com botão **Copiar**
- **Não executa código** no PC — orientação apenas
- Criar/editar arquivos só via ActionManager + confirmação explícita

### Limitações

- Sem Ollama: modo regras não simula IA completa — sugere instalar Ollama para código
- Qualidade depende do modelo e da RAM/VRAM disponível
- LLM local **não tem acesso a shell** — apenas interpreta intenção e responde
- Ações no PC (limpar, mover, quarentena) **sempre pedem confirmação** no chat
- Modo online (OpenAI) permanece opcional para quem preferir nuvem

### Arquivos

| Arquivo | Função |
|---------|--------|
| `src/services/ollamaService.ts` | Status, lista de modelos, teste de conexão |
| `src/services/llmService.ts` | `chatWithLocalLLM()` + detecção de perguntas de código |
| `src/services/aiManager.ts` | Pipeline Ollama-first + fallback programação |
| `src-tauri/src/commands/llm.rs` | `check_ollama_status`, `ollama_chat_completion` |
| `src/components/baldox/BalDoXChat.tsx` | Renderização de blocos de código |

---

## BalDoX — Modo voz (comandos e conversa)

BalDoX aceita **comandos de voz** e pode **responder falando**, usando APIs locais do Windows via WebView2 (Edge Chromium) — sem enviar áudio para serviços externos.

### Configuração (Settings → BalDoX — Modo voz)

| Opção | Descrição |
|-------|-----------|
| **Entrada por voz** | Exibe botão de microfone no chat |
| **Resposta falada** | BalDoX lê respostas em PT-BR (TTS) |
| **Conversa contínua** | Reabre o microfone após cada resposta falada |

### Uso no chat

1. Ative **Modo voz** em Settings e salve
2. Abra a página do assistente (`/assistant`)
3. Clique no **microfone** (dourado) para iniciar escuta — indicador vermelho pulsante
4. Fale seu comando em português (ex.: "Quanto espaço no C:?")
5. O texto transcrito aparece como mensagem sua e segue o fluxo normal
6. Com resposta falada ativa, BalDoX lê a resposta; avatar entra em estado `thinking` enquanto fala

### Comportamento

- **Click-to-toggle** — clique no mic para ouvir/parar (não é push-to-talk)
- Planos de ação longos: TTS fala apenas um resumo ("Preparei um plano…")
- Respostas muito longas são truncadas para TTS (~600 caracteres)
- Ações Tier 2+ continuam exigindo confirmação ("confirmo")
- Sem suporte Web Speech API: botão oculto + mensagem em português

### Arquivos

| Arquivo | Função |
|---------|--------|
| `src/services/voiceService.ts` | STT (`SpeechRecognition`) + TTS (`speechSynthesis`) |
| `src/components/baldox/BalDoXChat.tsx` | UI do microfone, estados visuais, integração |
| `src/pages/SettingsPage.tsx` | Toggles de modo voz |
| `src/constants/assistant.ts` | Labels e mensagens de voz |
