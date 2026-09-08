import React from 'react';
import { User, ShieldCheck, VideoOff, WifiOff } from 'lucide-react';

// `cameraStatus` comes straight from hardware_bridge.py's detection_state
// ("CONNECTED" / "NOT CONNECTED"), so we can tell "confirmed clear" apart
// from "camera isn't even feeding us frames" instead of defaulting both
// to a reassuring green "AREA CLEAR" — same class of fix as ThreatGraph.
export default function HumanDetection({ detected, connected, cameraStatus, confidence, boxCount }) {
  const cameraLive = cameraStatus === 'CONNECTED';

  let visual = 'clear';
  if (!connected) visual = 'offline';
  else if (!cameraLive) visual = 'no-camera';
  else if (detected) visual = 'detected';

  const CONFIG = {
    offline: {
      icon: <WifiOff size={48} className="text-slate-500" />,
      label: 'NO BACKEND CONNECTION',
      box: 'bg-slate-500/10 border-slate-500/20',
      text: 'text-slate-500',
    },
    'no-camera': {
      icon: <VideoOff size={48} className="text-amber-400 animate-pulse" />,
      label: 'CAMERA OFFLINE',
      box: 'bg-amber-500/10 border-amber-500/30',
      text: 'text-amber-400',
    },
    clear: {
      icon: <ShieldCheck size={48} className="text-cyan-400" />,
      label: 'AREA CLEAR',
      box: 'bg-cyan-500/10 border-cyan-500/20 shadow-[0_0_20px_rgba(34,211,238,0.1)]',
      text: 'text-cyan-400',
    },
    detected: {
      icon: <User size={48} className="text-orange-400 animate-pulse" />,
      label: 'HUMAN TARGET DETECTED',
      box: 'bg-orange-500/20 border-orange-500/40 shadow-[0_0_40px_rgba(249,115,22,0.3)]',
      text: 'text-orange-400',
    },
  }[visual];

  return (
    <div className="p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl h-full flex flex-col shadow-[0_8px_32px_rgba(0,0,0,0.3)] relative overflow-hidden">

      <div className="text-xs font-semibold tracking-widest text-slate-400 mb-6 z-10 flex items-center justify-between">
        <span>AI VISION</span>
        {visual === 'detected' && boxCount > 0 && (
          <span className="text-[10px] font-mono text-orange-400/80 normal-case tracking-normal">
            {boxCount} target{boxCount > 1 ? 's' : ''} · {Math.round((confidence || 0) * 100)}%
          </span>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-center items-center z-10">
        <div className={`w-24 h-24 rounded-md flex items-center justify-center mb-6 transition-all duration-500 ease-in-out border ${CONFIG.box}`}>
          {CONFIG.icon}
        </div>

        <div className={`text-xl font-bold tracking-widest ${CONFIG.text}`}>
          {CONFIG.label}
        </div>
      </div>

      {/* Decorative backdrop */}
      {visual === 'detected' && (
        <div className="absolute inset-0 bg-gradient-to-t from-orange-500/10 to-transparent pointer-events-none" />
      )}
    </div>
  );
}
