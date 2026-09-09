import React from 'react';
import { AlertOctagon, ShieldCheck, AlertTriangle, Activity } from 'lucide-react';

export function ThreatLevel({ level, score = 0, connected = true }) {
  // 0: LOW / NOMINAL, 1: ELEVATED, 2: CRITICAL
  const isHigh = level === 2;
  const isElev = level === 1;

  const statusText = isHigh ? "CRITICAL BREACH" : isElev ? "ELEVATED ANOMALY" : "AIRSPACE SECURE";
  const actionText = isHigh ? "TACTICAL INTERVENTION REQUIRED" : isElev ? "ACTIVE MONITORING ENGAGED" : "ALL SYSTEMS NOMINAL";

  const roundedScore = Math.min(100, Math.max(0, Math.round(score)));
  const circumference = 2 * Math.PI * 48; // Radius = 48
  const strokeDashoffset = circumference - (roundedScore / 100) * circumference;

  const themeColor = isHigh ? "#ff0055" : isElev ? "#ffb700" : "#00ff9d";
  const glowClass = isHigh ? "cyber-glow-crimson" : isElev ? "" : "cyber-glow-cyan";
  const cornerClass = isHigh ? "tactical-corner-danger" : isElev ? "tactical-corner-amber" : "";

  return (
    <div className={`cyber-glass tactical-corner ${cornerClass} ${glowClass} p-4 h-full flex flex-col justify-between relative overflow-hidden transition-all duration-500`}>
      
      {/* Background Pulse Sheen when Critical */}
      {isHigh && (
        <div className="absolute inset-0 bg-red-600/10 animate-pulse pointer-events-none" />
      )}

      {/* Module Header */}
      <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2 mb-3 z-10">
        <div className="text-[11px] font-['Orbitron'] font-bold tracking-[0.18em] text-slate-200 uppercase flex items-center gap-2">
          {isHigh ? (
            <AlertOctagon size={16} className="text-[#ff0055] animate-bounce" />
          ) : isElev ? (
            <AlertTriangle size={16} className="text-[#ffb700]" />
          ) : (
            <ShieldCheck size={16} className="text-[#00ff9d]" />
          )}
          <span>THREAT ASSESSMENT ENGINE</span>
        </div>
        <div className="flex items-center gap-1.5 font-['Share_Tech_Mono'] text-[10px]">
          <span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: themeColor }} />
          <span className="text-slate-400 font-bold">LVL 0{level}</span>
        </div>
      </div>

      {/* SVG Circular Radial Gauge */}
      <div className="flex-1 flex flex-col items-center justify-center py-1 z-10">
        <div className="relative w-36 h-36 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
            {/* Background Track */}
            <circle
              cx="60"
              cy="60"
              r="48"
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="8"
              fill="transparent"
            />
            {/* Dynamic Threat Arc */}
            <circle
              cx="60"
              cy="60"
              r="48"
              stroke={themeColor}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-700 ease-out"
              style={{ filter: `drop-shadow(0 0 8px ${themeColor})` }}
            />
          </svg>

          {/* Center Readout */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <div 
              className="text-3xl font-black font-['Orbitron'] tracking-tighter tabular-nums"
              style={{ color: themeColor, textShadow: `0 0 12px ${themeColor}aa` }}
            >
              {connected ? `${roundedScore}%` : '--%'}
            </div>
            <div className="text-[9px] font-['Share_Tech_Mono'] text-slate-400 tracking-widest uppercase mt-0.5 font-semibold">
              RISK INDEX
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div 
          className={`mt-2 px-3 py-1 text-xs font-['Orbitron'] font-bold tracking-[0.18em] uppercase rounded-sm transition-all duration-300 ${
            isHigh 
              ? "bg-[#ff0055]/20 text-[#ff0055] border border-[#ff0055] animate-pulse shadow-[0_0_15px_rgba(255,0,85,0.4)]" 
              : isElev 
              ? "bg-[#ffb700]/20 text-[#ffb700] border border-[#ffb700]" 
              : "bg-[#00ff9d]/20 text-[#00ff9d] border border-[#00ff9d]"
          }`}
        >
          {connected ? statusText : 'LINK OFFLINE'}
        </div>

        {/* Directive Text */}
        <div className="text-[9px] font-['Share_Tech_Mono'] text-slate-400 mt-2 text-center tracking-wider uppercase font-semibold">
          {connected ? actionText : 'AWAITING TELEMETRY RECONNECT'}
        </div>
      </div>

      {/* Segmented Cyber Meter Bar */}
      <div className="mt-auto border-t border-cyan-500/20 pt-2 z-10">
        <div className="flex items-center justify-between text-[8px] font-['Share_Tech_Mono'] text-slate-400 mb-1 font-semibold">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
        <div className="grid grid-cols-10 gap-1 h-2 bg-slate-950/80 border border-cyan-500/20 p-0.5 rounded-sm">
          {Array.from({ length: 10 }).map((_, i) => {
            const threshold = (i + 1) * 10;
            const isActive = roundedScore >= threshold && connected;
            const barColor = threshold > 65 ? '#ff0055' : threshold > 35 ? '#ffb700' : '#00ff9d';
            return (
              <div 
                key={i} 
                className="h-full rounded-xs transition-all duration-300"
                style={{ 
                  backgroundColor: isActive ? barColor : 'rgba(255, 255, 255, 0.08)',
                  boxShadow: isActive ? `0 0 6px ${barColor}` : 'none'
                }} 
              />
            );
          })}
        </div>
      </div>

    </div>
  );
}
