"use client";

import { Bell, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/ui/toast-provider";
import { authFetch } from "@/lib/api-client";
import { listenForegroundPush, requestPushToken } from "@/lib/firebase-messaging";

const DISMISSED_KEY = "polla:notif-prompt-dismissed";

async function registerDeviceToken(fcmToken: string): Promise<boolean> {
  const base = process.env.NEXT_PUBLIC_NOTIFICATIONS_API_URL;
  if (!base) return false;
  const res = await authFetch(`${base}/devices/register`, {
    method: "POST",
    body: JSON.stringify({ fcmToken }),
  });
  return res.ok;
}

/**
 * Banner discreto para activar notificaciones push. Si el permiso ya estaba
 * otorgado de antes (otra sesión/dispositivo), reintenta el registro en
 * silencio sin mostrar nada — es idempotente del lado del backend
 * (notifications-svc dedupe por valor de token).
 */
export function NotificationPermissionPrompt() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [visible, setVisible] = useState(false);
  const attemptedSilent = useRef(false);

  useEffect(() => {
    if (!user) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;

    if (Notification.permission === "granted" && !attemptedSilent.current) {
      attemptedSilent.current = true;
      requestPushToken()
        .then((token) => (token ? registerDeviceToken(token) : undefined))
        .catch(() => {});
      return;
    }

    if (Notification.permission === "default" && localStorage.getItem(DISMISSED_KEY) !== "1") {
      setVisible(true);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return listenForegroundPush((title, body) => showToast(`${title}${body ? ` — ${body}` : ""}`, "info"));
  }, [user, showToast]);

  if (!visible) return null;

  async function handleActivate() {
    setVisible(false);
    const token = await requestPushToken();
    const registered = token ? await registerDeviceToken(token) : false;
    showToast(
      registered ? "Notificaciones activadas." : "No se pudieron activar las notificaciones.",
      registered ? "success" : "error",
    );
  }

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  }

  return (
    <div className="animate-in mx-auto flex w-full max-w-4xl items-center gap-3 border-b border-border bg-surface-alt px-4 py-2.5 text-sm text-text">
      <Bell size={16} className="shrink-0 text-accent" />
      <p className="flex-1">Activa las notificaciones para no perderte recordatorios y resultados de tus partidos.</p>
      <button
        type="button"
        onClick={handleActivate}
        className="transition-base shrink-0 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
      >
        Activar
      </button>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Descartar"
        className="transition-base shrink-0 rounded-md p-1 text-text-muted hover:bg-surface"
      >
        <X size={16} />
      </button>
    </div>
  );
}
