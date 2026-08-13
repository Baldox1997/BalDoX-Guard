import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { initTrayListeners, startBackgroundMonitoring, stopBackgroundMonitoring } from "../../services/automationService";
import { refreshAiConnectionStatus, processBalDoXMessage } from "../../services/baldoxAgent";
import { api } from "../../services/apiService";

/** Inicializa secretário BalDoX: tray, monitoramento e status IA. */
export function BalDoXSecretaryInit() {
  const navigate = useNavigate();

  useEffect(() => {
    void refreshAiConnectionStatus();

    api.getSettings().then((s) => {
      startBackgroundMonitoring(s);
    }).catch(() => {});

    initTrayListeners(
      (path) => navigate(path),
      () => {
        navigate("/scanner");
        void processBalDoXMessage("escaneie meu pc", (p) => navigate(p));
      },
    );

    return () => stopBackgroundMonitoring();
  }, [navigate]);

  return null;
}
