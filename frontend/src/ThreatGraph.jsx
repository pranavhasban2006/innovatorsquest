import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Activity, Clock } from 'lucide-react';

export default function ThreatGraph({ history, connected = false, threatScore = 0 }) {
  const isHigh = threatScore > 65;
  const isElev = threatScore > 35 && !isHigh;
  const hasData = Boolean(history && history.length > 0);

  const chartData = hasData 
    ? history.map(p => ({
        timeStr: p.time instanceof Date 
          ? p.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) 
          : (typeof p.time === 'string' ? new Date(p.time).toLocaleTimeString() : ''),
        value: typeof p.value === 'number' ? p.value : (typeof p === 'number' ? p : 0)
      }))
    : [];

  const strokeColor = isHigh ? '#ff0055' : isElev ? '#ffb700' : '#00f0ff';
  const fillGradientId = isHigh ? 'threatGradientHigh' : isElev ? 'threatGradientElevated' : 'threatGradientNominal';

  return (
    <div className="w-full h-full flex flex-col justify-between font-['Share_Tech_Mono']">
      
      {/* Chart Header */}
      <div className="flex justify-between items-center mb-2 border-b border-cyan-500/20 pb-2">
        <div className="text-[11px] font-['Orbitron'] font-bold tracking-[0.18em] text-slate-200 uppercase flex items-center gap-2">
          <Activity size={16} className={isHigh ? "text-[#ff0055] animate-bounce" : "text-[#00f0ff] animate-pulse"} />
          <span>REALTIME THREAT ANALYTICS (60S WINDOW)</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-slate-400 font-semibold">
          <span className="flex items-center gap-1"><Clock size={12} /> 1Hz SAMPLE</span>
          <span 
            className="px-2 py-0.5 border rounded-xs font-['Orbitron'] font-bold tracking-wider"
            style={{ 
              borderColor: strokeColor, 
              color: strokeColor, 
              backgroundColor: `${strokeColor}15`,
              boxShadow: `0 0 10px ${strokeColor}40`
            }}
          >
            CURRENT: {Math.round(threatScore)}%
          </span>
        </div>
      </div>

      {/* Chart Canvas vs Empty State Area */}
      {!hasData ? (
        <div className="flex-1 w-full flex flex-col items-center justify-center min-h-48 bg-slate-950/60 border border-dashed border-cyan-500/20 p-4 text-center my-1 rounded-lg">
          {connected ? (
            <div className="flex items-center gap-2 text-[#ffb700] font-bold text-xs tracking-wider uppercase font-['Orbitron']">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ffb700] animate-ping" />
              AWAITING TELEMETRY STREAM...
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-500 font-bold text-xs tracking-wider uppercase font-['Orbitron']">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
              NO BACKEND CONNECTION
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 w-full -ml-3 min-h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="threatGradientNominal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#00f0ff" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="threatGradientElevated" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ffb700" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#ffb700" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="threatGradientHigh" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff0055" stopOpacity={0.55} />
                  <stop offset="95%" stopColor="#ff0055" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              
              <CartesianGrid stroke="rgba(0, 240, 255, 0.08)" strokeDasharray="3 3" vertical={false} />
              
              <XAxis 
                dataKey="timeStr" 
                tick={{ fill: '#94a3b8', fontSize: 9, fontFamily: 'Share Tech Mono', fontWeight: 600 }} 
                axisLine={{ stroke: 'rgba(0, 240, 255, 0.2)' }} 
                tickLine={false} 
                interval={14}
              />
              
              <YAxis 
                domain={[0, 100]} 
                stroke="#94a3b8" 
                fontSize={9} 
                fontFamily="Share Tech Mono"
                fontWeight={600}
                axisLine={{ stroke: 'rgba(0, 240, 255, 0.2)' }} 
                tickLine={false} 
                tickMargin={5}
                ticks={[0, 25, 50, 75, 100]}
              />
              
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(10, 15, 30, 0.95)', 
                  border: `1px solid ${strokeColor}`, 
                  borderRadius: '4px', 
                  color: '#f8fafc', 
                  fontSize: '11px',
                  fontFamily: 'Share Tech Mono',
                  boxShadow: `0 0 15px ${strokeColor}40`
                }}
                labelFormatter={(label) => `TIME: ${label}`}
                formatter={(value) => [`THREAT: ${value}%`, 'SCORE']}
                itemStyle={{ color: strokeColor, fontWeight: 'bold' }}
              />
              
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke={strokeColor} 
                strokeWidth={2.5} 
                fillOpacity={1} 
                fill={`url(#${fillGradientId})`} 
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

    </div>
  );
}
