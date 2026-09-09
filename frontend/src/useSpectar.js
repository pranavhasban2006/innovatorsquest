import { useState, useEffect, useRef, useCallback } from 'react';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5000';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export function useSpectar() {
  const [sensorData, setSensorData] = useState(null);
  const [threatHistory, setThreatHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [connected, setConnected] = useState(false);
  const [breachState, setBreachState] = useState({ active: false, secondsRemaining: 0, reason: '', state: 'IDLE' });
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

  const fetchBreachStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/breach/status`);
      const data = await res.json();
      if (data.active) {
        setBreachState({
          active: true,
          secondsRemaining: data.secondsRemaining,
          reason: data.reason,
          state: 'ACTIVATED'
        });
      }
    } catch (e) {}
  }, []);

  const cancelBreach = useCallback(async () => {
    try {
      await fetch(`${API_URL}/breach/cancel`, { method: 'POST' });
    } catch (e) {
      console.error('Failed to cancel breach:', e);
    }
  }, []);

  const approveBreach = useCallback(async () => {
    try {
      await fetch(`${API_URL}/breach/approve`, {
        method: 'POST',
        headers: { 'x-breach-token': 'change_me_to_a_strong_random_string' }
      });
    } catch (e) {
      console.error('Failed to approve breach:', e);
    }
  }, []);

  const triggerBreach = useCallback(async (reason = "MANUAL_UI_TRIGGER") => {
    try {
      await fetch(`${API_URL}/breach/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
    } catch (e) {
      console.error('Failed to trigger breach:', e);
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
            } else if (msg.type === 'BREACH_STATE') {
              const bData = msg.data;
              if (bData.state === 'ACTIVATED' || bData.state === 'COUNTDOWN') {
                setBreachState({
                  active: true,
                  secondsRemaining: bData.secondsRemaining,
                  reason: bData.reason || 'DRONE BREACH',
                  state: bData.state
                });
              } else if (bData.state === 'CANCELLED') {
                setBreachState({ active: false, secondsRemaining: 0, reason: '', state: 'CANCELLED' });
              } else if (bData.state === 'EXECUTED') {
                setBreachState({ active: false, secondsRemaining: 0, reason: '', state: 'EXECUTED' });
                setThreatHistory([]);
                setSensorData(null);
              }
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
    fetchBreachStatus();
    connect();

    return () => {
      active = false;
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [fetchHistory, fetchBreachStatus]);

  return { sensorData, threatHistory, alerts, connected, breachState, cancelBreach, approveBreach, triggerBreach };
}