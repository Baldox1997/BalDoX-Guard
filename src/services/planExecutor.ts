import { listen } from "@tauri-apps/api/event";
import type { ActionItem } from "../types/api";
import type { BalDoXPlan } from "../types/baldox";
import { api } from "./apiService";
import {
  addMessage,
  setAnimationState,
  setNavigateTo,
  setPendingPlan,
  setProcessing,
} from "../stores/baldoxStore";

export async function executeBalDoXPlan(
  plan: BalDoXPlan,
  onNavigate?: (path: string) => void,
  onProgress?: (msg: string) => void,
): Promise<void> {
  setProcessing(true);
  setAnimationState("thinking");

  try {
    for (const step of plan.steps) {
      onProgress?.(step.label);
      const cmd = step.command ?? "";
      setAnimationState(
        cmd === "start_scan" ? "scanning"
        : cmd.includes("organ") ? "organizing"
        : "thinking",
      );

      switch (cmd) {
        case "start_scan": {
          const params = step.params as { paths?: string[] } | undefined;
          let paths = params?.paths?.filter(Boolean) ?? [];
          if (paths.length === 0) {
            const folders = await api.getSpecialFolders();
            const drives = await api.getDrives();
            paths = [
              ...(drives.find((d) => d.letter === "C:") ? ["C:\\Users"] : []),
              ...folders.map((f) => f.path),
            ].filter(Boolean);
          }
          await api.startScan(paths);
          await waitForScanComplete(onProgress);
          break;
        }
        case "search_files": {
          const params = step.params as {
            extension?: string;
            minSize?: number;
            days?: number;
            query?: string;
          } | undefined;
          const scan = await api.getLatestScan();
          if (!scan?.id) {
            addMessage({
              role: "assistant",
              content: "Sem scan recente. Iniciando varredura para indexar arquivos…",
              messageType: "text",
            });
            await executeBalDoXPlan(
              { ...plan, steps: [{ id: "s", label: "Scan", description: "", tier: "safe", command: "start_scan" }] },
              onNavigate,
            );
            const newScan = await api.getLatestScan();
            if (!newScan?.id) break;
          }
          const scanId = (await api.getLatestScan())?.id;
          if (!scanId) break;

          let files;
          if (params?.days) {
            files = await api.getOldFiles(scanId, params.days, 30);
          } else if (params?.minSize && !params?.extension) {
            files = await api.getLargeFiles(scanId, params.minSize, 30);
          } else {
            files = await api.searchFiles({
              scanId,
              extension: params?.extension,
              minSize: params?.minSize,
              limit: 30,
            });
          }

          const extLabel = params?.extension ? `.${params.extension}` : "arquivos";
          addMessage({
            role: "assistant",
            content: `Encontrei ${files.length} ${extLabel} no índice. Clique para abrir no Explorador.`,
            messageType: "file_list",
            files,
          });
          break;
        }
        case "analyze_organization": {
          const params = step.params as { path?: string } | undefined;
          const orgPlan = await api.analyzeOrganization(params?.path);
          addMessage({
            role: "assistant",
            content: `Encontrei ${orgPlan.total_files} arquivos para organizar (${formatBytes(orgPlan.total_bytes)}). Revise o plano antes de aplicar.`,
            messageType: "text",
          });
          setPendingPlan({
            ...plan,
            title: "Organizar — Confirmação",
            summary: `${orgPlan.total_files} arquivos em ${orgPlan.suggestions.length} movimentos`,
          });
          return;
        }
        case "execute_organization": {
          const orgPlan = await api.analyzeOrganization();
          const result = await api.executeOrganization(orgPlan, "baldox");
          addMessage({
            role: "assistant",
            content: result.success
              ? `Organização concluída! ${result.executed} arquivos movidos.`
              : `Parcial: ${result.executed} ok, ${result.failed.length} falhas.`,
            messageType: "execution_result",
          });
          break;
        }
        case "find_duplicates": {
          const scan = await api.getLatestScan();
          if (!scan?.id) {
            addMessage({ role: "assistant", content: "Preciso de um scan primeiro. Iniciando varredura…", messageType: "text" });
            await executeBalDoXPlan(
              { ...plan, steps: [{ id: "s", label: "Scan", description: "", tier: "safe", command: "start_scan" }] },
              onNavigate,
            );
            return;
          }
          addMessage({ role: "assistant", content: "Analisando duplicados — isso pode levar alguns minutos…", messageType: "text" });
          const dupes = await api.findDuplicates(scan.id);
          const waste = dupes.reduce((s, g) => s + g.wasted_bytes, 0);
          addMessage({
            role: "assistant",
            content: `Encontrei ${dupes.length} grupos de duplicados — ${formatBytes(waste)} recuperáveis. Veja a página Duplicados para agir.`,
            messageType: "execution_result",
          });
          break;
        }
        case "analyze_cleanup": {
          const candidates = await api.analyzeCleanup();
          addMessage({
            role: "assistant",
            content: `${candidates.length} candidatos de limpeza (${formatBytes(candidates.reduce((s, c) => s + c.size, 0))}). Revise em Limpeza.`,
            messageType: "text",
          });
          break;
        }
        case "auto_clean_temp": {
          const cleaned = await api.autoCleanTempSafe();
          addMessage({
            role: "assistant",
            content: cleaned.length > 0
              ? `Limpei ${cleaned.length} itens temporários com segurança.`
              : "Nenhum temporário seguro para remover agora.",
            messageType: "execution_result",
          });
          break;
        }
        case "get_large_files": {
          const scan = await api.getLatestScan();
          if (!scan?.id) {
            addMessage({ role: "assistant", content: "Sem scan recente. Execute o Scanner primeiro.", messageType: "text" });
            break;
          }
          const files = await api.getLargeFiles(scan.id, undefined, 15);
          addMessage({
            role: "assistant",
            content: `${files.length} arquivos acima de 100 MB. Maior: ${files[0]?.name ?? "N/A"} (${formatBytes(files[0]?.size ?? 0)}).`,
            messageType: "file_list",
            files,
          });
          break;
        }
        case "get_disk_stats": {
          const data = await api.getDashboardData();
          addMessage({
            role: "assistant",
            content: `Disco ${data.storage.drive_letter}: ${formatBytes(data.storage.free_bytes)} livres de ${formatBytes(data.storage.total_bytes)} (${data.storage.usage_percent.toFixed(0)}% usado).`,
            messageType: "disk_stats",
            diskStats: [data.storage],
          });
          break;
        }
        case "get_all_drives_stats": {
          const drives = await api.getAllDrivesStats();
          const summary = drives.map((d) => `${d.letter}: ${formatBytes(d.free_bytes)} livres (${d.usage_percent.toFixed(0)}% usado)`).join("\n");
          addMessage({
            role: "assistant",
            content: `Status de todos os drives:\n${summary}`,
            messageType: "disk_stats",
            diskStats: drives.map((d) => ({
              used_bytes: d.used_bytes,
              total_bytes: d.total_bytes,
              usage_percent: d.usage_percent,
              drive_letter: d.letter,
              free_bytes: d.free_bytes,
            })),
          });
          break;
        }
        case "get_largest_folders": {
          const folders = await api.getLargestFolders(undefined, 10);
          if (folders.length === 0) {
            addMessage({ role: "assistant", content: "Execute um scan para listar pastas grandes.", messageType: "text" });
            break;
          }
          const lines = folders.slice(0, 5).map((f) => `• ${f.name}: ${formatBytes(f.bytes)}`).join("\n");
          addMessage({
            role: "assistant",
            content: `Top pastas por tamanho:\n${lines}`,
            messageType: "text",
          });
          setNavigateTo("/diagnostics");
          onNavigate?.("/diagnostics");
          break;
        }
        case "scan_apps": {
          const apps = await api.scanApps();
          addMessage({
            role: "assistant",
            content: `${apps.length} aplicativos instalados detectados. Abra Apps para gerenciar.`,
            messageType: "execution_result",
          });
          break;
        }
        case "get_old_files": {
          const scan = await api.getLatestScan();
          if (!scan?.id) break;
          const old = await api.getOldFiles(scan.id, 365, 20);
          addMessage({
            role: "assistant",
            content: `${old.length} arquivos sem modificação há mais de 1 ano.`,
            messageType: "file_list",
            files: old,
          });
          break;
        }
        case "quarantine_stats": {
          const items = await api.listQuarantine();
          const total = items.reduce((s, q) => s + q.size, 0);
          addMessage({
            role: "assistant",
            content: items.length > 0
              ? `${items.length} itens na quarentena (${formatBytes(total)}). Abra Quarentena para restaurar ou excluir.`
              : "Quarentena vazia — nenhum arquivo isolado no momento.",
            messageType: "execution_result",
          });
          setNavigateTo("/quarantine");
          onNavigate?.("/quarantine");
          break;
        }
        case "quarantine_paths": {
          const params = step.params as { paths?: string[] } | undefined;
          if (params?.paths?.length) {
            await quarantinePaths(params.paths);
          } else {
            addMessage({
              role: "assistant",
              content: "Informe os caminhos dos arquivos para quarentena ou use a página de Limpeza.",
              messageType: "text",
            });
          }
          break;
        }
        case "navigate": {
          const params = step.params as { route?: string } | undefined;
          const route = params?.route ?? "/";
          addMessage({
            role: "assistant",
            content: `Abrindo ${route}…`,
            messageType: "text",
            navigateTo: route,
          });
          setNavigateTo(route);
          onNavigate?.(route);
          break;
        }
        case "preview_manage":
        case "execute_manage": {
          const params = step.params as { paths?: string[]; action?: string } | undefined;
          const paths = params?.paths ?? [];
          if (paths.length === 0) break;
          if (cmd === "preview_manage") {
            const items: ActionItem[] = paths.map((p) => ({
              action_type: params?.action === "delete" ? "DELETE" : "QUARANTINE",
              source: p,
              reason: "BalDoX — ação solicitada via chat",
            }));
            const preview = await api.previewAction(items);
            if (preview.blocked.length > 0) {
              addMessage({ role: "assistant", content: `Bloqueados: ${preview.blocked.join(", ")}`, messageType: "text" });
            }
            addMessage({
              role: "assistant",
              content: `${preview.items.length} itens prontos (${formatBytes(preview.total_bytes)}). Diga "confirmo" para executar.`,
              messageType: "action_plan",
            });
            setPendingPlan(plan);
            return;
          }
          if (params?.action === "delete") {
            const items: ActionItem[] = paths.map((p) => ({
              action_type: "DELETE",
              source: p,
              reason: "BalDoX — exclusão confirmada",
            }));
            const preview = await api.previewAction(items);
            const result = await api.executeAction(preview.items, "baldox");
            addMessage({
              role: "assistant",
              content: result.success ? `${result.executed} itens removidos.` : `Parcial: ${result.executed} ok.`,
              messageType: "execution_result",
            });
          } else {
            await quarantinePaths(paths);
          }
          break;
        }
        default:
          break;
      }

      await api.logBaldoxAction(step.id, step.label, "completed").catch(() => {});
    }

    setAnimationState("success");
    addMessage({ role: "assistant", content: "Missão cumprida, Comandante!", messageType: "execution_result" });
    setTimeout(() => setAnimationState("idle"), 2000);
  } catch (err) {
    setAnimationState("warning");
    addMessage({
      role: "assistant",
      content: `Encontrei um obstáculo: ${err instanceof Error ? err.message : String(err)}`,
      messageType: "text",
    });
  } finally {
    setProcessing(false);
    setPendingPlan(null);
  }
}

