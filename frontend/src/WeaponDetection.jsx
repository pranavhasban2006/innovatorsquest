import React from 'react';
import { Crosshair, ShieldCheck, VideoOff, WifiOff, AlertTriangle } from 'lucide-react';

export default function WeaponDetection({ detected, connected, cameraStatus, confidence }) {
  const cameraLive = cameraStatus === 'CONNECTED';

  let visual = 'clear';
  if (!connected) visual = 'offline';
  else if (!cameraLive) visual = 'no-camera';
  else if (detected) visual = 'detected';

  const CONFIG = {
    offline: {
      icon: <WifiOff size={32} className="text-slate-500" />,
      label: 'NO BACKEND LINK',
      box: 'bg-slate-900/50 border-slate-700/40 text-slate-500',
    },
    'no-camera': {
      icon: <VideoOff size={32} className="text-amber-400 animate-pulse" />,
      label: 'CAMERA FEED OFFLINE',
      box: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    },
    clear: {
      icon: <ShieldCheck size={32} className="text-[#00ff9d]" />,
      label: 'NO WEAPONS DETECTED',
      box: 'bg-[#00ff9d]/10 border-[#00ff9d]/30 text-[#00ff9d] shadow-[0_0_15px_rgba(0,255,157,0.15)]',
    },
    detected: {
      icon: <AlertTriangle size={32} className="text-[#ff0055] animate-bounce" />,
      label: 'WEAPON DETECTED',
      box: 'bg-[#ff0055]/20 border-[#ff0055]/60 text-[#ff0055] shadow-[0_0_30px_rgba(255,0,85,0.4)] animate-pulse',
    },
  }[visual];

  return (
    <div className={`cyber-glass p-4 rounded-xl border ${detected ? 'border-[#ff0055] cyber-glow-crimson' : 'border-cyan-500/20'} flex flex-col justify-between relative overflow-hidden transition-all duration-300`}>
      
      {/* Header */}
      <div className="text-[10px] font-['Orbitron'] font-bold tracking-[0.18em] text-slate-300 z-10 flex items-center justify-between uppercase">
        <span className="flex items-center gap-1.5 text-cyan-400">
          <Crosshair size={14} className={detected ? "text-[#ff0055] animate-spin" : "text-cyan-400"} /> AI WEAPON VISION
        </span>
        {visual === 'detected' && (
          <span className="text-[9px] font-['Share_Tech_Mono'] px-2 py-0.5 border rounded-xs tracking-wider uppercase font-bold text-[#ff0055] border-[#ff0055]/60 bg-[#ff0055]/20 animate-pulse">
            ARMED TARGET • {Math.round(confidence || 92)}%
          </span>
        )}
      </div>

      {/* Main Body */}
      <div className="flex-1 flex flex-col justify-center items-center z-10 py-3">
        <div className={`w-16 h-16 rounded-lg flex items-center justify-center mb-3 transition-all duration-500 border ${CONFIG.box}`}>
          {CONFIG.icon}
        </div>

        <div className={`text-xs font-['Orbitron'] font-bold tracking-[0.18em] uppercase ${detected ? 'text-[#ff0055]' : visual === 'clear' ? 'text-[#00ff9d]' : 'text-slate-400'}`}>
          {CONFIG.label}
        </div>
        
        {visual === 'detected' && (
          <div className="text-[9px] font-['Share_Tech_Mono'] text-[#ff0055] bg-[#ff0055]/20 border border-[#ff0055]/50 px-2 py-0.5 mt-2 font-bold tracking-widest uppercase animate-pulse">
            HIGH THREAT BREACH ESCALATION
          </div>
        )}

        {/* Confidence Meter Bar */}
        {visual === 'detected' && (
          <div className="w-full mt-3 bg-slate-950/80 border border-[#ff0055]/30 h-1.5 rounded-full overflow-hidden p-0.5">
            <div 
              className="bg-[#ff0055] h-full rounded-full transition-all duration-500" 
              style={{ width: `${Math.round(confidence || 92)}%`, boxShadow: '0 0 8px #ff0055' }} 
            />
          </div>
        )}
      </div>

      {/* Decorative backdrop */}
      {visual === 'detected' && (
        <div className="absolute inset-0 bg-gradient-to-t from-[#ff0055]/20 to-transparent pointer-events-none" />
      )}
    </div>
  );
}
