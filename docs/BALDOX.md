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

BalDoX opera como **braço direito** do usuário — proativo, comunicativo e capaz de executar fluxos multi-etapa, sempre dentro de limites de segurança.

### Comunicação

| Recurso | Descrição |
|---------|-----------|
| Chat completo | Mensagens do usuário + respostas com personalidade (profissional/warrior ou amigável) |
| Saudação proativa | Ao abrir o app, BalDoX informa status do disco e último scan |
| Updates durante tarefas | "Estou analisando C:\...", "Encontrei 324 duplicados" |
| Chips de sugestão | Disparam ações reais (scan, limpeza, organização) |
| Indicador de digitação | "BalDoX processando…" durante execução |
| Avatar sincronizado | Estados `scanning`, `organizing`, `success`, `warning` |

### Independência (dentro de limites seguros)

| Recurso | Configuração |
|---------|--------------|
| Auto-limpar temp | Settings → Tier 1, opt-in |
| Sugerir Downloads | Notificação proativa ao abrir |
| Alerta disco < N GB | Monitoramento a cada 5 min |
| Fila de tarefas | Planos multi-step com confirmação por etapa |
| Memória SQLite | Preferências, últimos comandos, saudação |
| Quick actions | Dashboard → ações sem digitar |

### Tiers de segurança

| Tier | Comportamento | Exemplos |
|------|---------------|----------|
| **1 — SAFE** | Pode auto-executar se habilitado | Limpar temp seguro |
| **2 — REVIEW** | Plano + [Aplicar]/[Revisar]/[Cancelar] | Mover, quarentena, delete, organizar |
| **3 — BLOCKED** | Recusado | Caminhos protegidos, bypass |

### Fluxos end-to-end

1. **"Libere 20 GB"** → scan → plano → confirmação → quarentena/limpeza
2. **"Organize Downloads"** → analyze → preview → confirmação → move
3. **"PC lento?"** → relatório: grandes + temp + apps
4. **"Rotina de manutenção"** → scan + temp + pastas vazias + resumo duplicados

### Auditoria

Toda ação BalDoX é registrada em `actions` com `source = "baldox"`. Consulte **Histórico → Auditoria de ações**.
