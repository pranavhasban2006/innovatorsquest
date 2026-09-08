import { useState, useEffect, useRef, useCallback } from 'react';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5000';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export function useSpectar() {
  const [sensorData, setSensorData] = useState(null);
  const [threatHistory, setThreatHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/sensor/history?limit=60`);
      const data = await res.json();
      const scores = data.map(d => ({ time: new Date(d.timestamp), value: d.threatScore || 0 }));
      setThreatHistory(scores);
    } catch {
      console.warn('History fetch failed, using simulated history');
    }
  }, []);

  useEffect(() => {
    let active = true;

    function connect() {
      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          if (active) setConnected(true);
          if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
        };

        ws.onmessage = (event) => {
          if (!active) return;
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'SENSOR_UPDATE') {
              setSensorData(msg.data);
              setThreatHistory(prev => {
                const next = [...prev, { time: new Date(msg.data.timestamp || Date.now()), value: msg.data.threatScore || 0 }];
                return next.slice(-60);
              });
            } else if (msg.type === 'ALERT') {
              setAlerts(prev => [msg.data, ...prev].slice(0, 10));
            }
          } catch { /* ignore parse errors */ }
        };

        ws.onclose = () => {
          if (active) {
            setConnected(false);
            reconnectTimer.current = setTimeout(connect, 3000);
          }
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        if (active) {
          reconnectTimer.current = setTimeout(connect, 3000);
        }
      }
    }

    fetchHistory();
    connect();

    return () => {
      active = false;
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [fetchHistory]);

  return { sensorData, threatHistory, alerts, connected };
}