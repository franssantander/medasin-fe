import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useEffectEvent } from "react";
import { notificationKeys } from "./notification-query";

type ReminderEvent = { notification_id?: string };

export function usePlanReminderEvents(userId?: number, onReminder?: (id: string) => void) {
  const queryClient = useQueryClient();
  const notify = useEffectEvent((id: string) => onReminder?.(id));

  useEffect(() => {
    if (!userId || !process.env.NEXT_PUBLIC_REVERB_APP_KEY || !process.env.NEXT_PUBLIC_REVERB_HOST) {
      return;
    }

    let active = true;
    let disconnect: (() => void) | undefined;
    const seenIds = new Set<string>();

    void import("@/lib/reverb/client")
      .then(({ createReverbClient }) => {
        if (!active) return;

        const echo = createReverbClient();
        if (!echo) return;

        const channel = `users.${userId}.notifications`;
        const refresh = () => {
          void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
        };

        echo.private(channel).listen(".calendar.plan-reminder.delivered", (event: ReminderEvent) => {
          refresh();
          const id = event.notification_id;
          if (!id || seenIds.has(id)) return;
          seenIds.add(id);
          notify(id);
        });

        let wasConnected = false;
        const unsubscribe = echo.connector.onConnectionChange((status) => {
          const connected = status === "connected";
          if (connected && !wasConnected) refresh();
          wasConnected = connected;
        });

        disconnect = () => {
          unsubscribe();
          echo.leave(channel);
          echo.disconnect();
        };

        if (echo.connectionStatus() === "connected") refresh();
      })
      .catch(() => {
        // HTTP polling remains available if the real-time client cannot load.
      });

    return () => {
      active = false;
      disconnect?.();
    };
  }, [queryClient, userId]);
}
