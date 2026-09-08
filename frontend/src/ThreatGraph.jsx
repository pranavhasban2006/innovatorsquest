import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Activity, Clock } from 'lucide-react';

export default function ThreatGraph({ history, connected = false, threatScore = 0 }) {
  const isHigh = threatScore > 65;
  const hasData = Boolean(history && history.length > 0);

  const chartData = hasData 
    ? history.map(p => ({
        timeStr: p.time instanceof Date 
          ? p.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) 
          : (typeof p.time === 'string' ? new Date(p.time).toLocaleTimeString() : ''),
        value: typeof p.value === 'number' ? p.value : (typeof p === 'number' ? p : 0)
      }))
    : [];

  const strokeColor = isHigh ? '#DC2626' : '#0284C7';
  const fillGradientId = isHigh ? 'threatGradientLightHigh' : 'threatGradientLightNominal';

  return (
    <div className="w-full h-full flex flex-col justify-between font-['Share_Tech_Mono']">
      
      {/* Chart Header */}
      <div className="flex justify-between items-center mb-2 border-b border-[#E2E8F0] pb-2">
        <div className="text-[11px] font-['Rajdhani'] font-bold tracking-[0.18em] text-slate-800 uppercase flex items-center gap-1.5">
          <Activity size={14} className={isHigh ? "text-red-600 animate-pulse" : "text-sky-700"} />
          REALTIME THREAT ANALYTICS (60S WINDOW)
        </div>
        <div className="flex items-center gap-3 text-[10px] text-slate-600 font-semibold">
          <span className="flex items-center gap-1"><Clock size={11} /> 1Hz SAMPLE</span>
          <span className={`px-1.5 py-0.2 border ${isHigh ? 'border-red-500 text-red-800 bg-red-100' : 'border-sky-300 text-sky-900 bg-sky-50'}`}>
            CURRENT: {threatScore}%
          </span>
        </div>
      </div>

      {/* Chart Canvas vs Empty State Area */}
      {!hasData ? (
        <div className="flex-1 w-full flex flex-col items-center justify-center min-h-45 bg-slate-50 border border-dashed border-[#CBD5E1] p-4 text-center my-1">
          {connected ? (
            <div className="flex items-center gap-2 text-amber-700 font-bold text-xs tracking-wider uppercase">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              AWAITING TELEMETRY...
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-500 font-bold text-xs tracking-wider uppercase">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              NO BACKEND CONNECTION
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 w-full -ml-3 min-h-45">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="threatGradientLightNominal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0284C7" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#0284C7" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="threatGradientLightHigh" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#DC2626" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#DC2626" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              
              <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} opacity={0.8} />
              
              <XAxis 
                dataKey="timeStr" 
                tick={{ fill: '#475569', fontSize: 9, fontFamily: 'Share Tech Mono', fontWeight: 600 }} 
                axisLine={{ stroke: '#CBD5E1' }} 
                tickLine={false} 
                interval={14}
              />
              
              <YAxis 
                domain={[0, 100]} 
                stroke="#475569" 
                fontSize={9} 
                fontFamily="Share Tech Mono"
                fontWeight={600}
                axisLine={{ stroke: '#CBD5E1' }} 
                tickLine={false} 
                tickMargin={5}
                ticks={[0, 25, 50, 75, 100]}
              />
              
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#FFFFFF', 
                  border: '1px solid #CBD5E1', 
                  borderRadius: '0px', 
                  color: '#0F172A', 
                  fontSize: '11px',
                  fontFamily: 'Share Tech Mono',
                  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.1)'
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
