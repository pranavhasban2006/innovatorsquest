import React, { useState, useEffect } from 'react';
import { ThreatLevel } from './ThreatLevel';
import HumanDetection from './HumanDetection';
import WeaponDetection from './WeaponDetection';
import ThreatGraph from './ThreatGraph';
import GPSMap from './GPSMap';
import { 
  ShieldAlert, Activity, Thermometer, Compass, Navigation, Radar, 
  AlertTriangle, ShieldCheck, Database, Radio, Crosshair, Mail, Sun, Moon
} from 'lucide-react';

export default function Dashboard({ 
  sensorData, threatHistory, alerts, connected,
  breachState, cancelBreach, approveBreach, triggerBreach 
}) {
  const [time, setTime] = useState(new Date());
  const [emailTesting, setEmailTesting] = useState(false);
  const [emailToast, setEmailToast] = useState(null);
  const [themeMode, setThemeMode] = useState('bright'); // Default to 'bright' light theme as requested!

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (themeMode === 'bright') {
      document.body.classList.add('theme-bright-active');
    } else {
      document.body.classList.remove('theme-bright-active');
    }
  }, [themeMode]);

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

  const isBright = themeMode === 'bright';
  const cardClass = isBright ? 'bright-glass' : 'cyber-glass';

  return (
    <div className={`min-h-screen max-w-[1530px] mx-auto p-3 lg:p-5 flex flex-col gap-4 ${isBright ? 'tactical-grid-bg-bright text-slate-900' : 'tactical-grid-bg text-slate-100'} relative transition-all duration-500 ${isBreach ? 'breach-alert-perimeter' : ''}`}>
      
      {/* Background Cyber Glow Tint */}
      {weapon ? (
        <div className="fixed inset-0 bg-[#dc2626]/10 pointer-events-none z-0 transition-opacity duration-500 animate-pulse" />
      ) : isBreach ? (
        <div className="fixed inset-0 bg-[#dc2626]/5 pointer-events-none z-0 transition-opacity duration-500" />
      ) : isElevated ? (
        <div className="fixed inset-0 bg-[#d97706]/5 pointer-events-none z-0 transition-opacity duration-500" />
      ) : null}

      {/* ======================= CRITICAL BREACH & PURGE BANNER ======================= */}
      {breachState?.active && (
        <div className="bg-red-950 border-2 border-red-600 rounded-xl p-4 shadow-2xl shadow-red-900/50 animate-pulse text-white flex flex-col md:flex-row items-center justify-between gap-4 z-50">
          <div className="flex items-center gap-4">
            <div className="bg-red-600 p-3 rounded-full animate-bounce shadow-lg">
              <ShieldAlert className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-['Orbitron'] font-bold tracking-wider text-red-400">🚨 CRITICAL BREACH PROTOCOL ACTIVATED</h2>
                <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-xs font-['Share_Tech_Mono'] font-bold animate-pulse">AUTO-PURGE IN PROGRESS</span>
              </div>
              <p className="text-sm text-red-200 mt-1 font-['Share_Tech_Mono']">
                REASON: <span className="text-white font-bold">{breachState.reason || "DRONE CAPTURE / SYSTEM INTRUSION"}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-center px-4 py-2 bg-red-900/90 border border-red-500 rounded-lg">
              <div className="text-3xl font-['Orbitron'] font-black text-white">{breachState.secondsRemaining || 30}s</div>
              <div className="text-[10px] text-red-200 font-['Share_Tech_Mono'] tracking-widest uppercase">AUTO PURGE TIMER</div>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={cancelBreach}
                className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-md font-['Orbitron'] font-bold text-xs border border-slate-600 transition-all flex items-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                ABORT WIPE
              </button>
              <button 
                onClick={approveBreach}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-['Orbitron'] font-bold text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer"
              >
                <AlertTriangle className="w-4 h-4 text-white" />
                PURGE NOW
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================= TACTICAL DAYLIGHT / CYBER HEADER ======================= */}
      <header className={`${cardClass} ${weapon ? 'tactical-corner-danger border-red-600 bg-red-50/90' : isBreach ? 'tactical-corner-danger border-red-500/50' : isElevated ? 'tactical-corner-amber border-amber-500/50' : isBright ? 'border-sky-300' : 'tactical-corner border-cyan-500/20'} p-3.5 lg:px-6 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4 z-10`}>
        
        {/* Title & Terminal ID */}
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 border rounded-lg ${weapon ? 'border-red-600 bg-red-600 text-white animate-bounce' : isBreach ? 'border-red-500 bg-red-100 text-red-700' : isElevated ? 'border-amber-500 bg-amber-100 text-amber-800' : isBright ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400'} flex items-center justify-center`}>
              <ShieldAlert size={24} className={isBreach ? "animate-pulse" : ""} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className={`font-['Orbitron'] text-2xl font-black tracking-[0.25em] ${isBright ? 'text-slate-900' : 'text-gradient-cyan'} leading-none`}>SPECTR</h1>
                <span className={`text-[10px] font-['Share_Tech_Mono'] ${isBright ? 'text-sky-900 border-sky-300 bg-sky-50' : 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10'} border px-2 py-0.5 tracking-wider uppercase font-bold rounded-xs`}>
                  DAYLIGHT CONTROL TOWER
                </span>
              </div>
              <span className={`text-[9px] font-['Share_Tech_Mono'] ${isBright ? 'text-slate-600' : 'text-slate-400'} tracking-[0.22em] uppercase block mt-1 font-semibold`}>
                BRIGHT TACTICAL SURVEILLANCE & RECON SYSTEM
              </span>
            </div>
          </div>
        </div>

        {/* Center Threat State Banner */}
        <div className="flex items-center justify-center">
          {breachState?.active ? (
            <div className="flex items-center gap-2 border border-red-600 bg-red-600 text-white px-4 py-1.5 text-xs font-['Orbitron'] font-bold tracking-[0.2em] animate-pulse shadow-md rounded-xs">
              <ShieldAlert size={16} className="animate-bounce" /> 🚨 BREACH IN PROGRESS // PURGE IN {breachState.secondsRemaining}s
            </div>
          ) : weapon ? (
            <div className="flex items-center gap-2 border border-red-700 bg-red-700 text-white px-4 py-1.5 text-xs font-['Orbitron'] font-bold tracking-[0.2em] animate-bounce shadow-md rounded-xs">
              <Crosshair size={16} className="animate-spin" /> [!] WEAPON DETECTED // CRITICAL BREACH ESCALATION ({threatScore}%)
            </div>
          ) : isBreach ? (
            <div className="flex items-center gap-2 border border-red-600 bg-red-600 text-white px-4 py-1.5 text-xs font-['Orbitron'] font-bold tracking-[0.2em] animate-pulse shadow-sm rounded-xs">
              <AlertTriangle size={16} /> CRITICAL BREACH ALERT // THREAT {threatScore}%
            </div>
          ) : isElevated ? (
            <div className="flex items-center gap-2 border border-amber-500 bg-amber-100 text-amber-900 px-4 py-1.5 text-xs font-['Orbitron'] font-bold tracking-[0.2em] rounded-xs">
              <Activity size={16} /> ELEVATED ANOMALY // MONITORING
            </div>
          ) : (
            <div className={`flex items-center gap-2 border ${isBright ? 'border-emerald-600 bg-emerald-50 text-emerald-900' : 'border-[#00ff9d]/40 bg-[#00ff9d]/10 text-[#00ff9d]'} px-4 py-1.5 text-xs font-['Orbitron'] font-bold tracking-[0.2em] rounded-xs`}>
              <ShieldCheck size={16} /> ALL SYSTEMS NOMINAL // AIRSPACE SECURE
            </div>
          )}
        </div>

        {/* Right Info & Controls */}
        <div className="flex items-center gap-3 text-right">
          
          {/* THEME TOGGLE SWITCH (BRIGHT / DARK) */}
          <button 
            onClick={() => setThemeMode(isBright ? 'dark' : 'bright')}
            title="Toggle Dashboard Theme (Daylight Light Mode / Cyber Dark Mode)"
            className={`flex items-center gap-1.5 px-3 py-1.5 border text-[10px] font-['Orbitron'] font-bold tracking-wider uppercase rounded-xs transition-all cursor-pointer ${
              isBright 
                ? 'bg-amber-100 text-amber-900 border-amber-400 hover:bg-amber-200' 
                : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30'
            }`}
          >
            {isBright ? <Sun size={13} className="text-amber-600 animate-spin" /> : <Moon size={13} className="text-cyan-400" />}
            {isBright ? 'DAYLIGHT BRIGHT' : 'CYBER DARK'}
          </button>

          {/* Connection Status Badge */}
          <div className={`flex items-center gap-2 px-3 py-1.5 border text-[10px] font-['Share_Tech_Mono'] tracking-wider uppercase font-bold rounded-xs ${
            connected 
              ? (isBright ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-[#00ff9d]/40 bg-[#00ff9d]/10 text-[#00ff9d]') 
              : 'border-red-600 bg-red-100 text-red-800 animate-pulse'
          }`}>
            <Radio size={13} className={connected ? "animate-pulse" : ""} />
            {connected ? 'WS LINK: ONLINE' : 'WS LINK: OFFLINE'}
          </div>

          {/* Test Email Button */}
          <button 
            onClick={handleTestEmail}
            disabled={emailTesting}
            title="Dispatch Test Tactical Email Alert"
            className={`${isBright ? 'bg-sky-700 hover:bg-sky-800 text-white border-sky-900' : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border-cyan-500/40'} text-[10px] font-['Orbitron'] font-bold px-3 py-1.5 rounded-xs border tracking-wider uppercase cursor-pointer flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50`}
          >
            <Mail size={13} className={emailTesting ? "animate-spin" : ""} />
            {emailTesting ? "SENDING..." : "TEST EMAIL"}
          </button>

          {/* Emergency Trigger Button */}
          {!breachState?.active && (
            <button 
              onClick={() => triggerBreach("COMMAND_MANUAL_EMERGENCY")}
              title="Initiate Emergency Security Purge Protocol"
              className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-['Orbitron'] font-bold px-3 py-1.5 rounded-xs border border-red-800 tracking-wider uppercase cursor-pointer flex items-center gap-1.5 shadow-sm transition-all"
            >
              <AlertTriangle size={13} />
              PURGE
            </button>
          )}

          {/* Clock */}
          <div className={`flex flex-col text-right border-l ${isBright ? 'border-slate-300' : 'border-cyan-500/20'} pl-3 font-['Share_Tech_Mono']`}>
            <span className={`${isBright ? 'text-slate-900' : 'text-slate-100'} font-bold text-base tracking-widest tabular-nums`}>{time.toLocaleTimeString()}</span>
            <span className={`${isBright ? 'text-slate-600' : 'text-slate-400'} text-[10px] tracking-wider uppercase font-semibold`}>{time.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</span>
          </div>

        </div>

      </header>

      {/* Email Dispatch Toast Banner */}
      {emailToast && (
        <div className={`p-3 border rounded-lg font-['Share_Tech_Mono'] text-xs font-bold flex items-center justify-between z-40 transition-all ${
          emailToast.type === 'success' ? 'bg-emerald-950 border-emerald-500 text-emerald-300' :
          emailToast.type === 'error' ? 'bg-red-950 border-red-500 text-red-300' :
          'bg-sky-950 border-sky-500 text-sky-300'
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
        <div className={`${cardClass} p-3.5 rounded-xl flex flex-col justify-between`}>
          <div className={`flex items-center justify-between text-[10px] font-['Orbitron'] font-bold tracking-[0.18em] ${isBright ? 'text-slate-800 border-slate-200' : 'text-slate-300 border-cyan-500/20'} border-b pb-2 mb-2`}>
            <span className="flex items-center gap-1.5 text-amber-600"><Thermometer size={14} /> CLIMATE SENSORS</span>
            <span className="text-slate-500 font-['Share_Tech_Mono']">SEN-01</span>
          </div>
          <div className="grid grid-cols-2 gap-2 items-baseline">
            <div>
              <div className={`text-[9px] ${isBright ? 'text-slate-600' : 'text-slate-400'} font-['Share_Tech_Mono'] tracking-wider font-semibold`}>TEMP</div>
              <div className="text-2xl font-bold font-['Orbitron'] text-amber-600 tabular-nums">{temp.toFixed(1)}°C</div>
            </div>
            <div className={`text-right border-l ${isBright ? 'border-slate-200' : 'border-cyan-500/20'} pl-2`}>
              <div className={`text-[9px] ${isBright ? 'text-slate-600' : 'text-slate-400'} font-['Share_Tech_Mono'] tracking-wider font-semibold`}>HUMIDITY</div>
              <div className={`text-xl font-bold font-['Orbitron'] ${isBright ? 'text-sky-700' : 'text-cyan-400'} tabular-nums`}>{humidity}%</div>
            </div>
          </div>
          <div className="w-full bg-slate-200 h-1.5 border border-slate-300 mt-2.5 rounded-full overflow-hidden p-0.5">
            <div className="bg-amber-500 h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(100, (temp/60)*100)}%` }} />
          </div>
        </div>

        {/* Kinematics Panel */}
        <div className={`${cardClass} p-3.5 rounded-xl flex flex-col justify-between`}>
          <div className={`flex items-center justify-between text-[10px] font-['Orbitron'] font-bold tracking-[0.18em] ${isBright ? 'text-slate-800 border-slate-200' : 'text-slate-300 border-cyan-500/20'} border-b pb-2 mb-2`}>
            <span className={`flex items-center gap-1.5 ${isBright ? 'text-sky-700' : 'text-cyan-400'}`}><Activity size={14} /> KINEMATICS (IMU)</span>
            <span className="text-slate-500 font-['Share_Tech_Mono']">GYRO</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div>
              <div className={`text-[9px] ${isBright ? 'text-slate-600' : 'text-slate-400'} font-['Share_Tech_Mono'] tracking-wider font-semibold`}>PITCH</div>
              <div className={`text-2xl font-bold font-['Orbitron'] ${isBright ? 'text-sky-800' : 'text-cyan-400'} tabular-nums`}>{pitch > 0 ? '+' : ''}{pitch.toFixed(1)}°</div>
            </div>
            <div className={`border-l ${isBright ? 'border-slate-200' : 'border-cyan-500/20'} pl-2`}>
              <div className={`text-[9px] ${isBright ? 'text-slate-600' : 'text-slate-400'} font-['Share_Tech_Mono'] tracking-wider font-semibold`}>ROLL</div>
              <div className={`text-2xl font-bold font-['Orbitron'] ${isBright ? 'text-emerald-700' : 'text-[#00ff9d]'} tabular-nums`}>{roll > 0 ? '+' : ''}{roll.toFixed(1)}°</div>
            </div>
          </div>
          <div className={`text-[9px] font-['Share_Tech_Mono'] ${isBright ? 'text-slate-600 border-slate-200' : 'text-slate-400 border-cyan-500/20'} text-center mt-2 border-t pt-1 font-semibold`}>
            ATTITUDE LOCK: ACTIVE
          </div>
        </div>

        {/* Radar Avoidance Panel */}
        <div className={`${cardClass} p-3.5 rounded-xl flex flex-col justify-between`}>
          <div className={`flex items-center justify-between text-[10px] font-['Orbitron'] font-bold tracking-[0.18em] ${isBright ? 'text-slate-800 border-slate-200' : 'text-slate-300 border-cyan-500/20'} border-b pb-2 mb-2`}>
            <span className={`flex items-center gap-1.5 ${isBright ? 'text-purple-700' : 'text-purple-400'}`}><Radar size={14} /> RADAR PROXIMITY</span>
            <span className={`text-[9px] font-['Share_Tech_Mono'] px-1.5 py-0.5 border rounded-xs ${obstacle !== 'CLEAR' ? 'border-amber-500 bg-amber-100 text-amber-900 font-bold' : 'border-emerald-500 bg-emerald-50 text-emerald-800 font-bold'}`}>
              {obstacle}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className={`text-[9px] ${isBright ? 'text-slate-600' : 'text-slate-400'} font-['Share_Tech_Mono'] tracking-wider font-semibold`}>FRONT</div>
              <div className={`text-xl font-bold font-['Orbitron'] ${isBright ? 'text-purple-900' : 'text-purple-300'} tabular-nums`}>{frontDist} <span className="text-[10px] text-slate-500 font-normal">cm</span></div>
            </div>
            <div className={`border-l ${isBright ? 'border-slate-200' : 'border-cyan-500/20'} pl-2`}>
              <div className={`text-[9px] ${isBright ? 'text-slate-600' : 'text-slate-400'} font-['Share_Tech_Mono'] tracking-wider font-semibold`}>SIDE</div>
              <div className={`text-xl font-bold font-['Orbitron'] ${isBright ? 'text-purple-900' : 'text-purple-300'} tabular-nums`}>{sideDist} <span className="text-[10px] text-slate-500 font-normal">cm</span></div>
            </div>
          </div>
          <div className={`text-[9px] font-['Share_Tech_Mono'] ${isBright ? 'text-slate-600 border-slate-200' : 'text-slate-400 border-cyan-500/20'} mt-2 border-t pt-1 flex justify-between font-medium`}>
            <span>OVERRIDE: {obstacle !== 'CLEAR' ? 'ENGAGED' : 'AUTO'}</span>
          </div>
        </div>

        {/* Avionics Nav / Com Panel */}
        <div className={`${cardClass} p-3.5 rounded-xl flex flex-col justify-between`}>
          <div className={`flex items-center justify-between text-[10px] font-['Orbitron'] font-bold tracking-[0.18em] ${isBright ? 'text-slate-800 border-slate-200' : 'text-slate-300 border-cyan-500/20'} border-b pb-2 mb-2`}>
            <span className={`flex items-center gap-1.5 ${isBright ? 'text-emerald-700' : 'text-[#00ff9d]'}`}><Compass size={14} /> COMPASS & BEARING</span>
            <span className="text-slate-500 font-['Share_Tech_Mono']">MAG</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-[9px] ${isBright ? 'text-slate-600' : 'text-slate-400'} font-['Share_Tech_Mono'] tracking-wider font-semibold`}>MAG HEADING</div>
              <div className={`text-2xl font-bold font-['Orbitron'] ${isBright ? 'text-emerald-700' : 'text-[#00ff9d]'} tabular-nums`}>{magHeading}° <span className="text-xs">E</span></div>
            </div>
            <div>
              {magnetic === 0 ? (
                <span className="text-[9px] font-['Share_Tech_Mono'] text-red-700 bg-red-100 border border-red-300 px-2 py-0.5 font-bold rounded-xs">
                  METAL INT
                </span>
              ) : (
                <span className="text-[9px] font-['Share_Tech_Mono'] text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 font-bold rounded-xs">
                  FIELD NOMINAL
                </span>
              )}
            </div>
          </div>
          <div className={`text-[9px] font-['Share_Tech_Mono'] ${isBright ? 'text-slate-600 border-slate-200' : 'text-slate-400 border-cyan-500/20'} mt-2 border-t pt-1 flex justify-between font-medium`}>
            <span>DECLIN: +{magDec}°</span>
            <span>WAYPOINTS: 02</span>
          </div>
        </div>

      </div>

      {/* ======================= ROW 2: OPTICAL STREAM & THREAT ENGINE ======================= */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 z-10">
        
        {/* Hero Camera Feed (2 cols) */}
        <div className={`xl:col-span-2 h-96 md:h-115 ${cardClass} rounded-xl relative overflow-hidden flex flex-col`}>
          <CamView 
            humanDetected={human} 
            weaponDetected={weapon} 
            weaponConfidence={weaponConf}
            connected={connected} 
            cameraStatus={cameraStatus} 
            confidence={detectionConfidence} 
            isBright={isBright}
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
        <div className={`xl:col-span-2 ${cardClass} p-4 rounded-xl min-h-72`}>
          <ThreatGraph history={threatHistory} connected={connected} threatScore={threatScore} />
        </div>

        {/* Tactical Command Log Feed (1 col) */}
        <div className={`xl:col-span-1 ${cardClass} rounded-xl flex flex-col h-72 overflow-hidden`}>
          <div className={`${isBright ? 'bg-slate-100 border-slate-300' : 'bg-slate-950/80 border-cyan-500/20'} border-b px-4 py-2.5 flex items-center justify-between`}>
            <div className={`text-[11px] font-['Orbitron'] font-bold tracking-[0.18em] ${isBright ? 'text-slate-800' : 'text-slate-200'} flex items-center gap-2 uppercase`}>
              <Database size={14} className={isBright ? "text-sky-700" : "text-cyan-400"} /> SYSTEM COMMAND LOG
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
              <span className={`text-[9px] font-['Share_Tech_Mono'] ${isBright ? 'text-slate-600' : 'text-slate-400'} font-semibold`}>REALTIME</span>
            </div>
          </div>

          <div className={`flex-1 overflow-y-auto p-2 font-['Share_Tech_Mono'] text-[10px] flex flex-col gap-1.5 ${isBright ? 'bg-white' : 'bg-slate-950/40'}`}>
            {!connected ? (
              <div className="p-3 text-center border border-red-500/50 bg-red-100 text-red-700 font-bold animate-pulse my-auto hazard-hatch-pattern rounded-xs">
                [SYSTEM LOG PAUSED // WEBSOCKET DISCONNECTED]
              </div>
            ) : (alerts && alerts.length > 0) ? (
              alerts.map((a, i) => (
                <div key={i} className={`flex items-center gap-2.5 px-3 py-1.5 border ${isBright ? 'border-slate-200 bg-slate-50' : 'border-cyan-500/15 bg-slate-900/60'} rounded-xs transition-colors`}>
                  <span className="text-slate-500 whitespace-nowrap">{a.timestamp ? new Date(a.timestamp).toLocaleTimeString() : time.toLocaleTimeString()}</span>
                  <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded-xs ${a.severity === 'CRITICAL' ? 'text-red-700 bg-red-100 border border-red-300' : 'text-sky-800 bg-sky-100 border border-sky-300'}`}>
                    {a.severity || 'INFO'}
                  </span>
                  <span className={`${isBright ? 'text-slate-900' : 'text-slate-200'} truncate font-medium`}>{a.message}</span>
                </div>
              ))
            ) : (
              <>
                <div className={`flex items-center gap-2.5 px-3 py-1.5 border ${isBright ? 'border-slate-200 bg-slate-50' : 'border-cyan-500/15 bg-slate-900/60'} rounded-xs`}>
                  <span className="text-slate-500">{time.toLocaleTimeString()}</span>
                  <span className="px-1.5 py-0.2 text-[9px] font-bold text-sky-800 border border-sky-300 bg-sky-50">INFO</span>
                  <span className={`${isBright ? 'text-slate-800' : 'text-slate-300'} font-medium`}>UAV flight parameters locked: Altitude 124.5m</span>
                </div>
                <div className={`flex items-center gap-2.5 px-3 py-1.5 border ${isBright ? 'border-slate-200 bg-slate-50' : 'border-cyan-500/15 bg-slate-900/60'} rounded-xs`}>
                  <span className="text-slate-500">{time.toLocaleTimeString()}</span>
                  <span className="px-1.5 py-0.2 text-[9px] font-bold text-emerald-800 border border-emerald-300 bg-emerald-50">NOMINAL</span>
                  <span className={`${isBright ? 'text-slate-800' : 'text-slate-300'} font-medium`}>FLIR camera stream synced on CAM-01</span>
                </div>
                {weapon && (
                  <div className="flex items-center gap-2.5 px-3 py-1.5 border border-red-600 bg-red-100 text-red-900 animate-bounce font-bold rounded-xs">
                    <span className="text-slate-600">{time.toLocaleTimeString()}</span>
                    <span className="px-1.5 py-0.2 text-[9px] font-bold text-white bg-red-700 border border-red-800">ARMED BREACH</span>
                    <span className="text-red-900 font-bold">CRITICAL: Weapon detected in target camera frame!</span>
                  </div>
                )}
                {human && (
                  <div className="flex items-center gap-2.5 px-3 py-1.5 border border-amber-500 bg-amber-50 text-amber-900 animate-pulse font-bold rounded-xs">
                    <span className="text-slate-600">{time.toLocaleTimeString()}</span>
                    <span className="px-1.5 py-0.2 text-[9px] font-bold text-amber-900 border border-amber-500 bg-amber-100">CRITICAL</span>
                    <span className="text-amber-900">AI Target Lock: Human intruder detected in sector 04</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

      </div>

      {/* ======================= ROW 4: GPS MAP ======================= */}
      <div className={`h-96 ${cardClass} rounded-xl overflow-hidden z-10`}>
        <GPSMap lat={lat} lng={lng} heading={heading} speed={speed} connected={connected} />
      </div>

      {/* ======================= FIXED BOTTOM FOOTER ======================= */}
      <footer className={`${cardClass} rounded-xl px-4 py-2.5 flex flex-col md:flex-row justify-between items-center text-[10px] font-['Share_Tech_Mono'] ${isBright ? 'text-slate-700' : 'text-slate-400'} gap-2 z-10 font-semibold`}>
        <div className="flex items-center gap-4">
          <span className={`flex items-center gap-1.5 ${isBright ? 'text-sky-800' : 'text-cyan-400'} font-bold`}>
            <Navigation size={13} /> POS: <span className={`${isBright ? 'text-slate-900' : 'text-slate-100'} tabular-nums`}>{lat.toFixed(5)}° N, {lng.toFixed(5)}° W</span>
          </span>
          <span className="hidden sm:inline text-slate-400">|</span>
          <span>
            VEL: <span className="text-emerald-700 font-bold tabular-nums">{speed.toFixed(1)} m/s</span>
          </span>
          <span className="hidden sm:inline text-slate-400">|</span>
          <span>
            ALT: <span className="text-emerald-700 font-bold tabular-nums">124.5 m</span>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span>PATROL MODE: <span className={`${isBright ? 'text-sky-800' : 'text-cyan-400'} font-bold`}>AUTONOMOUS GRID</span></span>
          <span className="text-slate-400">|</span>
          <span>ENCRYPTION: <span className="text-emerald-700 font-bold">AES-256 GHOST</span></span>
        </div>
      </footer>

    </div>
  );
}

function CamView({ humanDetected, weaponDetected, weaponConfidence, connected, cameraStatus, confidence, isBright }) {
  const [streamError, setStreamError] = useState(false);
  const videoUrl = import.meta.env.VITE_VIDEO_URL || "http://localhost:5001/video_feed";

  useEffect(() => {
    if (streamError) {
      const timer = setTimeout(() => setStreamError(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [streamError]);

  return (
    <div className={`relative w-full h-full ${isBright ? 'bg-slate-900' : 'bg-[#05070e]'} flex items-center justify-center overflow-hidden`}>
      
      {/* Top Left HUD Camera Label */}
      <div className={`absolute top-3 left-3 z-20 flex items-center gap-2 ${isBright ? 'bg-white/95 text-slate-900 border-slate-300' : 'bg-slate-950/85 text-slate-200 border-cyan-500/30'} backdrop-blur-md px-3 py-1.5 border rounded-xs shadow-md`}>
        <span className={`w-2 h-2 rounded-full ${connected && cameraStatus === 'CONNECTED' && !streamError ? 'bg-red-600 animate-pulse' : 'bg-slate-400'}`} />
        <span className="text-[10px] font-['Share_Tech_Mono'] tracking-wider font-bold">
          CAM-01 • OPTICAL/FLIR {connected && cameraStatus === 'CONNECTED' && !streamError ? 'LIVE' : 'OFFLINE'}
        </span>
      </div>

      {/* Flashing WEAPON DETECTED HUD Badge */}
      {weaponDetected && (
        <div className="absolute top-14 left-3 z-20 flex items-center gap-2 bg-red-600 text-white px-3 py-1 border border-red-700 shadow-lg rounded-xs animate-bounce font-['Orbitron'] font-bold">
          <AlertTriangle size={14} className="animate-pulse" />
          <span className="text-[10px] tracking-wider uppercase">
            WEAPON DETECTED ({weaponConfidence > 0 ? `${weaponConfidence}%` : 'ARMED TARGET'})
          </span>
        </div>
      )}

      {/* Top Right HUD Telemetry */}
      <div className={`absolute top-3 right-3 z-20 text-[10px] font-['Share_Tech_Mono'] ${isBright ? 'text-sky-900 bg-white/95 border-slate-300' : 'text-cyan-400 bg-slate-950/85 border-cyan-500/30'} backdrop-blur-md px-3 py-1.5 border rounded-xs shadow-md tracking-wider font-bold`}>
        ZOOM: 2.4X | FOV: 110° | IR: ACTIVE
      </div>

      {/* Reticle HUD */}
      <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
        <div className={`w-36 h-36 border ${weaponDetected ? 'border-red-600 shadow-[0_0_30px_#dc2626]' : humanDetected ? 'border-amber-500 shadow-[0_0_20px_#d97706]' : 'border-sky-400/80'} rounded-full flex items-center justify-center transition-all duration-300`}>
          
          <div className={`w-2 h-2 ${weaponDetected ? 'bg-red-600' : humanDetected ? 'bg-amber-500' : 'bg-sky-400'} rounded-full`} />
          
          <div className="absolute -top-4 w-px h-4 bg-sky-400" />
          <div className="absolute -bottom-4 w-px h-4 bg-sky-400" />
          <div className="absolute -left-4 h-px w-4 bg-sky-400" />
          <div className="absolute -right-4 h-px w-4 bg-sky-400" />

          <div className="absolute top-2 left-2 w-2.5 h-2.5 border-t border-l border-sky-400" />
          <div className="absolute top-2 right-2 w-2.5 h-2.5 border-t border-r border-sky-400" />
          <div className="absolute bottom-2 left-2 w-2.5 h-2.5 border-b border-l border-sky-400" />
          <div className="absolute bottom-2 right-2 w-2.5 h-2.5 border-b border-r border-sky-400" />
        </div>
      </div>

      {/* Video Feed Image */}
      <div className="relative w-full h-full bg-slate-900 overflow-hidden">
        {!streamError ? (
          <img 
            src={videoUrl} 
            alt="Live Feed Stream" 
            className="w-full h-full object-cover filter contrast-110 brightness-95"
            onError={() => setStreamError(true)}
          />
        ) : (
          /* Tactical Standby Radar */
          <div className={`absolute inset-0 ${isBright ? 'bg-slate-900 text-slate-100' : 'bg-[#05070e] text-slate-100'} flex flex-col items-center justify-center tactical-grid-bg`}>
            <div className="relative w-48 h-48 border border-sky-400/30 rounded-full flex items-center justify-center mb-3 bg-slate-950/60">
              <div className="absolute inset-0 rounded-full border border-sky-400/20 animate-ping opacity-30" />
              <div className="w-full h-px bg-sky-400/20 absolute" />
              <div className="h-full w-px bg-sky-400/20 absolute" />
              <div className="w-full h-full rounded-full border-t-2 border-sky-400 animate-radar-sweep origin-center" />
              
              {(humanDetected || weaponDetected) && (
                <div className="absolute top-12 right-14 w-3.5 h-3.5 bg-red-600 rounded-full shadow-[0_0_15px_#dc2626] animate-pulse" />
              )}
            </div>
            <span className="text-[11px] font-['Orbitron'] text-sky-400 font-bold tracking-[0.2em] uppercase">
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
            <div className="text-[10px] font-['Orbitron'] font-bold text-white bg-red-600/90 backdrop-blur-md px-3 py-1 border border-red-700 rounded-xs shadow-md flex items-center gap-1.5 animate-pulse">
              <AlertTriangle size={13} />
              <span>WEAPON DETECTED ({weaponConfidence > 0 ? `${weaponConfidence}%` : 'ARMED'})</span>
            </div>
          )}
          {humanDetected && !weaponDetected && (
            <div className="text-[10px] font-['Orbitron'] font-bold text-amber-400 bg-slate-950/85 backdrop-blur-md px-3 py-1 border border-amber-500/60 rounded-xs shadow-md flex items-center gap-1.5">
              <span>HUMAN TRACKED ({confidence > 0 ? `${confidence}%` : 'ACTIVE'})</span>
            </div>
          )}
        </div>
      </div>

      {/* Disconnected State Overlay */}
      {!connected && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-30 flex flex-col items-center justify-center p-4 border-2 border-red-600 hazard-hatch-pattern">
          <div className="p-3 border border-red-600 bg-red-600/20 text-red-500 mb-3 animate-pulse rounded-lg">
            <AlertTriangle size={32} />
          </div>
          <h3 className="text-lg font-['Orbitron'] font-bold tracking-[0.2em] text-white uppercase bg-red-600 px-4 py-1.5 rounded-xs shadow-lg">
            NO BACKEND CONNECTION
          </h3>
          <p className="text-xs font-['Share_Tech_Mono'] text-slate-300 mt-3 tracking-wider text-center font-bold bg-slate-950/90 px-3 py-1.5 border border-sky-500/30 rounded-xs">
            RE-ESTABLISHING WEBSOCKET CONNECTION TO FLIGHT CONTROLLER...
          </p>
        </div>
      )}

    </div>
  );
}