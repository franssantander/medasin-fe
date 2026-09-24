import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { notificationKeys } from "./notification-query";

export function usePlanReminderEvents(userId?: number) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId || !process.env.NEXT_PUBLIC_REVERB_APP_KEY || !process.env.NEXT_PUBLIC_REVERB_HOST) {
      return;
    }

    let active = true;
    let disconnect: (() => void) | undefined;

    void import("@/lib/reverb/client")
      .then(({ createReverbClient }) => {
        if (!active) return;

        const echo = createReverbClient();
        if (!echo) return;

        const channel = `users.${userId}.notifications`;
        const refresh = () => {
          void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
        };

        echo.private(channel).listen(".calendar.plan-reminder.delivered", refresh);

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
