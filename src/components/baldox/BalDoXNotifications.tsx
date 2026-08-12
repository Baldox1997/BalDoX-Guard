import { Bell, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { BalDoXNotification } from "../../types/baldox";
import {
  markNotificationRead,
  subscribeNotifications,
} from "../../services/automationService";

interface BalDoXNotificationsProps {
  onAction?: (intent: string) => void;
}

export function BalDoXNotifications({ onAction }: BalDoXNotificationsProps) {
  const [notifications, setNotifications] = useState<BalDoXNotification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const unsub = subscribeNotifications(setNotifications);
    return () => { unsub(); };
  }, []);

  const unread = notifications.filter((n) => !n.read).length;

  if (notifications.length === 0) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative rounded-lg border border-border p-2 text-text-secondary hover:bg-surface-muted"
        aria-label="Notificações BalDoX"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-border bg-surface-elevated shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-semibold text-text-primary">BalDoX</span>
            <button type="button" onClick={() => setOpen(false)} className="text-text-secondary">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-72 overflow-y-auto p-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`mb-2 rounded-lg border p-3 text-sm ${
                  n.read ? "border-border opacity-70" : "border-cyan-500/30 bg-cyan-500/5"
                }`}
              >
                <p className="font-medium text-text-primary">{n.title}</p>
                <p className="mt-1 text-xs text-text-secondary">{n.message}</p>
                {n.actionLabel && n.actionIntent && (
                  <button
                    type="button"
                    onClick={() => {
                      markNotificationRead(n.id);
                      onAction?.(n.actionIntent!);
                      setOpen(false);
                    }}
                    className="mt-2 text-xs font-medium text-accent hover:underline"
                  >
                    {n.actionLabel}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
