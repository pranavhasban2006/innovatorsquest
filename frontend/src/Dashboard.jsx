import React, { useState, useEffect } from 'react';
import { ThreatLevel } from './ThreatLevel';
import HumanDetection from './HumanDetection';
import WeaponDetection from './WeaponDetection';
import ThreatGraph from './ThreatGraph';
import GPSMap from './GPSMap';
import { 
  ShieldAlert, Activity, Thermometer, Compass, Navigation, Radar, 
  AlertTriangle, ShieldCheck, Database, Radio, Crosshair, Mail
} from 'lucide-react';

export default function Dashboard({ 
  sensorData, threatHistory, alerts, connected,
  breachState, cancelBreach, approveBreach, triggerBreach 
}) {
  const [time, setTime] = useState(new Date());
  const [emailTesting, setEmailTesting] = useState(false);
  const [emailToast, setEmailToast] = useState(null);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleTestEmail = async () => {
    setEmailTesting(true);
    setEmailToast({ type: 'info', message: 'Initiating tactical email alert dispatch...' });
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const res = await fetch(`${backendUrl}/api/alerts/test-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: "🚨 TEST ALERT: SPECTR Security Protocol Verification",
          message: "This is an automated test email sent from the SPECTR Tactical Command Center to verify email alert system functionality."
        })
      });
      const data = await res.json();
      if (data.success) {
        setEmailToast({ 
          type: 'success', 
          message: `✅ Email Dispatched! (${data.details?.provider || 'Success'}) ${data.details?.etherealUrl ? `[View Sandbox: ${data.details.etherealUrl}]` : ''}` 
        });
      } else {
        setEmailToast({ type: 'error', message: `❌ Email Failed: ${data.error}` });
      }
    } catch (err) {
      setEmailToast({ type: 'error', message: `❌ Connection Error: ${err.message}` });
    } finally {
      setEmailTesting(false);
      setTimeout(() => setEmailToast(null), 10000);
    }
  };

  const sd = sensorData || {};
  const human = sd.humanDetected || false;
  const weapon = sd.weaponDetected || false;
  const weaponConf = sd.weaponConfidence || 0;
  const cameraStatus = sd.cameraStatus || "NOT CONNECTED";
  const detectionConfidence = sd.detectionConfidence || 0;
  const detectionCount = sd.detectionCount || 0;
  const temp = sd.temperature || 40.5;
  const humidity = sd.humidity || 50;
  const pitch = sd.pitch || 0.0;
  const roll = sd.roll || -21.8;
  const magHeading = sd.magneticHeading || 108;
  const magnetic = sd.magnetic !== undefined ? sd.magnetic : 1; 
  const frontDist = sd.frontDist || 150;
  const sideDist = sd.sideDist || 150;
  const obstacle = sd.obstacle || "CLEAR";
  const magDec = sd.magDeclination || 2.3;
  const lat = (sd.latitude && sd.latitude !== 0) ? sd.latitude : 26.91240;
  const lng = (sd.longitude && sd.longitude !== 0) ? sd.longitude : 75.78730;
  const speed = sd.speed || 3.8;
  const heading = sd.heading || 52;
  const threatScore = weapon ? Math.max(sd.threatScore || 92, 90) : (sd.threatScore || 86);

  const isBreach = threatScore > 65 || human || weapon || breachState?.active;
  const isElevated = threatScore > 35 && !isBreach;

  return (
    <div className={`min-h-screen max-w-[1530px] mx-auto p-3 lg:p-5 flex flex-col gap-4 tactical-grid-bg text-slate-100 relative transition-all duration-500 ${isBreach ? 'breach-alert-perimeter' : ''}`}>
      
      {/* Background Cyber Glow Tint */}
      {weapon ? (
        <div className="fixed inset-0 bg-[#ff0055]/10 pointer-events-none z-0 transition-opacity duration-500 animate-pulse" />
      ) : isBreach ? (
        <div className="fixed inset-0 bg-[#ff0055]/5 pointer-events-none z-0 transition-opacity duration-500" />
      ) : isElevated ? (
        <div className="fixed inset-0 bg-[#ffb700]/5 pointer-events-none z-0 transition-opacity duration-500" />
      ) : null}

      {/* ======================= CRITICAL BREACH & PURGE BANNER ======================= */}
      {breachState?.active && (
        <div className="bg-[#1a050d] border-2 border-[#ff0055] rounded-xl p-4 shadow-[0_0_30px_rgba(255,0,85,0.4)] animate-pulse text-white flex flex-col md:flex-row items-center justify-between gap-4 z-50">
          <div className="flex items-center gap-4">
            <div className="bg-[#ff0055] p-3 rounded-full animate-bounce shadow-[0_0_15px_#ff0055]">
              <ShieldAlert className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-['Orbitron'] font-bold tracking-wider text-[#ff0055]">🚨 CRITICAL BREACH PROTOCOL ACTIVATED</h2>
                <span className="bg-[#ff0055] text-white text-xs px-2 py-0.5 rounded-xs font-['Share_Tech_Mono'] font-bold animate-pulse">AUTO-PURGE IN PROGRESS</span>
              </div>
              <p className="text-sm text-slate-300 mt-1 font-['Share_Tech_Mono']">
                REASON: <span className="text-white font-bold">{breachState.reason || "DRONE CAPTURE / SYSTEM INTRUSION"}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-center px-4 py-2 bg-slate-950/80 border border-[#ff0055]/60 rounded-lg">
              <div className="text-3xl font-['Orbitron'] font-black text-[#ff0055]">{breachState.secondsRemaining || 30}s</div>
              <div className="text-[10px] text-slate-400 font-['Share_Tech_Mono'] tracking-widest uppercase">AUTO PURGE TIMER</div>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={cancelBreach}
                className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-md font-['Orbitron'] font-bold text-xs border border-slate-600 transition-all flex items-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-[#00ff9d]" />
                ABORT WIPE
              </button>
              <button 
                onClick={approveBreach}
                className="bg-[#ff0055] hover:bg-red-700 text-white px-4 py-2 rounded-md font-['Orbitron'] font-bold text-xs shadow-[0_0_15px_#ff0055] transition-all flex items-center gap-2 cursor-pointer"
              >
                <AlertTriangle className="w-4 h-4 text-white" />
                PURGE NOW
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================= TACTICAL CYBER HEADER ======================= */}
      <header className={`cyber-glass ${weapon ? 'tactical-corner-danger cyber-glow-crimson' : isBreach ? 'tactical-corner-danger border-[#ff0055]/50' : isElevated ? 'tactical-corner-amber border-[#ffb700]/50' : 'tactical-corner border-cyan-500/20'} p-3.5 lg:px-6 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4 z-10`}>
        
        {/* Title & Terminal ID */}
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 border rounded-lg ${weapon ? 'border-[#ff0055] bg-[#ff0055]/20 text-[#ff0055] animate-bounce' : isBreach ? 'border-[#ff0055] bg-[#ff0055]/20 text-[#ff0055]' : isElevated ? 'border-[#ffb700] bg-[#ffb700]/20 text-[#ffb700]' : 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400'} flex items-center justify-center`}>
              <ShieldAlert size={24} className={isBreach ? "animate-pulse" : ""} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="font-['Orbitron'] text-2xl font-black tracking-[0.25em] text-gradient-cyan leading-none">SPECTR</h1>
                <span className="text-[10px] font-['Share_Tech_Mono'] text-cyan-400 border border-cyan-500/40 px-2 py-0.5 bg-cyan-500/10 tracking-wider uppercase font-bold rounded-xs">
                  DAYLIGHT CONTROL TOWER
                </span>
              </div>
              <span className="text-[9px] font-['Share_Tech_Mono'] text-slate-400 tracking-[0.22em] uppercase block mt-1 font-semibold">
                QUANTUM TACTICAL SURVEILLANCE & RECON SYSTEM
              </span>
            </div>
          </div>
        </div>

        {/* Center Threat State Banner */}
        <div className="flex items-center justify-center">
          {breachState?.active ? (
            <div className="flex items-center gap-2 border border-[#ff0055] bg-[#ff0055]/20 text-[#ff0055] px-4 py-1.5 text-xs font-['Orbitron'] font-bold tracking-[0.2em] animate-pulse shadow-[0_0_15px_#ff0055] rounded-xs">
              <ShieldAlert size={16} className="animate-bounce" /> 🚨 BREACH IN PROGRESS // PURGE IN {breachState.secondsRemaining}s
            </div>
          ) : weapon ? (
            <div className="flex items-center gap-2 border border-[#ff0055] bg-[#ff0055]/20 text-[#ff0055] px-4 py-1.5 text-xs font-['Orbitron'] font-bold tracking-[0.2em] animate-bounce shadow-[0_0_15px_#ff0055] rounded-xs">
              <Crosshair size={16} className="animate-spin" /> [!] WEAPON DETECTED // CRITICAL BREACH ESCALATION ({threatScore}%)
            </div>
          ) : isBreach ? (
            <div className="flex items-center gap-2 border border-[#ff0055] bg-[#ff0055]/20 text-[#ff0055] px-4 py-1.5 text-xs font-['Orbitron'] font-bold tracking-[0.2em] animate-pulse shadow-[0_0_10px_#ff0055] rounded-xs">
              <AlertTriangle size={16} /> CRITICAL BREACH ALERT // THREAT {threatScore}%
            </div>
          ) : isElevated ? (
            <div className="flex items-center gap-2 border border-[#ffb700] bg-[#ffb700]/15 text-[#ffb700] px-4 py-1.5 text-xs font-['Orbitron'] font-bold tracking-[0.2em] rounded-xs">
              <Activity size={16} /> ELEVATED ANOMALY // MONITORING
            </div>
          ) : (
            <div className="flex items-center gap-2 border border-[#00ff9d]/40 bg-[#00ff9d]/10 text-[#00ff9d] px-4 py-1.5 text-xs font-['Orbitron'] font-bold tracking-[0.2em] rounded-xs">
              <ShieldCheck size={16} /> ALL SYSTEMS NOMINAL // AIRSPACE SECURE
            </div>
          )}
        </div>

        {/* Right Info & Controls */}
        <div className="flex items-center gap-3 text-right">
          
          {/* Connection Status Badge */}
          <div className={`flex items-center gap-2 px-3 py-1.5 border text-[10px] font-['Share_Tech_Mono'] tracking-wider uppercase font-bold rounded-xs ${connected ? 'border-[#00ff9d]/40 bg-[#00ff9d]/10 text-[#00ff9d]' : 'border-[#ff0055]/60 bg-[#ff0055]/20 text-[#ff0055] animate-pulse'}`}>
            <Radio size={13} className={connected ? "animate-pulse" : ""} />
            {connected ? 'WS LINK: ONLINE' : 'WS LINK: OFFLINE'}
          </div>

          {/* Test Email Button */}
          <button 
            onClick={handleTestEmail}
            disabled={emailTesting}
            title="Dispatch Test Tactical Email Alert"
            className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[10px] font-['Orbitron'] font-bold px-3 py-1.5 rounded-xs border border-cyan-500/40 tracking-wider uppercase cursor-pointer flex items-center gap-1.5 shadow-[0_0_10px_rgba(0,240,255,0.2)] transition-all disabled:opacity-50"
          >
            <Mail size={13} className={emailTesting ? "animate-spin" : ""} />
            {emailTesting ? "SENDING..." : "TEST EMAIL"}
          </button>

          {/* Emergency Trigger Button */}
          {!breachState?.active && (
            <button 
              onClick={() => triggerBreach("COMMAND_MANUAL_EMERGENCY")}
              title="Initiate Emergency Security Purge Protocol"
              className="bg-[#ff0055]/20 hover:bg-[#ff0055]/40 text-[#ff0055] text-[10px] font-['Orbitron'] font-bold px-3 py-1.5 rounded-xs border border-[#ff0055]/60 tracking-wider uppercase cursor-pointer flex items-center gap-1.5 shadow-[0_0_12px_rgba(255,0,85,0.3)] transition-all"
            >
              <AlertTriangle size={13} />
              PURGE
            </button>
          )}

          {/* Clock */}
          <div className="flex flex-col text-right border-l border-cyan-500/20 pl-3 font-['Share_Tech_Mono']">
            <span className="text-slate-100 font-bold text-base tracking-widest tabular-nums">{time.toLocaleTimeString()}</span>
            <span className="text-slate-400 text-[10px] tracking-wider uppercase font-semibold">{time.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</span>
          </div>

        </div>

      </header>

      {/* Email Dispatch Toast Banner */}
      {emailToast && (
        <div className={`p-3 border rounded-lg font-['Share_Tech_Mono'] text-xs font-bold flex items-center justify-between z-40 transition-all ${
          emailToast.type === 'success' ? 'bg-[#00ff9d]/10 border-[#00ff9d]/50 text-[#00ff9d]' :
          emailToast.type === 'error' ? 'bg-[#ff0055]/20 border-[#ff0055]/60 text-[#ff0055]' :
          'bg-cyan-500/10 border-cyan-500/50 text-cyan-300'
        }`}>
          <div className="flex items-center gap-2 overflow-x-auto">
            <Mail size={16} />
            <span>{emailToast.message}</span>
          </div>
          <button onClick={() => setEmailToast(null)} className="text-slate-400 hover:text-white text-xs ml-2 cursor-pointer font-bold">✕</button>
        </div>
      )}

      {/* ======================= ROW 1: TELEMETRY STRIP ======================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 z-10">

        {/* Climate Panel */}
        <div className="cyber-glass p-3.5 rounded-xl border border-cyan-500/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-['Orbitron'] font-bold tracking-[0.18em] text-slate-300 border-b border-cyan-500/20 pb-2 mb-2">
            <span className="flex items-center gap-1.5 text-[#ffb700]"><Thermometer size={14} /> CLIMATE SENSORS</span>
            <span className="text-slate-500 font-['Share_Tech_Mono']">SEN-01</span>
          </div>
          <div className="grid grid-cols-2 gap-2 items-baseline">
            <div>
              <div className="text-[9px] text-slate-400 font-['Share_Tech_Mono'] tracking-wider font-semibold">TEMP</div>
              <div className="text-2xl font-bold font-['Orbitron'] text-[#ffb700] tabular-nums">{temp.toFixed(1)}°C</div>
            </div>
            <div className="text-right border-l border-cyan-500/20 pl-2">
              <div className="text-[9px] text-slate-400 font-['Share_Tech_Mono'] tracking-wider font-semibold">HUMIDITY</div>
              <div className="text-xl font-bold font-['Orbitron'] text-cyan-400 tabular-nums">{humidity}%</div>
            </div>
          </div>
          <div className="w-full bg-slate-950/80 h-1.5 border border-cyan-500/20 mt-2.5 rounded-full overflow-hidden p-0.5">
            <div className="bg-[#ffb700] h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(100, (temp/60)*100)}%`, boxShadow: '0 0 8px #ffb700' }} />
          </div>
        </div>

        {/* Kinematics Panel */}
        <div className="cyber-glass p-3.5 rounded-xl border border-cyan-500/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-['Orbitron'] font-bold tracking-[0.18em] text-slate-300 border-b border-cyan-500/20 pb-2 mb-2">
            <span className="flex items-center gap-1.5 text-cyan-400"><Activity size={14} /> KINEMATICS (IMU)</span>
            <span className="text-slate-500 font-['Share_Tech_Mono']">GYRO</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div>
              <div className="text-[9px] text-slate-400 font-['Share_Tech_Mono'] tracking-wider font-semibold">PITCH</div>
              <div className="text-2xl font-bold font-['Orbitron'] text-cyan-400 tabular-nums">{pitch > 0 ? '+' : ''}{pitch.toFixed(1)}°</div>
            </div>
            <div className="border-l border-cyan-500/20 pl-2">
              <div className="text-[9px] text-slate-400 font-['Share_Tech_Mono'] tracking-wider font-semibold">ROLL</div>
              <div className="text-2xl font-bold font-['Orbitron'] text-[#00ff9d] tabular-nums">{roll > 0 ? '+' : ''}{roll.toFixed(1)}°</div>
            </div>
          </div>
          <div className="text-[9px] font-['Share_Tech_Mono'] text-slate-400 text-center mt-2 border-t border-cyan-500/20 pt-1 font-semibold">
            ATTITUDE LOCK: ACTIVE
          </div>
        </div>

        {/* Radar Avoidance Panel */}
        <div className="cyber-glass p-3.5 rounded-xl border border-cyan-500/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-['Orbitron'] font-bold tracking-[0.18em] text-slate-300 border-b border-cyan-500/20 pb-2 mb-2">
            <span className="flex items-center gap-1.5 text-purple-400"><Radar size={14} /> RADAR PROXIMITY</span>
            <span className={`text-[9px] font-['Share_Tech_Mono'] px-1.5 py-0.5 border rounded-xs ${obstacle !== 'CLEAR' ? 'border-[#ffb700]/60 bg-[#ffb700]/20 text-[#ffb700] font-bold' : 'border-[#00ff9d]/40 bg-[#00ff9d]/10 text-[#00ff9d] font-bold'}`}>
              {obstacle}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[9px] text-slate-400 font-['Share_Tech_Mono'] tracking-wider font-semibold">FRONT</div>
              <div className="text-xl font-bold font-['Orbitron'] text-purple-300 tabular-nums">{frontDist} <span className="text-[10px] text-slate-500 font-normal">cm</span></div>
            </div>
            <div className="border-l border-cyan-500/20 pl-2">
              <div className="text-[9px] text-slate-400 font-['Share_Tech_Mono'] tracking-wider font-semibold">SIDE</div>
              <div className="text-xl font-bold font-['Orbitron'] text-purple-300 tabular-nums">{sideDist} <span className="text-[10px] text-slate-500 font-normal">cm</span></div>
            </div>
          </div>
          <div className="text-[9px] font-['Share_Tech_Mono'] text-slate-400 mt-2 border-t border-cyan-500/20 pt-1 flex justify-between font-medium">
            <span>OVERRIDE: {obstacle !== 'CLEAR' ? 'ENGAGED' : 'AUTO'}</span>
          </div>
        </div>

        {/* Avionics Nav / Com Panel */}
        <div className="cyber-glass p-3.5 rounded-xl border border-cyan-500/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-['Orbitron'] font-bold tracking-[0.18em] text-slate-300 border-b border-cyan-500/20 pb-2 mb-2">
            <span className="flex items-center gap-1.5 text-[#00ff9d]"><Compass size={14} /> COMPASS & BEARING</span>
            <span className="text-slate-500 font-['Share_Tech_Mono']">MAG</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[9px] text-slate-400 font-['Share_Tech_Mono'] tracking-wider font-semibold">MAG HEADING</div>
              <div className="text-2xl font-bold font-['Orbitron'] text-[#00ff9d] tabular-nums">{magHeading}° <span className="text-xs text-[#00ff9d]/80">E</span></div>
            </div>
            <div>
              {magnetic === 0 ? (
                <span className="text-[9px] font-['Share_Tech_Mono'] text-[#ff0055] bg-[#ff0055]/20 border border-[#ff0055]/50 px-2 py-0.5 font-bold rounded-xs">
                  METAL INT
                </span>
              ) : (
                <span className="text-[9px] font-['Share_Tech_Mono'] text-[#00ff9d] bg-[#00ff9d]/10 border border-[#00ff9d]/40 px-2 py-0.5 font-bold rounded-xs">
                  FIELD NOMINAL
                </span>
              )}
            </div>
          </div>
          <div className="text-[9px] font-['Share_Tech_Mono'] text-slate-400 mt-2 border-t border-cyan-500/20 pt-1 flex justify-between font-medium">
            <span>DECLIN: +{magDec}°</span>
            <span>WAYPOINTS: 02</span>
          </div>
        </div>

      </div>

      {/* ======================= ROW 2: OPTICAL STREAM & THREAT ENGINE ======================= */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 z-10">
        
        {/* Hero Camera Feed (2 cols) */}
        <div className="xl:col-span-2 h-96 md:h-115 cyber-glass rounded-xl border border-cyan-500/20 relative overflow-hidden flex flex-col">
          <CamView 
            humanDetected={human} 
            weaponDetected={weapon} 
            weaponConfidence={weaponConf}
            connected={connected} 
            cameraStatus={cameraStatus} 
            confidence={detectionConfidence} 
          />
        </div>

        {/* Threat Level Gauge & AI Vision (1 col) */}
        <div className="xl:col-span-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-4">
          <ThreatLevel level={threatScore > 65 ? 2 : threatScore > 35 ? 1 : 0} score={threatScore} connected={connected} />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-4">
            <HumanDetection detected={human} connected={connected} cameraStatus={cameraStatus} confidence={detectionConfidence} boxCount={detectionCount} />
            <WeaponDetection detected={weapon} connected={connected} cameraStatus={cameraStatus} confidence={weaponConf} />
          </div>
        </div>

      </div>

      {/* ======================= ROW 3: RECHARTS THREAT GRAPH & COMMAND LOG ======================= */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 z-10">
        
        {/* Threat Graph Timeline (2 cols) */}
        <div className="xl:col-span-2 cyber-glass p-4 rounded-xl border border-cyan-500/20 min-h-72">
          <ThreatGraph history={threatHistory} connected={connected} threatScore={threatScore} />
        </div>

        {/* Tactical Command Log Feed (1 col) */}
        <div className="xl:col-span-1 cyber-glass rounded-xl border border-cyan-500/20 flex flex-col h-72 overflow-hidden">
          <div className="bg-slate-950/80 border-b border-cyan-500/20 px-4 py-2.5 flex items-center justify-between">
            <div className="text-[11px] font-['Orbitron'] font-bold tracking-[0.18em] text-slate-200 flex items-center gap-2 uppercase">
              <Database size={14} className="text-cyan-400" /> SYSTEM COMMAND LOG
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00ff9d] animate-ping" />
              <span className="text-[9px] font-['Share_Tech_Mono'] text-slate-400 font-semibold">REALTIME</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 font-['Share_Tech_Mono'] text-[10px] flex flex-col gap-1.5 bg-slate-950/40">
            {!connected ? (
              <div className="p-3 text-center border border-[#ff0055]/50 bg-[#ff0055]/10 text-[#ff0055] font-bold animate-pulse my-auto hazard-hatch-pattern rounded-xs">
                [SYSTEM LOG PAUSED // WEBSOCKET DISCONNECTED]
              </div>
            ) : (alerts && alerts.length > 0) ? (
              alerts.map((a, i) => (
                <div key={i} className="flex items-center gap-2.5 px-3 py-1.5 border border-cyan-500/15 bg-slate-900/60 rounded-xs hover:border-cyan-500/40 transition-colors">
                  <span className="text-slate-400 whitespace-nowrap">{a.timestamp ? new Date(a.timestamp).toLocaleTimeString() : time.toLocaleTimeString()}</span>
                  <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded-xs ${a.severity === 'CRITICAL' ? 'text-[#ff0055] bg-[#ff0055]/20 border border-[#ff0055]/60' : 'text-cyan-300 bg-cyan-500/20 border border-cyan-500/40'}`}>
                    {a.severity || 'INFO'}
                  </span>
                  <span className="text-slate-200 truncate font-medium">{a.message}</span>
                </div>
              ))
            ) : (
              <>
                <div className="flex items-center gap-2.5 px-3 py-1.5 border border-cyan-500/15 bg-slate-900/60 rounded-xs text-slate-300">
                  <span className="text-slate-500">{time.toLocaleTimeString()}</span>
                  <span className="px-1.5 py-0.2 text-[9px] font-bold text-cyan-400 border border-cyan-500/40 bg-cyan-500/10">INFO</span>
                  <span className="text-slate-300 font-medium">UAV flight parameters locked: Altitude 124.5m</span>
                </div>
                <div className="flex items-center gap-2.5 px-3 py-1.5 border border-cyan-500/15 bg-slate-900/60 rounded-xs text-slate-300">
                  <span className="text-slate-500">{time.toLocaleTimeString()}</span>
                  <span className="px-1.5 py-0.2 text-[9px] font-bold text-[#00ff9d] border border-[#00ff9d]/40 bg-[#00ff9d]/10">NOMINAL</span>
                  <span className="text-slate-300 font-medium">FLIR camera stream synced on CAM-01</span>
                </div>
                {weapon && (
                  <div className="flex items-center gap-2.5 px-3 py-1.5 border border-[#ff0055] bg-[#ff0055]/20 text-[#ff0055] animate-bounce font-bold rounded-xs">
                    <span className="text-slate-400">{time.toLocaleTimeString()}</span>
                    <span className="px-1.5 py-0.2 text-[9px] font-bold text-white bg-[#ff0055] border border-[#ff0055]">ARMED BREACH</span>
                    <span className="text-[#ff0055] font-bold">CRITICAL: Weapon detected in target camera frame!</span>
                  </div>
                )}
                {human && (
                  <div className="flex items-center gap-2.5 px-3 py-1.5 border border-[#ffb700]/60 bg-[#ffb700]/15 text-[#ffb700] animate-pulse font-bold rounded-xs">
                    <span className="text-slate-400">{time.toLocaleTimeString()}</span>
                    <span className="px-1.5 py-0.2 text-[9px] font-bold text-[#ffb700] border border-[#ffb700] bg-[#ffb700]/20">CRITICAL</span>
                    <span className="text-[#ffb700]">AI Target Lock: Human intruder detected in sector 04</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

      </div>

      {/* ======================= ROW 4: GPS MAP ======================= */}
      <div className="h-96 cyber-glass rounded-xl border border-cyan-500/20 overflow-hidden z-10">
        <GPSMap lat={lat} lng={lng} heading={heading} speed={speed} connected={connected} />
      </div>

      {/* ======================= FIXED BOTTOM CYBER FOOTER ======================= */}
      <footer className="cyber-glass rounded-xl border border-cyan-500/20 px-4 py-2.5 flex flex-col md:flex-row justify-between items-center text-[10px] font-['Share_Tech_Mono'] text-slate-400 gap-2 z-10 font-semibold">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
            <Navigation size={13} /> POS: <span className="text-slate-100 tabular-nums">{lat.toFixed(5)}° N, {lng.toFixed(5)}° W</span>
          </span>
          <span className="hidden sm:inline text-slate-700">|</span>
          <span>
            VEL: <span className="text-[#00ff9d] font-bold tabular-nums">{speed.toFixed(1)} m/s</span>
          </span>
          <span className="hidden sm:inline text-slate-700">|</span>
          <span>
            ALT: <span className="text-[#00ff9d] font-bold tabular-nums">124.5 m</span>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span>PATROL MODE: <span className="text-cyan-400 font-bold">AUTONOMOUS GRID</span></span>
          <span className="text-slate-700">|</span>
          <span>ENCRYPTION: <span className="text-[#00ff9d] font-bold">AES-256 GHOST</span></span>
        </div>
      </footer>

    </div>
  );
}

function CamView({ humanDetected, weaponDetected, weaponConfidence, connected, cameraStatus, confidence }) {
  const [streamError, setStreamError] = useState(false);
  const videoUrl = import.meta.env.VITE_VIDEO_URL || "http://localhost:5001/video_feed";

  useEffect(() => {
    if (streamError) {
      const timer = setTimeout(() => setStreamError(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [streamError]);

  return (
    <div className="relative w-full h-full bg-[#05070e] flex items-center justify-center overflow-hidden">
      
      {/* Top Left HUD Camera Label */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 border border-cyan-500/30 rounded-xs shadow-md">
        <span className={`w-2 h-2 rounded-full ${connected && cameraStatus === 'CONNECTED' && !streamError ? 'bg-[#ff0055] animate-pulse' : 'bg-slate-500'}`} />
        <span className="text-[10px] font-['Share_Tech_Mono'] text-slate-200 tracking-wider font-bold">
          CAM-01 • OPTICAL/FLIR {connected && cameraStatus === 'CONNECTED' && !streamError ? 'LIVE' : 'OFFLINE'}
        </span>
      </div>

      {/* Flashing WEAPON DETECTED HUD Badge */}
      {weaponDetected && (
        <div className="absolute top-14 left-3 z-20 flex items-center gap-2 bg-[#ff0055] text-white px-3 py-1 border border-[#ff0055] shadow-[0_0_15px_#ff0055] rounded-xs animate-bounce font-['Orbitron'] font-bold">
          <AlertTriangle size={14} className="animate-pulse" />
          <span className="text-[10px] tracking-wider uppercase">
            WEAPON DETECTED ({weaponConfidence > 0 ? `${weaponConfidence}%` : 'ARMED TARGET'})
          </span>
        </div>
      )}

      {/* Top Right HUD Telemetry */}
      <div className="absolute top-3 right-3 z-20 text-[10px] font-['Share_Tech_Mono'] text-cyan-400 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 border border-cyan-500/30 rounded-xs shadow-md tracking-wider font-bold">
        ZOOM: 2.4X | FOV: 110° | IR: ACTIVE
      </div>

      {/* Military Reticle HUD */}
      <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
        <div className={`w-36 h-36 border ${weaponDetected ? 'border-[#ff0055] shadow-[0_0_30px_#ff0055]' : humanDetected ? 'border-[#ffb700] shadow-[0_0_20px_#ffb700]' : 'border-cyan-400/80'} rounded-full flex items-center justify-center transition-all duration-300`}>
          
          <div className={`w-2 h-2 ${weaponDetected ? 'bg-[#ff0055] shadow-[0_0_10px_#ff0055]' : humanDetected ? 'bg-[#ffb700] shadow-[0_0_10px_#ffb700]' : 'bg-cyan-400'} rounded-full`} />
          
          <div className="absolute -top-4 w-px h-4 bg-cyan-400" />
          <div className="absolute -bottom-4 w-px h-4 bg-cyan-400" />
          <div className="absolute -left-4 h-px w-4 bg-cyan-400" />
          <div className="absolute -right-4 h-px w-4 bg-cyan-400" />

          <div className="absolute top-2 left-2 w-2.5 h-2.5 border-t border-l border-cyan-400" />
          <div className="absolute top-2 right-2 w-2.5 h-2.5 border-t border-r border-cyan-400" />
          <div className="absolute bottom-2 left-2 w-2.5 h-2.5 border-b border-l border-cyan-400" />
          <div className="absolute bottom-2 right-2 w-2.5 h-2.5 border-b border-r border-cyan-400" />
        </div>
      </div>

      {/* Video Feed Image */}
      <div className="relative w-full h-full bg-[#05070e] overflow-hidden">
        {!streamError ? (
          <img 
            src={videoUrl} 
            alt="Live Feed Stream" 
            className="w-full h-full object-cover filter contrast-110 brightness-95"
            onError={() => setStreamError(true)}
          />
        ) : (
          /* Tactical Radar Sweeper fallback */
          <div className="absolute inset-0 bg-[#05070e] flex flex-col items-center justify-center tactical-grid-bg text-slate-100">
            <div className="relative w-48 h-48 border border-cyan-500/30 rounded-full flex items-center justify-center mb-3 bg-slate-950/60">
              <div className="absolute inset-0 rounded-full border border-cyan-500/20 animate-ping opacity-30" />
              <div className="w-full h-px bg-cyan-500/20 absolute" />
              <div className="h-full w-px bg-cyan-500/20 absolute" />
              <div className="w-full h-full rounded-full border-t-2 border-cyan-400 animate-radar-sweep origin-center" />
              
              {(humanDetected || weaponDetected) && (
                <div className="absolute top-12 right-14 w-3.5 h-3.5 bg-[#ff0055] rounded-full shadow-[0_0_15px_#ff0055] animate-pulse" />
              )}
            </div>
            <span className="text-[11px] font-['Orbitron'] text-cyan-400 font-bold tracking-[0.2em] uppercase">
              AWAITING OPTICAL STREAM...
            </span>
            <span className="text-[9px] font-['Share_Tech_Mono'] text-slate-400 mt-1 font-medium">
              RETRYING MJPEG FEED ({videoUrl})
            </span>
          </div>
        )}

        {/* HUD overlay badges */}
        <div className="absolute bottom-3 left-3 z-20 flex gap-2">
          {weaponDetected && (
            <div className="text-[10px] font-['Orbitron'] font-bold text-white bg-[#ff0055]/90 backdrop-blur-md px-3 py-1 border border-[#ff0055] rounded-xs shadow-md flex items-center gap-1.5 animate-pulse">
              <AlertTriangle size={13} />
              <span>WEAPON DETECTED ({weaponConfidence > 0 ? `${weaponConfidence}%` : 'ARMED'})</span>
            </div>
          )}
          {humanDetected && !weaponDetected && (
            <div className="text-[10px] font-['Orbitron'] font-bold text-[#ffb700] bg-slate-950/85 backdrop-blur-md px-3 py-1 border border-[#ffb700]/60 rounded-xs shadow-md flex items-center gap-1.5">
              <span>HUMAN TRACKED ({confidence > 0 ? `${confidence}%` : 'ACTIVE'})</span>
            </div>
          )}
        </div>
      </div>

      {/* Disconnected State Overlay */}
      {!connected && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-30 flex flex-col items-center justify-center p-4 border-2 border-[#ff0055] hazard-hatch-pattern">
          <div className="p-3 border border-[#ff0055] bg-[#ff0055]/20 text-[#ff0055] mb-3 animate-pulse rounded-lg">
            <AlertTriangle size={32} />
          </div>
          <h3 className="text-lg font-['Orbitron'] font-bold tracking-[0.2em] text-white uppercase bg-[#ff0055] px-4 py-1.5 rounded-xs shadow-[0_0_15px_#ff0055]">
            NO BACKEND CONNECTION
          </h3>
          <p className="text-xs font-['Share_Tech_Mono'] text-slate-300 mt-3 tracking-wider text-center font-bold bg-slate-950/90 px-3 py-1.5 border border-cyan-500/30 rounded-xs">
            RE-ESTABLISHING WEBSOCKET CONNECTION TO FLIGHT CONTROLLER...
          </p>
        </div>
      )}

    </div>
  );
}