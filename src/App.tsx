import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AppLayout } from "./layouts/AppLayout";

import { AssistantPage } from "./pages/AssistantPage";

import { DashboardPage } from "./pages/DashboardPage";

import { SettingsPage } from "./pages/SettingsPage";

import { ScannerPage } from "./pages/ScannerPage";

import { ExplorerPage } from "./pages/ExplorerPage";

import { CleanupPage } from "./pages/CleanupPage";

import { DuplicatesPage } from "./pages/DuplicatesPage";

import { LargeFilesPage } from "./pages/LargeFilesPage";

import { OldFilesPage } from "./pages/OldFilesPage";

import { AppsPage } from "./pages/AppsPage";

import { QuarantinePage } from "./pages/QuarantinePage";

import { HistoryPage } from "./pages/HistoryPage";

import { OrganizationPage } from "./pages/OrganizationPage";

import { ControlPanelPage } from "./pages/ControlPanelPage";

import { DiagnosticsPage } from "./pages/DiagnosticsPage";



export default function App() {

  return (

    <BrowserRouter>

      <Routes>

        <Route element={<AppLayout />}>

          <Route index element={<DashboardPage />} />

          <Route path="control" element={<ControlPanelPage />} />

          <Route path="diagnostics" element={<DiagnosticsPage />} />

          <Route path="scanner" element={<ScannerPage />} />

          <Route path="files" element={<ExplorerPage />} />

          <Route path="cleanup" element={<CleanupPage />} />

          <Route path="duplicates" element={<DuplicatesPage />} />

          <Route path="large-files" element={<LargeFilesPage />} />

          <Route path="old-files" element={<OldFilesPage />} />

          <Route path="organize" element={<OrganizationPage />} />

          <Route path="apps" element={<AppsPage />} />

          <Route path="assistant" element={<AssistantPage />} />

          <Route path="quarantine" element={<QuarantinePage />} />

          <Route path="history" element={<HistoryPage />} />

          <Route path="settings" element={<SettingsPage />} />

          <Route path="*" element={<Navigate to="/" replace />} />

        </Route>

      </Routes>

    </BrowserRouter>

  );

}

