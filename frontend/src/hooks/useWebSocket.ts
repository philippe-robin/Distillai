import { useEffect, useRef, useState, useCallback } from "react";
import type { WSMessage } from "@/types/api";

const WS_BASE =
  window.location.protocol === "https:" ? "wss:" : "ws:";

interface UseWebSocketOptions {
  simulationId: string | null;
  onMessage?: (message: WSMessage) => void;
  enabled?: boolean;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  lastMessage: WSMessage | null;
  sendMessage: (data: unknown) => void;
  reconnect: () => void;
}

const MAX_RETRIES = 10;
const BASE_DELAY = 1000;
const MAX_DELAY = 30000;

export function useWebSocket({
  simulationId,
  onMessage,
  enabled = true,
}: UseWebSocketOptions): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onMessageRef = useRef(onMessage);

  // Keep onMessage ref updated without re-triggering the effect
  onMessageRef.current = onMessage;

  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const connect = useCallback(() => {
    if (!simulationId || !enabled) return;

    cleanup();

    const token = localStorage.getItem("auth_token");
    const url = `${WS_BASE}//${window.location.host}/api/ws/simulation/${simulationId}${token ? `?token=${token}` : ""}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      retriesRef.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data as string) as WSMessage;
        setLastMessage(message);
        onMessageRef.current?.(message);
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      wsRef.current = null;

      // Exponential backoff reconnect
      if (retriesRef.current < MAX_RETRIES && enabled) {
        const delay = Math.min(
          BASE_DELAY * Math.pow(2, retriesRef.current),
          MAX_DELAY,
        );
        retriesRef.current += 1;
        timeoutRef.current = setTimeout(connect, delay);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [simulationId, enabled, cleanup]);

  useEffect(() => {
    connect();
    return cleanup;
  }, [connect, cleanup]);

  const sendMessage = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  const reconnect = useCallback(() => {
    retriesRef.current = 0;
    connect();
  }, [connect]);

  return { isConnected, lastMessage, sendMessage, reconnect };
}
