import { useEffect, useRef, useCallback } from 'react';

export type WsMessage = 
  | { type: 'comment_added'; itemId: string; comment: Record<string, unknown> }
  | { type: 'comment_deleted'; commentId: string; itemId: string }
  | { type: 'attachment_added'; itemId: string; attachment: Record<string, unknown> }
  | { type: 'item_updated'; itemId: string; changes: Record<string, unknown> }
  | { type: string; [key: string]: unknown };

interface UseWebSocketOptions {
  onMessage?: (msg: WsMessage) => void;
  enabled?: boolean;
}

export function useWebSocket({ onMessage, enabled = true }: UseWebSocketOptions = {}) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const connect = useCallback(() => {
    if (!enabled || !mounted.current) return;
    try {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // In dev the API runs on port 4000; in prod same origin
      const host = window.location.hostname === 'localhost' ? 'localhost:4000' : window.location.host;
      const ws = new WebSocket(`${proto}//${host}/ws`);
      wsRef.current = ws;

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data) as WsMessage;
          onMessageRef.current?.(msg);
        } catch {}
      };

      ws.onclose = () => {
        if (!mounted.current) return;
        // Reconnect after 3s
        reconnectTimer.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => { ws.close(); };
    } catch {}
  }, [enabled]);

  useEffect(() => {
    mounted.current = true;
    connect();
    return () => {
      mounted.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((msg: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  return { send };
}
