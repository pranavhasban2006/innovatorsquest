import React from 'react';
import { AlertOctagon, ShieldCheck, AlertTriangle } from 'lucide-react';

export function ThreatLevel({ level, score = 0, connected = true }) {
  // 0: LOW / NOMINAL, 1: ELEVATED, 2: CRITICAL
  const isHigh = level === 2;
  const isElev = level === 1;
  
  const statusText = isHigh ? "CRITICAL BREACH" : isElev ? "ELEVATED THREAT" : "NOMINAL / SECURE";
  const actionText = isHigh ? "IMMEDIATE INTERVENTION REQUIRED" : isElev ? "ELEVATED MONITORING ACTIVE" : "ALL SYSTEMS NOMINAL";
  
  const borderClass = isHigh ? "border-red-600 tactical-corner-danger bg-red-50/40" : isElev ? "border-amber-600 tactical-corner-amber bg-amber-50/30" : "border-[#CBD5E1] tactical-corner bg-white";
  const accentColor = isHigh ? "text-red-700" : isElev ? "text-amber-800" : "text-sky-800";

  return (
    <div className={`tactical-panel p-4 border ${borderClass} h-full flex flex-col justify-between relative`}>
      
      {/* Module Header */}
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2 mb-3">
        <div className="text-[10px] font-['Rajdhani'] font-bold tracking-[0.18em] text-slate-800 uppercase flex items-center gap-1.5">
          {isHigh ? (
            <AlertOctagon size={14} className="text-red-600 animate-pulse" />
          ) : isElev ? (
            <AlertTriangle size={14} className="text-amber-700" />
          ) : (
            <ShieldCheck size={14} className="text-emerald-700" />
          )}
          THREAT ASSESSMENT ENGINE
        </div>
        <span className="text-[9px] font-['Share_Tech_Mono'] text-slate-500 font-semibold">LVL 0{level}</span>
      </div>

      {/* Main Numerical Readout */}
      <div className="flex-1 flex flex-col items-center justify-center py-2">
        <div className="relative flex flex-col items-center justify-center mb-3">
          <div className={`text-4xl font-bold font-['Chakra_Petch'] tabular-nums tracking-tighter ${accentColor}`}>
            {connected ? `${Math.round(score)}%` : '--%'}
          </div>
          <div className="text-[9px] font-['Share_Tech_Mono'] text-slate-600 tracking-widest uppercase mt-0.5 font-semibold">
            COMBINED RISK INDEX
          </div>
        </div>

        {/* Status Badge */}
        <div className={`px-3 py-1 border text-xs font-['Rajdhani'] font-bold tracking-[0.18em] uppercase ${
          isHigh ? "bg-red-600 text-white border-red-700 animate-pulse" : isElev ? "bg-amber-100 text-amber-900 border-amber-400" : "bg-sky-50 text-sky-900 border-sky-300"
        }`}>
          {connected ? statusText : 'LINK OFFLINE'}
        </div>

        {/* Action Directive */}
        <div className="text-[9px] font-['Share_Tech_Mono'] text-slate-600 mt-3 text-center tracking-wider uppercase font-semibold">
          {connected ? actionText : 'AWAITING TELEMETRY RECONNECT'}
        </div>
      </div>

      {/* Segmented Threat Bar Gauge */}
      <div className="mt-auto border-t border-[#E2E8F0] pt-2">
        <div className="flex items-center justify-between text-[8px] font-['Share_Tech_Mono'] text-slate-500 mb-1 font-semibold">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
        <div className="grid grid-cols-10 gap-1 h-2 bg-slate-100 border border-[#CBD5E1] p-0.5">
          {Array.from({ length: 10 }).map((_, i) => {
            const threshold = (i + 1) * 10;
            const isActive = score >= threshold && connected;
            const barColor = threshold > 65 ? 'bg-red-600' : threshold > 35 ? 'bg-amber-600' : 'bg-emerald-600';
            return (
              <div 
                key={i} 
                className={`h-full transition-all duration-300 ${isActive ? barColor : 'bg-slate-200'}`} 
              />
            );
          })}
        </div>
      </div>

    </div>
  );
}
