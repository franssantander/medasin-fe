import Echo from "laravel-echo";
import Pusher from "pusher-js";
import { axiosClient } from "@/lib/axios";

export function createReverbClient() {
  const key = process.env.NEXT_PUBLIC_REVERB_APP_KEY;
  const host = process.env.NEXT_PUBLIC_REVERB_HOST;
  const secure = process.env.NEXT_PUBLIC_REVERB_SCHEME === "https";
  const port = Number(process.env.NEXT_PUBLIC_REVERB_PORT ?? (secure ? 443 : 80));

  if (!key || !host || !Number.isInteger(port) || port < 1 || port > 65535) {
    return null;
  }

  return new Echo({
    broadcaster: "reverb",
    key,
    Pusher,
    wsHost: host,
    wsPort: port,
    wssPort: port,
    forceTLS: secure,
    enabledTransports: secure ? ["wss"] : ["ws"],
    withoutInterceptors: true,
    channelAuthorization: {
      customHandler: ({ socketId, channelName }, callback) => {
        axiosClient
          .post<{ auth: string }>("/broadcasting/auth", {
            socket_id: socketId,
            channel_name: channelName,
          })
          .then((response) => callback(null, response.data))
          .catch((error: unknown) => {
            callback(error instanceof Error ? error : new Error("Channel authorization failed."), null);
          });
      },
    },
  });
}
