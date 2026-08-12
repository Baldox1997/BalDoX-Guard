# BalDoX Guard

**BalDoX Guard — Seu Guardião Digital**

Gerenciador inteligente do Windows construído com **Tauri 2**, **React**, **TypeScript**, **Vite**, **Tailwind CSS**, **Rust** e **SQLite**.

*Guerreiro digital do seu computador* — utilitário corporativo com o assistente **BalDoX** como guardião do seu PC.

## Status atual — Fases 2 a 8 + BalDoX Autônomo

Aplicativo **funcional** para mapear, limpar, organizar e otimizar o PC com revisão antes de ações destrutivas.

### Funcionalidades implementadas

| Módulo | O que faz |
|--------|-----------|
| **Scanner** | Varredura incremental de drives e pastas especiais, progresso em tempo real, cancelamento, SQLite |
| **Explorador** | Navegação livre em qualquer caminho, multi-seleção, mover/copiar/renomear/excluir, busca avançada |
| **Arquivos grandes** | Top arquivos por tamanho (100 MB+) do último scan |
| **Arquivos antigos** | Filtro 30/90/180/365/730 dias |
| **Duplicados** | Pipeline tamanho → hash parcial → hash completo |
| **Limpeza** | Temp/cache seguro, revisão, quarentena padrão |
| **Quarentena** | Move para `D:\SmartPCManager\Quarantine`, restaurar/excluir |
| **Organização** | Categoriza Downloads em subpastas (Images, Documents, etc.) |
| **Aplicativos** | Lista via registro Windows, desinstalação oficial |
| **BalDoX** | Chat interativo, planos de ação, automação Tier 1–3 |
| **Histórico** | Scans + auditoria de ações (incl. BalDoX) |
| **Configurações** | Tema, automação BalDoX, quarentena, alertas de disco |
| **Dashboard** | Dados reais de disco e último scan |
| **Painel de Controle** | Hub central: drives em tempo real, saúde do sistema, atalhos para todos os módulos |
| **Diagnóstico** | SO, RAM, CPU, breakdown por categoria, pastas grandes, timeline de scans |

### Painel de Controle

O **Painel de Controle** (`/control`) é o centro de comando do BalDoX Guard:

- **Armazenamento por drive** — espaço usado/livre em todos os drives (atualização automática)
- **Saúde do sistema** — RAM, uptime, CPU e SO
- **Arquivos indexados** — contagem e tamanho do último scan
- **Espaço recuperável** — estimativa de temp/cache seguro
- **Ações recentes** — auditoria resumida
- **Atalhos rápidos** — Explorador, Diagnóstico, Scanner, Limpeza e mais

O **Explorador** (`/files`) oferece liberdade total de gerenciamento:

- Barra de endereço com acesso a qualquer drive (`C:\`, `D:\`, etc.)
- Multi-seleção: mover, copiar, renomear, excluir, nova pasta
- Exclusão via quarentena (padrão) ou permanente (configurável)
- Painel de propriedades com hash SHA-256 sob demanda
- Menu de contexto e abrir no Explorer do Windows
- Busca avançada: índice do scan + busca ao vivo, filtros de duplicados/arquivos vazios, export CSV

O **Diagnóstico** (`/diagnostics`) mede e analisa:

- Informações do sistema (OS, RAM, CPU, uptime)
- Overview de todos os drives
- Gráfico "O que ocupa meu PC?" por categoria
- Timeline de scans e top pastas grandes
- Analisador de pasta sob demanda

**BalDoX** responde a comandos como "Quanto espaço no D:", "Mostre pastas grandes" e "Exclua selecionados" (com confirmação).

### Segurança (obrigatório)

- **SafetyManager**: bloqueia `C:\Windows`, System32, Program Files, etc.
- **ActionManager**: preview → validate → execute
- **Nunca auto-delete**: quarentena antes de exclusão permanente
- **BalDoX Tier 2+**: sempre exige [Aplicar] / [Revisar] / [Cancelar]

## BalDoX — Guerreiro digital do seu computador

Assistente com personalidade de guardião/warrior leal. Veja [`docs/BALDOX.md`](docs/BALDOX.md).

**Comandos de exemplo:**

- "Libere 20 GB"
- "Organize meus downloads"
- "O que está deixando meu PC lento?"
- "Rotina de manutenção"
- "Encontre arquivos duplicados"

## Identidade visual

| Asset | Caminho |
|-------|---------|
| Hero banner | `public/baldox-guard-hero.png` |
| Ícone do app | `public/baldox-guard-icon.png` |
| Logo SVG (legado) | `public/baldox-logo.svg` |
| Referência visual | `public/baldox-reference.png` |
| Constantes de marca | `src/constants/brand.ts` |

### Ícones Tauri (instalador Windows)

Para regenerar ícones do instalador a partir do logo:

```bash
npm run tauri icon public/baldox-logo.svg
```

Isso atualiza `src-tauri/icons/` (32x32, 128x128, icon.ico, etc.).

## Pré-requisitos (Windows)

1. [Node.js](https://nodejs.org/) 18+
2. [Rust](https://www.rust-lang.org/tools/install) (rustup)
3. [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
4. [WebView2](https://developer.microsoft.com/microsoft-edge/webview2/)

## Desenvolvimento

```bash
cd smart-pc-manager
npm install
npm run tauri dev
```

## Build

```bash
npm run build          # Frontend
npm run tauri build    # Instalador Windows
```

Instalação atual: `D:\Programs\Smart PC Manager\` (executável `baldox-guard.exe`)

## Arquitetura

```text
Interface (React + BalDoX Guard)
    ↓
Services (apiService, aiManager, automationService)
    ↓
Tauri Commands
    ↓
Rust (scanner, actions, safety, cleaner, SQLite)
    ↓
Windows / File System
```

## Banco de dados

SQLite em `%LOCALAPPDATA%\SmartPCManager\smart-pc-manager.db`

Tabelas: `scan_history`, `files`, `quarantine`, `actions`, `installed_apps`, `settings`