async function waitForScanComplete(onProgress?: (msg: string) => void): Promise<void> {
  return new Promise((resolve) => {
    let unlisten: (() => void) | undefined;
    const poll = setInterval(async () => {
      try {
        const p = await api.getScanProgress();
        onProgress?.(`Escaneando: ${p.files_scanned} arquivos — ${p.current_path.slice(-40)}`);
        if (p.status === "completed" || p.status === "cancelled") {
          clearInterval(poll);
          unlisten?.();
          addMessage({
            role: "assistant",
            content: p.status === "completed"
              ? `Scan concluído: ${p.files_scanned.toLocaleString()} arquivos, ${formatBytes(p.total_size)}.`
              : "Scan cancelado.",
            messageType: "execution_result",
          });
          resolve();
        }
      } catch {
        clearInterval(poll);
        resolve();
      }
    }, 1000);

    listen<{ status: string; files_scanned: number; total_size: number }>("scan-complete", (e) => {
      clearInterval(poll);
      addMessage({
        role: "assistant",
        content: `Scan concluído: ${e.payload.files_scanned.toLocaleString()} arquivos.`,
        messageType: "execution_result",
      });
      resolve();
    }).then((fn) => {
      unlisten = fn;
    });
  });
}

export async function quarantinePaths(paths: string[]): Promise<void> {
  const items: ActionItem[] = paths.map((p) => ({
    action_type: "QUARANTINE",
    source: p,
    reason: "BalDoX — liberação de espaço",
  }));
  const preview = await api.previewAction(items);
  if (preview.blocked.length > 0) {
    addMessage({ role: "assistant", content: `Bloqueados: ${preview.blocked.join(", ")}`, messageType: "text" });
  }
  const result = await api.executeAction(preview.items, "baldox");
  addMessage({
    role: "assistant",
    content: result.success
      ? `${result.executed} arquivos movidos para quarentena.`
      : `Resultado parcial: ${result.executed} ok.`,
    messageType: "execution_result",
  });
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** exp).toFixed(1)} ${units[exp]}`;
}
