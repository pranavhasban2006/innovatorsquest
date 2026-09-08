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
      icon: <WifiOff size={44} className="text-slate-500" />,
      label: 'NO BACKEND CONNECTION',
      box: 'bg-slate-500/10 border-slate-500/20',
      text: 'text-slate-500',
    },
    'no-camera': {
      icon: <VideoOff size={44} className="text-amber-500 animate-pulse" />,
      label: 'CAMERA OFFLINE',
      box: 'bg-amber-500/10 border-amber-500/30',
      text: 'text-amber-500',
    },
    clear: {
      icon: <ShieldCheck size={44} className="text-emerald-600" />,
      label: 'NO WEAPONS DETECTED',
      box: 'bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]',
      text: 'text-emerald-700',
    },
    detected: {
      icon: <AlertTriangle size={44} className="text-red-600 animate-bounce" />,
      label: 'WEAPON DETECTED',
      box: 'bg-red-600/20 border-red-600/60 shadow-[0_0_30px_rgba(220,38,38,0.4)] animate-pulse',
      text: 'text-red-700 font-bold',
    },
  }[visual];

  return (
    <div className={`p-4 rounded-xl border ${detected ? 'border-red-600 bg-red-50/60' : 'border-[#CBD5E1] bg-white'} flex flex-col shadow-sm relative overflow-hidden transition-all duration-300`}>

      <div className="text-[10px] font-['Rajdhani'] font-bold tracking-[0.18em] text-slate-700 mb-3 z-10 flex items-center justify-between uppercase">
        <span className="flex items-center gap-1.5 text-slate-800">
          <Crosshair size={14} className={detected ? "text-red-600 animate-spin" : "text-sky-700"} /> AI WEAPON VISION
        </span>
        {visual === 'detected' && (
          <span className="text-[10px] font-['Share_Tech_Mono'] text-white bg-red-600 border border-red-700 px-2 py-0.5 font-bold tracking-wider animate-pulse">
            ARMED TARGET · {Math.round(confidence || 90)}%
          </span>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-center items-center z-10 py-2">
        <div className={`w-16 h-16 rounded-md flex items-center justify-center mb-3 transition-all duration-500 border ${CONFIG.box}`}>
          {CONFIG.icon}
        </div>

        <div className={`text-sm font-['Rajdhani'] font-bold tracking-[0.18em] uppercase ${CONFIG.text}`}>
          {CONFIG.label}
        </div>
        
        {visual === 'detected' && (
          <div className="text-[9px] font-['Share_Tech_Mono'] text-red-800 bg-red-100 border border-red-300 px-2 py-0.5 mt-2 font-bold tracking-widest uppercase animate-pulse">
            HIGH THREAT BREACH ESCALATION
          </div>
        )}
      </div>

      {visual === 'detected' && (
        <div className="absolute inset-0 bg-linear-to-t from-red-600/10 to-transparent pointer-events-none" />
      )}
    </div>
  );
}
