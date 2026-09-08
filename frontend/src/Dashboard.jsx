import React, { useState, useEffect } from 'react';
import { ThreatLevel } from './ThreatLevel';
import HumanDetection from './HumanDetection';
import WeaponDetection from './WeaponDetection';
import ThreatGraph from './ThreatGraph';
import GPSMap from './GPSMap';
import { 
  ShieldAlert, Activity, Thermometer, Compass, Navigation, Radar, 
  AlertTriangle, ShieldCheck, Database, Radio, Crosshair
} from 'lucide-react';

export default function Dashboard({ sensorData, threatHistory, alerts, connected }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

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
  const lat = sd.latitude || 34.09670;
  const lng = sd.longitude || -118.19156;
  const speed = sd.speed || 3.8;
  const heading = sd.heading || 52;
  const threatScore = weapon ? Math.max(sd.threatScore || 92, 90) : (sd.threatScore || 86);
  const secLevel = sd.security_level || "GHOST";
  const bHash = sd.blockchain_hash ? sd.blockchain_hash.substring(0, 18) + '...' : "0x7F9A...SYS_OK";

  const isBreach = threatScore > 65 || human || weapon;
  const isElevated = threatScore > 35 && !isBreach;

  return (
    <div className={`min-h-screen max-w-480 mx-auto p-3 lg:p-4 flex flex-col gap-3 tactical-grid-bg text-slate-900 relative transition-all duration-500 ${isBreach ? 'breach-alert-perimeter' : ''}`}>
      
      {/* Background State Glow Tint */}
      {weapon ? (
        <div className="fixed inset-0 bg-red-600/10 pointer-events-none z-0 transition-opacity duration-500 animate-pulse" />
      ) : isBreach ? (
        <div className="fixed inset-0 bg-red-500/5 pointer-events-none z-0 transition-opacity duration-500" />
      ) : isElevated ? (
        <div className="fixed inset-0 bg-amber-500/5 pointer-events-none z-0 transition-opacity duration-500" />
      ) : null}

      {/* ======================= DAYLIGHT CONTROL HEADER ======================= */}
      <header className={`tactical-panel ${weapon ? 'tactical-corner-danger border-red-700 bg-red-100/80 animate-pulse' : isBreach ? 'tactical-corner-danger border-red-500 bg-red-50/40' : isElevated ? 'tactical-corner-amber border-amber-500 bg-amber-50/30' : 'tactical-corner border-[#CBD5E1] bg-white'} p-3 lg:px-5 flex flex-col md:flex-row justify-between items-center gap-3 z-10`}>
        
        {/* Title & Terminal ID */}
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3">
            <div className={`p-2 border ${weapon ? 'border-red-700 bg-red-600 text-white animate-bounce' : isBreach ? 'border-red-500 bg-red-100 text-red-700' : isElevated ? 'border-amber-500 bg-amber-100 text-amber-800' : 'border-sky-500 bg-sky-50 text-sky-700'} flex items-center justify-center`}>
              <ShieldAlert size={22} className={isBreach ? "animate-pulse" : ""} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-['Rajdhani'] text-2xl font-bold tracking-[0.2em] text-slate-900 leading-none">SPECTR</h1>
                <span className="text-[10px] font-['Share_Tech_Mono'] text-sky-800 border border-sky-300 px-1.5 py-0.5 bg-sky-50 tracking-wider uppercase font-bold">
                  DAYLIGHT CONTROL TOWER
                </span>
              </div>
              <span className="text-[9px] font-['Share_Tech_Mono'] text-slate-600 tracking-[0.18em] uppercase block mt-0.5 font-semibold">
                AUTONOMOUS TACTICAL SURVEILLANCE & RECON SYSTEM
              </span>
            </div>
          </div>
        </div>

        {/* Center Threat State Banner */}
        <div className="flex items-center justify-center">
          {weapon ? (
            <div className="flex items-center gap-2 border border-red-700 bg-red-700 text-white px-4 py-1.5 text-xs font-['Rajdhani'] font-bold tracking-[0.2em] animate-bounce shadow-md">
              <Crosshair size={16} className="animate-spin" /> [!] WEAPON DETECTED // CRITICAL BREACH ESCALATION ({threatScore}%)
            </div>
          ) : isBreach ? (
            <div className="flex items-center gap-2 border border-red-600 bg-red-600 text-white px-4 py-1.5 text-xs font-['Rajdhani'] font-bold tracking-[0.2em] animate-pulse shadow-sm">
              <AlertTriangle size={16} /> CRITICAL BREACH ALERT // THREAT {threatScore}%
            </div>
          ) : isElevated ? (
            <div className="flex items-center gap-2 border border-amber-600 bg-amber-100 text-amber-900 px-4 py-1.5 text-xs font-['Rajdhani'] font-bold tracking-[0.2em]">
              <Activity size={16} /> ELEVATED ANOMALY // MONITORING
            </div>
          ) : (
            <div className="flex items-center gap-2 border border-sky-600 bg-sky-50 text-sky-800 px-4 py-1.5 text-xs font-['Rajdhani'] font-bold tracking-[0.2em]">
              <ShieldCheck size={16} /> ALL SYSTEMS NOMINAL // AIRSPACE CLEAR
            </div>
          )}
        </div>

        {/* Right Info & Timestamp */}
        <div className="flex items-center gap-4 text-right">
          
          {/* Connection Status Badge */}
          <div className={`flex items-center gap-2 px-2.5 py-1 border text-[10px] font-['Share_Tech_Mono'] tracking-wider uppercase font-bold ${connected ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-red-500 bg-red-50 text-red-700 animate-pulse'}`}>
            <Radio size={12} className={connected ? "animate-pulse" : ""} />
            {connected ? 'WS LINK: ONLINE (12ms)' : 'WS LINK: OFFLINE // RECONNECTING'}
          </div>

          {/* Crypto / Security level */}
          <div className="hidden xl:flex flex-col text-right font-['Share_Tech_Mono'] text-[10px]">
            <span className="text-slate-600 font-medium">HASH: <span className="text-sky-700 font-bold">{bHash}</span></span>
            <span className="text-slate-600 font-medium">SEC: <span className="text-emerald-700 font-bold">{secLevel}</span></span>
          </div>

          {/* Clock */}
          <div className="flex flex-col text-right border-l border-[#CBD5E1] pl-4 font-['Share_Tech_Mono']">
            <span className="text-slate-900 font-bold text-base tracking-widest tabular-nums">{time.toLocaleTimeString()}</span>
            <span className="text-slate-600 text-[10px] tracking-wider uppercase font-semibold">{time.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</span>
          </div>

        </div>

      </header>

      {/* ======================= ROW 1: DAYLIGHT METRICS STRIP ======================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 z-10">

        {/* Climate Panel */}
        <div className="tactical-panel p-3 border-[#CBD5E1] flex flex-col justify-between bg-white">
          <div className="flex items-center justify-between text-[10px] font-['Rajdhani'] font-bold tracking-[0.18em] text-slate-700 border-b border-[#E2E8F0] pb-1.5 mb-2">
            <span className="flex items-center gap-1.5 text-amber-700"><Thermometer size={13} /> CLIMATE SENSORS</span>
            <span className="text-slate-500 font-mono">SEN-01</span>
          </div>
          <div className="grid grid-cols-2 gap-2 items-baseline">
            <div>
              <div className="text-[9px] text-slate-600 font-['Share_Tech_Mono'] tracking-wider font-semibold">TEMP</div>
              <div className="text-2xl font-bold font-['Chakra_Petch'] text-amber-700 tabular-nums">{temp.toFixed(1)}°C</div>
            </div>
            <div className="text-right border-l border-[#E2E8F0] pl-2">
              <div className="text-[9px] text-slate-600 font-['Share_Tech_Mono'] tracking-wider font-semibold">HUMIDITY</div>
              <div className="text-xl font-bold font-['Chakra_Petch'] text-sky-700 tabular-nums">{humidity}%</div>
            </div>
          </div>
          <div className="w-full bg-slate-100 h-1.5 border border-slate-300 mt-2 overflow-hidden">
            <div className="bg-amber-600 h-full transition-all duration-300" style={{ width: `${Math.min(100, (temp/60)*100)}%` }} />
          </div>
        </div>

        {/* Kinematics Panel */}
        <div className="tactical-panel p-3 border-[#CBD5E1] flex flex-col justify-between bg-white">
          <div className="flex items-center justify-between text-[10px] font-['Rajdhani'] font-bold tracking-[0.18em] text-slate-700 border-b border-[#E2E8F0] pb-1.5 mb-2">
            <span className="flex items-center gap-1.5 text-sky-700"><Activity size={13} /> KINEMATICS (IMU)</span>
            <span className="text-slate-500 font-mono">GYRO</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div>
              <div className="text-[9px] text-slate-600 font-['Share_Tech_Mono'] tracking-wider font-semibold">PITCH</div>
              <div className="text-2xl font-bold font-['Chakra_Petch'] text-sky-800 tabular-nums">{pitch > 0 ? '+' : ''}{pitch.toFixed(1)}°</div>
            </div>
            <div className="border-l border-[#E2E8F0] pl-2">
              <div className="text-[9px] text-slate-600 font-['Share_Tech_Mono'] tracking-wider font-semibold">ROLL</div>
              <div className="text-2xl font-bold font-['Chakra_Petch'] text-emerald-700 tabular-nums">{roll > 0 ? '+' : ''}{roll.toFixed(1)}°</div>
            </div>
          </div>
          <div className="text-[9px] font-['Share_Tech_Mono'] text-slate-600 text-center mt-2 border-t border-[#E2E8F0] pt-0.5 font-semibold">
            ATTITUDE LOCK: ACTIVE
          </div>
        </div>

        {/* Radar Avoidance Panel */}
        <div className="tactical-panel p-3 border-[#CBD5E1] flex flex-col justify-between bg-white">
          <div className="flex items-center justify-between text-[10px] font-['Rajdhani'] font-bold tracking-[0.18em] text-slate-700 border-b border-[#E2E8F0] pb-1.5 mb-2">
            <span className="flex items-center gap-1.5 text-purple-700"><Radar size={13} /> RADAR PROXIMITY</span>
            <span className={`text-[9px] font-mono px-1 py-0.2 border ${obstacle !== 'CLEAR' ? 'border-amber-500 bg-amber-100 text-amber-900 font-bold' : 'border-emerald-400 bg-emerald-50 text-emerald-800 font-bold'}`}>
              {obstacle}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[9px] text-slate-600 font-['Share_Tech_Mono'] tracking-wider font-semibold">FRONT</div>
              <div className="text-xl font-bold font-['Chakra_Petch'] text-purple-800 tabular-nums">{frontDist} <span className="text-[10px] text-slate-500 font-normal">cm</span></div>
            </div>
            <div className="border-l border-[#E2E8F0] pl-2">
              <div className="text-[9px] text-slate-600 font-['Share_Tech_Mono'] tracking-wider font-semibold">SIDE</div>
              <div className="text-xl font-bold font-['Chakra_Petch'] text-purple-800 tabular-nums">{sideDist} <span className="text-[10px] text-slate-500 font-normal">cm</span></div>
            </div>
          </div>
          <div className="text-[9px] font-['Share_Tech_Mono'] text-slate-600 mt-2 border-t border-[#E2E8F0] pt-0.5 flex justify-between font-medium">
            <span>OVERRIDE: {obstacle !== 'CLEAR' ? 'ENGAGED' : 'AUTO'}</span>
          </div>
        </div>

        {/* Avionics Nav / Com Panel */}
        <div className="tactical-panel p-3 border-[#CBD5E1] flex flex-col justify-between bg-white">
          <div className="flex items-center justify-between text-[10px] font-['Rajdhani'] font-bold tracking-[0.18em] text-slate-700 border-b border-[#E2E8F0] pb-1.5 mb-2">
            <span className="flex items-center gap-1.5 text-emerald-700"><Compass size={13} /> COMPASS & BEARING</span>
            <span className="text-slate-500 font-mono">MAG</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[9px] text-slate-600 font-['Share_Tech_Mono'] tracking-wider font-semibold">MAG HEADING</div>
              <div className="text-2xl font-bold font-['Chakra_Petch'] text-emerald-700 tabular-nums">{magHeading}° <span className="text-xs text-emerald-800">E</span></div>
            </div>
            <div>
              {magnetic === 0 ? (
                <span className="text-[9px] font-['Share_Tech_Mono'] text-red-700 bg-red-100 border border-red-300 px-1.5 py-0.5 font-bold">
                  METAL INT
                </span>
              ) : (
                <span className="text-[9px] font-['Share_Tech_Mono'] text-emerald-800 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 font-bold">
                  FIELD NOMINAL
                </span>
              )}
            </div>
          </div>
          <div className="text-[9px] font-['Share_Tech_Mono'] text-slate-600 mt-2 border-t border-[#E2E8F0] pt-0.5 flex justify-between font-medium">
            <span>DECLIN: +{magDec}°</span>
            <span>WAYPOINTS: 02</span>
          </div>
        </div>

      </div>

      {/* ======================= ROW 2: OPTICAL STREAM & THREAT ENGINE ======================= */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 z-10">
        
        {/* Hero Camera Feed (2 cols) */}
        <div className="xl:col-span-2 h-95 md:h-115 tactical-panel border-[#CBD5E1] relative overflow-hidden flex flex-col bg-white">
          <CamView 
            humanDetected={human} 
            weaponDetected={weapon} 
            weaponConfidence={weaponConf}
            connected={connected} 
            cameraStatus={cameraStatus} 
            confidence={detectionConfidence} 
          />
        </div>

        {/* Threat Level Gauge & AI Human / Weapon Vision (1 col) */}
        <div className="xl:col-span-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-3">
          <ThreatLevel level={threatScore > 65 ? 2 : threatScore > 35 ? 1 : 0} score={threatScore} connected={connected} />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3">
            <HumanDetection detected={human} connected={connected} cameraStatus={cameraStatus} confidence={detectionConfidence} boxCount={detectionCount} />
            <WeaponDetection detected={weapon} connected={connected} cameraStatus={cameraStatus} confidence={weaponConf} />
          </div>
        </div>

      </div>

      {/* ======================= ROW 3: RECHARTS THREAT GRAPH & COMMAND LOG ======================= */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 z-10">
        
        {/* Threat Graph Timeline (2 cols) */}
        <div className="xl:col-span-2 tactical-panel p-4 border-[#CBD5E1] bg-white min-h-70">
          <ThreatGraph history={threatHistory} connected={connected} threatScore={threatScore} />
        </div>

        {/* Tactical Command Log Feed (1 col) */}
        <div className="xl:col-span-1 tactical-panel border-[#CBD5E1] bg-white flex flex-col h-70 overflow-hidden">
          <div className="bg-slate-100 border-b border-[#CBD5E1] px-4 py-2.5 flex items-center justify-between">
            <div className="text-[11px] font-['Rajdhani'] font-bold tracking-[0.18em] text-slate-800 flex items-center gap-2 uppercase">
              <Database size={13} className="text-sky-700" /> SYSTEM COMMAND LOG
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              <span className="text-[9px] font-['Share_Tech_Mono'] text-slate-600 font-semibold">REALTIME</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 font-['Share_Tech_Mono'] text-[10px] flex flex-col gap-1 bg-white">
            {!connected ? (
              <div className="p-3 text-center border border-red-300 bg-red-50 text-red-700 font-bold animate-pulse my-auto hazard-hatch-pattern">
                [SYSTEM LOG PAUSED // WEBSOCKET DISCONNECTED]
              </div>
            ) : (alerts && alerts.length > 0) ? (
              alerts.map((a, i) => (
                <div key={i} className="flex items-center gap-2.5 px-2.5 py-1 border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors">
                  <span className="text-slate-500 whitespace-nowrap">{a.timestamp ? new Date(a.timestamp).toLocaleTimeString() : time.toLocaleTimeString()}</span>
                  <span className={`px-1.5 py-0.2 text-[9px] font-bold ${a.severity === 'CRITICAL' ? 'text-red-700 bg-red-100 border border-red-300' : 'text-sky-800 bg-sky-100 border border-sky-300'}`}>
                    {a.severity || 'INFO'}
                  </span>
                  <span className="text-slate-800 truncate font-medium">{a.message}</span>
                </div>
              ))
            ) : (
              <>
                <div className="flex items-center gap-2.5 px-2.5 py-1 border border-slate-200 bg-slate-50 text-slate-800">
                  <span className="text-slate-500">{time.toLocaleTimeString()}</span>
                  <span className="px-1.5 py-0.2 text-[9px] font-bold text-sky-800 border border-sky-300 bg-sky-50">INFO</span>
                  <span className="text-slate-800 font-medium">UAV flight parameters locked: Altitude 124.5m</span>
                </div>
                <div className="flex items-center gap-2.5 px-2.5 py-1 border border-slate-200 bg-slate-50 text-slate-800">
                  <span className="text-slate-500">{time.toLocaleTimeString()}</span>
                  <span className="px-1.5 py-0.2 text-[9px] font-bold text-emerald-800 border border-emerald-300 bg-emerald-50">NOMINAL</span>
                  <span className="text-slate-800 font-medium">FLIR camera stream synced on CAM-01</span>
                </div>
                {weapon && (
                  <div className="flex items-center gap-2.5 px-2.5 py-1 border border-red-600 bg-red-100 text-red-900 animate-bounce font-bold">
                    <span className="text-slate-600">{time.toLocaleTimeString()}</span>
                    <span className="px-1.5 py-0.2 text-[9px] font-bold text-white bg-red-700 border border-red-800">ARMED BREACH</span>
                    <span className="text-red-900 font-bold">CRITICAL: Weapon detected in target camera frame!</span>
                  </div>
                )}
                {human && (
                  <div className="flex items-center gap-2.5 px-2.5 py-1 border border-red-400 bg-red-50 text-red-800 animate-pulse font-bold">
                    <span className="text-slate-600">{time.toLocaleTimeString()}</span>
                    <span className="px-1.5 py-0.2 text-[9px] font-bold text-red-800 border border-red-500 bg-red-100">CRITICAL</span>
                    <span className="text-red-900">AI Target Lock: Human intruder detected in sector 04</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

      </div>

      {/* ======================= ROW 4: GPS LIGHT VECTOR MAP ======================= */}
      <div className="h-90 tactical-panel border-[#CBD5E1] bg-white overflow-hidden z-10">
        <GPSMap lat={lat} lng={lng} heading={heading} speed={speed} connected={connected} />
      </div>

      {/* ======================= FIXED BOTTOM DAYLIGHT FOOTER ======================= */}
      <footer className="tactical-panel border-[#CBD5E1] bg-white px-4 py-2 flex flex-col md:flex-row justify-between items-center text-[10px] font-['Share_Tech_Mono'] text-slate-600 gap-2 z-10 font-semibold">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-sky-800 font-bold">
            <Navigation size={12} /> POS: <span className="text-slate-900 tabular-nums">{lat.toFixed(5)}° N, {lng.toFixed(5)}° W</span>
          </span>
          <span className="hidden sm:inline text-slate-300">|</span>
          <span>
            VEL: <span className="text-emerald-800 font-bold tabular-nums">{speed.toFixed(1)} m/s</span>
          </span>
          <span className="hidden sm:inline text-slate-300">|</span>
          <span>
            ALT: <span className="text-emerald-800 font-bold tabular-nums">124.5 m</span>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span>PATROL MODE: <span className="text-sky-800 font-bold">AUTONOMOUS GRID</span></span>
          <span className="text-slate-300">|</span>
          <span>ENCRYPTION: <span className="text-emerald-800 font-bold">AES-256 GHOST</span></span>
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
    <div className="relative w-full h-full bg-slate-900 flex items-center justify-center overflow-hidden">
      
      {/* Top Left HUD Camera Label */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-white/90 backdrop-blur-md px-2.5 py-1 border border-slate-300 shadow-sm">
        <span className={`w-2 h-2 rounded-full ${connected && cameraStatus === 'CONNECTED' && !streamError ? 'bg-red-600 animate-pulse' : 'bg-slate-400'}`} />
        <span className="text-[10px] font-['Share_Tech_Mono'] text-slate-900 tracking-wider font-bold">
          CAM-01 • OPTICAL/FLIR {connected && cameraStatus === 'CONNECTED' && !streamError ? 'LIVE' : 'OFFLINE'}
        </span>
      </div>

      {/* Flashing WEAPON DETECTED HUD Badge */}
      {weaponDetected && (
        <div className="absolute top-12 left-3 z-20 flex items-center gap-2 bg-red-700 text-white px-3 py-1 border border-red-800 shadow-md animate-bounce">
          <AlertTriangle size={14} className="animate-pulse" />
          <span className="text-[10px] font-['Share_Tech_Mono'] tracking-wider font-bold uppercase">
            WEAPON DETECTED ({weaponConfidence > 0 ? `${weaponConfidence}%` : 'ARMED TARGET'})
          </span>
        </div>
      )}

      {/* Top Right HUD Telemetry */}
      <div className="absolute top-3 right-3 z-20 text-[10px] font-['Share_Tech_Mono'] text-sky-900 bg-white/90 backdrop-blur-md px-2.5 py-1 border border-slate-300 shadow-sm tracking-wider font-bold">
        ZOOM: 2.4X | FOV: 110° | IR: ACTIVE
      </div>

      {/* High Contrast Optical Reticle HUD */}
      <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
        <div className={`w-35 h-35 border ${weaponDetected ? 'border-red-700 shadow-[0_0_30px_rgba(220,38,38,0.8)]' : humanDetected ? 'border-red-600 shadow-[0_0_20px_rgba(220,38,38,0.5)]' : 'border-sky-400/80'} rounded-full flex items-center justify-center transition-all duration-300`}>
          
          <div className={`w-2 h-2 ${weaponDetected || humanDetected ? 'bg-red-600 shadow-[0_0_10px_#dc2626]' : 'bg-sky-500'} rounded-full`} />
          
          <div className="absolute -top-4 w-px h-4 bg-sky-400" />
          <div className="absolute -bottom-4 w-px h-4 bg-sky-400" />
          <div className="absolute -left-4 h-px w-4 bg-sky-400" />
          <div className="absolute -right-4 h-px w-4 bg-sky-400" />

          <div className="absolute top-2 left-2 w-2 h-2 border-t border-l border-sky-400" />
          <div className="absolute top-2 right-2 w-2 h-2 border-t border-r border-sky-400" />
          <div className="absolute bottom-2 left-2 w-2 h-2 border-b border-l border-sky-400" />
          <div className="absolute bottom-2 right-2 w-2 h-2 border-b border-r border-sky-400" />
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
          /* Fallback Tactical Camera Overlay when stream fails */
          <div className="absolute inset-0 bg-[#F8FAFC] flex flex-col items-center justify-center tactical-grid-bg text-slate-900">
            <div className="relative w-48 h-48 border border-sky-400 rounded-full flex items-center justify-center mb-3 bg-white/50">
              <div className="absolute inset-0 rounded-full border border-sky-300 animate-ping opacity-30" />
              <div className="w-full h-px bg-sky-300 absolute" />
              <div className="h-full w-px bg-sky-300 absolute" />
              <div className="w-full h-full rounded-full border-t-2 border-sky-600 animate-radar-sweep origin-center" />
              
              {(humanDetected || weaponDetected) && (
                <div className="absolute top-12 right-14 w-3 h-3 bg-red-600 rounded-full shadow-[0_0_15px_#dc2626] animate-pulse" />
              )}
            </div>
            <span className="text-[11px] font-['Share_Tech_Mono'] text-sky-900 font-bold tracking-[0.18em] uppercase">
              AWAITING CAMERA FEED...
            </span>
            <span className="text-[9px] font-['Share_Tech_Mono'] text-slate-600 mt-1 font-medium">
              RETRYING MJPEG STREAM ({videoUrl})
            </span>
          </div>
        )}

        {/* Clean subtle HUD overlay badges */}
        <div className="absolute bottom-3 left-3 z-20 flex gap-2">
          {weaponDetected && (
            <div className="text-[10px] font-['Share_Tech_Mono'] font-bold text-white bg-red-700/90 backdrop-blur-md px-2.5 py-1 border border-red-800 shadow-sm flex items-center gap-1.5 animate-pulse">
              <AlertTriangle size={12} />
              <span>WEAPON DETECTED ({weaponConfidence > 0 ? `${weaponConfidence}%` : 'ARMED'})</span>
            </div>
          )}
          {humanDetected && !weaponDetected && (
            <div className="text-[10px] font-['Share_Tech_Mono'] font-bold text-white bg-amber-600/90 backdrop-blur-md px-2.5 py-1 border border-amber-700 shadow-sm flex items-center gap-1.5">
              <span>HUMAN TRACKED ({confidence > 0 ? `${confidence}%` : 'ACTIVE'})</span>
            </div>
          )}
        </div>
      </div>

      {/* Disconnected State Overlay */}
      {!connected && (
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-4 border-2 border-red-600 hazard-hatch-pattern">
          <div className="p-3 border border-red-600 bg-red-600 text-white mb-3 animate-pulse">
            <AlertTriangle size={28} />
          </div>
          <h3 className="text-base font-['Rajdhani'] font-bold tracking-[0.2em] text-white uppercase bg-red-600 px-3 py-1">
            NO BACKEND CONNECTION
          </h3>
          <p className="text-xs font-['Share_Tech_Mono'] text-slate-200 mt-2 tracking-wider text-center font-bold bg-slate-950/80 px-2 py-1">
            RE-ESTABLISHING WEBSOCKET CONNECTION TO FLIGHT CONTROLLER...
          </p>
        </div>
      )}

    </div>
  );
}