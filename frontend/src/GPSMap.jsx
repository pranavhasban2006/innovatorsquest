import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';

// Child component inside MapContainer to dynamically re-center map view
function RecenterMap({ position }) {
  const map = useMap();
  useEffect(() => {
    if (map && position && Array.isArray(position) && position.length === 2) {
      map.setView(position, map.getZoom(), { animate: true });
    }
  }, [map, position]);
  return null;
}

export default function GPSMap({ lat = 34.09670, lng = -118.19156, heading = 52, speed = 3.8 }) {
  const currentPos = useMemo(() => [lat, lng], [lat, lng]);
  const [trail, setTrail] = useState([]);
  const [plannedPath, setPlannedPath] = useState([]);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isPlanning, setIsPlanning] = useState(false);

  // Track up to 50 last position points if delta > 1e-6
  useEffect(() => {
    setTrail((prevTrail) => {
      if (prevTrail.length > 0) {
        const lastPoint = prevTrail[prevTrail.length - 1];
        const latDiff = Math.abs(lastPoint[0] - lat);
        const lngDiff = Math.abs(lastPoint[1] - lng);
        if (latDiff < 1e-6 && lngDiff < 1e-6) {
          return prevTrail;
        }
      }
      const updated = [...prevTrail, [lat, lng]];
      if (updated.length > 50) {
        return updated.slice(updated.length - 50);
      }
      return updated;
    });
  }, [lat, lng]);

  const handlePlanRoute = async () => {
    setIsPlanning(true);
    setIsBlocked(false);
    const pathfindUrl = import.meta.env.VITE_PATHFIND_URL || 'http://localhost:5001/api/pathfind';
    try {
      const res = await fetch(pathfindUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start: { lat, lng },
          goal: { lat: 34.09740, lng: -118.19050 },
          threat_lat: lat + 0.0003,
          threat_lng: lng + 0.0003
        })
      });
      const data = await res.json();
      if (data.blocked) {
        setIsBlocked(true);
        setPlannedPath([]);
      } else {
        setPlannedPath(data.path || []);
      }
    } catch (e) {
      console.error("Pathfind call failed:", e);
    } finally {
      setIsPlanning(false);
    }
  };

  // Create custom L.divIcon with inline SVG arrow rotated by heading
  const droneIcon = useMemo(() => {
    return L.divIcon({
      className: 'custom-drone-marker',
      html: `
        <div style="transform: rotate(${heading}deg); transition: transform 0.3s ease; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 0 6px #10b981);">
            <path d="M12 2L19 21L12 17L5 21L12 2Z" fill="#10B981" stroke="#047857" stroke-width="2" stroke-linejoin="round"/>
          </svg>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  }, [heading]);

  const tileUrl = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
  const tileAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

  return (
    <div className="w-full h-full relative border border-[#CBD5E1] flex flex-col justify-between overflow-hidden font-['Share_Tech_Mono'] text-slate-900 bg-slate-900">
       
       {/* Top Header Controls Bar - z-[1000] */}
       <div className="z-1000 bg-white/95 backdrop-blur border-b border-[#CBD5E1] px-4 py-2 flex justify-between items-center text-[10px] pointer-events-auto">
          <div className="flex items-center gap-2 text-sky-800 font-['Rajdhani'] font-bold tracking-[0.18em] uppercase">
             <MapPin size={14} /> GPS TACTICAL LEAFLET VECTOR MAP
          </div>
          <div className="flex items-center gap-3">
             <button 
               onClick={handlePlanRoute}
               disabled={isPlanning}
               className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold tracking-wider rounded text-[9px] uppercase transition-colors"
             >
               {isPlanning ? 'CALCULATING...' : 'PLAN ROUTE (A*)'}
             </button>
             <span className="text-slate-300">|</span>
             <span className="text-slate-600 font-semibold">DATUM: WGS-84</span>
          </div>
       </div>

       {/* Floating Telemetry HUD Badges - z-[1000] */}
       <div className="absolute top-14 left-4 z-1000 flex gap-2 pointer-events-none">
         <div className="bg-white/90 backdrop-blur border border-[#CBD5E1] px-3 py-1.5 shadow-sm">
           <div className="text-[8px] text-slate-600 tracking-wider font-semibold">LATITUDE</div>
           <div className="text-xs font-bold text-sky-900 tabular-nums">{lat?.toFixed(5)}° N</div>
         </div>
         <div className="bg-white/90 backdrop-blur border border-[#CBD5E1] px-3 py-1.5 shadow-sm">
           <div className="text-[8px] text-slate-600 tracking-wider font-semibold">LONGITUDE</div>
           <div className="text-xs font-bold text-sky-900 tabular-nums">{lng?.toFixed(5)}° W</div>
         </div>
       </div>

       {/* Blocked Path Danger Warning Banner */}
       {isBlocked && (
         <div className="absolute top-14 left-1/2 -translate-x-1/2 z-1000 bg-red-600 text-white font-bold px-4 py-2 text-xs tracking-widest uppercase border border-red-700 animate-bounce shadow-lg">
           ⚠️ NO SAFE PATH: HAZARD MATRIX BLOCKED
         </div>
       )}

       <div className="absolute top-14 right-4 z-1000 bg-white/90 backdrop-blur border border-[#CBD5E1] px-3 py-1.5 shadow-sm text-right flex gap-3 pointer-events-none">
          <div>
            <div className="text-[8px] text-slate-600 tracking-wider font-semibold">GROUND SPEED</div>
            <div className="text-xs font-bold text-emerald-800 tabular-nums">{speed?.toFixed(1)} <span className="text-[9px] text-slate-500 font-normal">m/s</span></div>
          </div>
          <div className="border-l border-[#CBD5E1] pl-3">
            <div className="text-[8px] text-slate-600 tracking-wider font-semibold">BEARING</div>
            <div className="text-xs font-bold text-emerald-800 tabular-nums">{heading}°</div>
          </div>
       </div>

       {/* Leaflet MapContainer */}
       <div className="absolute inset-0 z-0">
         <MapContainer 
           center={currentPos} 
           zoom={14} 
           zoomControl={false}
           scrollWheelZoom={true} 
           style={{ width: '100%', height: '100%' }}
         >
           <TileLayer url={tileUrl} attribution={tileAttribution} />
           <RecenterMap position={currentPos} />
           {trail.length > 1 && (
             <Polyline positions={trail} pathOptions={{ color: '#22d3ee', opacity: 0.6, weight: 2 }} />
           )}
           {plannedPath.length > 1 && plannedPath.slice(0, -1).map((pt, idx) => {
             const nextPt = plannedPath[idx + 1];
             const isHazard = pt.cost > 10 || nextPt.cost > 10;
             return (
               <Polyline 
                 key={idx}
                 positions={[[pt.lat, pt.lng], [nextPt.lat, nextPt.lng]]}
                 pathOptions={{ 
                   color: isHazard ? '#ef4444' : '#10b981', 
                   opacity: 0.9, 
                   weight: 4 
                 }} 
               />
             );
           })}
           <Marker position={currentPos} icon={droneIcon} />
         </MapContainer>
       </div>

       {/* Map Bottom Status Bar - z-[1000] */}
       <div className="z-1000 bg-white/95 border-t border-[#CBD5E1] px-4 py-1.5 flex justify-between items-center text-[9px] text-slate-600 font-semibold pointer-events-auto">
          <span>OPERATIONAL ZONE: SECTOR ALPHA-01</span>
          <span>WAYPOINT: BASE ➔ CP-1</span>
       </div>

    </div>
  );
}