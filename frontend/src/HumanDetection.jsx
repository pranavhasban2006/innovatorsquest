import React from 'react';
import { User, ShieldCheck, VideoOff, WifiOff, Eye } from 'lucide-react';

export default function HumanDetection({ detected, connected, cameraStatus, confidence, boxCount }) {
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
      badge: 'border-slate-700 text-slate-500 bg-slate-900/50',
    },
    'no-camera': {
      icon: <VideoOff size={32} className="text-amber-400 animate-pulse" />,
      label: 'CAMERA FEED OFFLINE',
      box: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
      badge: 'border-amber-500/40 text-amber-400 bg-amber-500/10',
    },
    clear: {
      icon: <ShieldCheck size={32} className="text-[#00ff9d]" />,
      label: 'NO HUMAN DETECTED',
      box: 'bg-[#00ff9d]/10 border-[#00ff9d]/30 text-[#00ff9d] shadow-[0_0_15px_rgba(0,255,157,0.15)]',
      badge: 'border-[#00ff9d]/40 text-[#00ff9d] bg-[#00ff9d]/10',
    },
    detected: {
      icon: <User size={32} className="text-[#ffb700] animate-bounce" />,
      label: 'HUMAN TARGET TRACKED',
      box: 'bg-[#ffb700]/20 border-[#ffb700]/60 text-[#ffb700] shadow-[0_0_25px_rgba(255,183,0,0.35)] animate-cyber-pulse',
      badge: 'border-[#ffb700] text-[#ffb700] bg-[#ffb700]/20 font-bold',
    },
  }[visual];

  return (
    <div className={`cyber-glass p-4 rounded-xl border ${detected ? 'border-[#ffb700] cyber-glow-amber' : 'border-cyan-500/20'} flex flex-col justify-between relative overflow-hidden transition-all duration-300`}>
      
      {/* Header */}
      <div className="text-[10px] font-['Orbitron'] font-bold tracking-[0.18em] text-slate-300 z-10 flex items-center justify-between uppercase">
        <span className="flex items-center gap-1.5 text-cyan-400">
          <Eye size={14} className={detected ? "text-[#ffb700] animate-pulse" : "text-cyan-400"} /> AI HUMAN VISION
        </span>
        {visual === 'detected' && (
          <span className="text-[9px] font-['Share_Tech_Mono'] px-2 py-0.5 border rounded-xs tracking-wider uppercase font-bold text-[#ffb700] border-[#ffb700]/50 bg-[#ffb700]/10">
            {boxCount || 1} TARGET • {Math.round(confidence || 88)}%
          </span>
        )}
      </div>

      {/* Main Body */}
      <div className="flex-1 flex flex-col justify-center items-center z-10 py-3">
        <div className={`w-16 h-16 rounded-lg flex items-center justify-center mb-3 transition-all duration-500 border ${CONFIG.box}`}>
          {CONFIG.icon}
        </div>

        <div className={`text-xs font-['Orbitron'] font-bold tracking-[0.18em] uppercase ${CONFIG.badge.includes('ffb700') ? 'text-[#ffb700]' : CONFIG.badge.includes('00ff9d') ? 'text-[#00ff9d]' : 'text-slate-400'}`}>
          {CONFIG.label}
        </div>

        {/* Confidence Meter Bar */}
        {visual === 'detected' && (
          <div className="w-full mt-3 bg-slate-950/80 border border-[#ffb700]/30 h-1.5 rounded-full overflow-hidden p-0.5">
            <div 
              className="bg-[#ffb700] h-full rounded-full transition-all duration-500" 
              style={{ width: `${Math.round(confidence || 88)}%`, boxShadow: '0 0 8px #ffb700' }} 
            />
          </div>
        )}
      </div>

      {/* Decorative backdrop */}
      {visual === 'detected' && (
        <div className="absolute inset-0 bg-gradient-to-t from-[#ffb700]/10 to-transparent pointer-events-none" />
      )}
    </div>
  );
}
