import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import { Header } from "../components/Header";
import { ASSISTANT_NAME, ASSISTANT_SUBTITLE } from "../constants/assistant";
import { PRODUCT_NAME } from "../constants/brand";
import { NAV_ITEMS } from "../types/navigation";

const PAGE_TITLES: Record<string, { title: string; subtitle?: string }> = {
  "/": {
    title: "Dashboard",
    subtitle: "Visão geral do seu computador",
  },
  "/scanner": {
    title: "Scanner",
    subtitle: "Análise de unidades e diretórios",
  },
  "/files": {
    title: "Explorador de arquivos",
    subtitle: "Navegue e gerencie seus arquivos",
  },
  "/cleanup": {
    title: "Limpeza inteligente",
    subtitle: "Revise antes de remover",
  },
  "/duplicates": {
    title: "Arquivos duplicados",
    subtitle: "Detecte cópias idênticas",
  },
  "/large-files": {
    title: "Arquivos grandes",
    subtitle: "Itens que mais ocupam espaço",
  },
  "/old-files": {
    title: "Arquivos antigos",
    subtitle: "Filtrar por dias sem modificação",
  },
  "/organize": {
    title: "Organização inteligente",
    subtitle: "Categorize e mova com revisão",
  },
  "/apps": {
    title: "Aplicativos instalados",
    subtitle: "Desinstalação oficial do Windows",
  },
  "/assistant": {
    title: ASSISTANT_NAME,
    subtitle: ASSISTANT_SUBTITLE,
  },
  "/quarantine": {
    title: "Quarentena",
    subtitle: "Arquivos movidos com segurança",
  },
  "/history": {
    title: "Histórico e logs",
    subtitle: "Auditoria de ações",
  },
  "/settings": {
    title: "Configurações",
    subtitle: "Preferências do aplicativo",
  },
};

function getPageMeta(pathname: string) {
  const navItem = NAV_ITEMS.find((item) => item.path === pathname);
  return (
    PAGE_TITLES[pathname] ?? {
      title: navItem?.label ?? PRODUCT_NAME,
      subtitle: "Em desenvolvimento",
    }
  );
}

export function AppLayout() {
  const { pathname } = useLocation();
  const meta = getPageMeta(pathname);

  return (
    <div className="flex h-full bg-surface">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header title={meta.title} subtitle={meta.subtitle} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
