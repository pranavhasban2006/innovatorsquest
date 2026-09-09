import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './GPSMap.css';
import { MapPin, Navigation, Compass, AlertTriangle } from 'lucide-react';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

function RecenterMap({ position }) {
  const map = useMap();
  useEffect(() => {
    if (map && position && Array.isArray(position) && position.length === 2 && !isNaN(position[0]) && !isNaN(position[1])) {
      map.invalidateSize();
      map.setView(position, map.getZoom(), { animate: true });
    }
  }, [map, position]);
  return null;
}

export default function GPSMap({ lat = 26.91240, lng = 75.78730, heading = 52, speed = 3.8, connected = true }) {
  const validLat = typeof lat === 'number' && !isNaN(lat) && lat !== 0 ? lat : 26.91240;
  const validLng = typeof lng === 'number' && !isNaN(lng) && lng !== 0 ? lng : 75.78730;
  const currentPos = useMemo(() => [validLat, validLng], [validLat, validLng]);

  const [trail, setTrail] = useState([]);
  const [plannedPath, setPlannedPath] = useState([]);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isPlanning, setIsPlanning] = useState(false);
  const [threatPos, setThreatPos] = useState(null);
  const [mapStyle, setMapStyle] = useState('dark');

  useEffect(() => {
    setTrail((prevTrail) => {
      if (prevTrail.length > 0) {
        const lastPoint = prevTrail[prevTrail.length - 1];
        const latDiff = Math.abs(lastPoint[0] - validLat);
        const lngDiff = Math.abs(lastPoint[1] - validLng);
        if (latDiff < 1e-6 && lngDiff < 1e-6) {
          return prevTrail;
        }
      }
      const updated = [...prevTrail, [validLat, validLng]];
      if (updated.length > 50) {
        return updated.slice(updated.length - 50);
      }
      return updated;
    });
  }, [validLat, validLng]);

  const handlePlanRoute = async () => {
    setIsPlanning(true);
    setIsBlocked(false);
    const pathfindUrl = import.meta.env.VITE_PATHFIND_URL || 'http://localhost:5001/api/pathfind';
    const threatLat = validLat + 0.0003;
    const threatLng = validLng + 0.0003;
    setThreatPos([threatLat, threatLng]);

    try {
      const res = await fetch(pathfindUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start: { lat: validLat, lng: validLng },
          goal: { lat: 26.91310, lng: 75.78820 },
          threat_lat: threatLat,
          threat_lng: threatLng
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
      setPlannedPath([
        { lat: validLat, lng: validLng, cost: 1 },
        { lat: validLat + 0.0002, lng: validLng + 0.0004, cost: 1 },
        { lat: 26.91310, lng: 75.78820, cost: 1 }
      ]);
    } finally {
      setIsPlanning(false);
    }
  };

  const droneIcon = useMemo(() => {
    return L.divIcon({
      className: 'custom-drone-marker',
      html: `
        <div style="transform: rotate(${heading}deg); transition: transform 0.3s ease; display: flex; align-items: center; justify-content: center; width: 38px; height: 38px;">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 0 10px #00f0ff);">
            <path d="M12 2L19 21L12 17L5 21L12 2Z" fill="#00f0ff" stroke="#005577" stroke-width="2" stroke-linejoin="round"/>
          </svg>
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 19],
    });
  }, [heading]);

  const tileProviders = {
    dark: {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: '',
      className: 'tactical-dark-tiles'
    },
    satellite: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: '',
      className: 'tactical-satellite-tiles'
    },
    street: {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: '',
      className: 'tactical-clean-tiles'
    }
  };

  const currentTile = tileProviders[mapStyle];

  return (
    <div className="w-full h-full relative border border-cyan-500/20 cyber-glass flex flex-col justify-between overflow-hidden font-['Share_Tech_Mono'] text-slate-100 bg-[#05070e]">
       
       {/* Top Header Controls Bar */}
       <div className="z-[1000] bg-slate-950/80 backdrop-blur-md border-b border-cyan-500/20 px-4 py-2 flex justify-between items-center text-[10px] pointer-events-auto">
          <div className="flex items-center gap-2 text-cyan-400 font-['Orbitron'] font-bold tracking-[0.18em] uppercase">
             <MapPin size={14} className="text-[#00ff9d]" /> TACTICAL GPS VECTOR MAP
          </div>
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-1 bg-slate-900 p-0.5 border border-cyan-500/30 rounded-xs">
               <button 
                 onClick={() => setMapStyle('dark')} 
                 className={`px-2 py-0.5 text-[9px] font-['Orbitron'] font-bold uppercase transition-all rounded-xs ${mapStyle === 'dark' ? 'bg-[#00f0ff] text-slate-950 shadow-[0_0_8px_#00f0ff]' : 'text-slate-400 hover:text-slate-100'}`}
               >
                 TACTICAL
               </button>
               <button 
                 onClick={() => setMapStyle('satellite')} 
                 className={`px-2 py-0.5 text-[9px] font-['Orbitron'] font-bold uppercase transition-all rounded-xs ${mapStyle === 'satellite' ? 'bg-[#00f0ff] text-slate-950 shadow-[0_0_8px_#00f0ff]' : 'text-slate-400 hover:text-slate-100'}`}
               >
                 SATELLITE
               </button>
               <button 
                 onClick={() => setMapStyle('street')} 
                 className={`px-2 py-0.5 text-[9px] font-['Orbitron'] font-bold uppercase transition-all rounded-xs ${mapStyle === 'street' ? 'bg-[#00f0ff] text-slate-950 shadow-[0_0_8px_#00f0ff]' : 'text-slate-400 hover:text-slate-100'}`}
               >
                 MAP
               </button>
             </div>

             <button 
               onClick={handlePlanRoute}
               disabled={isPlanning}
               className="px-3 py-1 bg-[#ffb700] hover:bg-[#ffc833] active:scale-95 text-slate-950 font-['Orbitron'] font-bold tracking-wider rounded-xs text-[9px] uppercase transition-all shadow-[0_0_10px_#ffb70050] cursor-pointer"
             >
               {isPlanning ? 'CALCULATING...' : 'PLAN ROUTE (A*)'}
             </button>
          </div>
       </div>

       {/* Floating Telemetry HUD Badges */}
       <div className="absolute top-14 left-4 z-[1000] flex gap-2 pointer-events-none">
         <div className="bg-slate-950/85 backdrop-blur-md border border-cyan-500/30 px-3 py-1.5 rounded-xs shadow-md">
           <div className="text-[8px] text-slate-400 tracking-wider font-semibold">LATITUDE</div>
           <div className="text-xs font-bold text-cyan-400 tabular-nums">{validLat?.toFixed(5)}° N</div>
         </div>
         <div className="bg-slate-950/85 backdrop-blur-md border border-cyan-500/30 px-3 py-1.5 rounded-xs shadow-md">
           <div className="text-[8px] text-slate-400 tracking-wider font-semibold">LONGITUDE</div>
           <div className="text-xs font-bold text-cyan-400 tabular-nums">{Math.abs(validLng)?.toFixed(5)}° {validLng >= 0 ? 'E' : 'W'}</div>
         </div>
       </div>

       {/* Blocked Path Danger Warning Banner */}
       {isBlocked && (
         <div className="absolute top-14 left-1/2 -translate-x-1/2 z-[1000] bg-[#ff0055] text-white font-['Orbitron'] font-bold px-4 py-2 text-xs tracking-widest uppercase border border-[#ff0055] animate-bounce shadow-[0_0_20px_#ff0055] flex items-center gap-2 rounded-xs">
           <AlertTriangle size={16} /> NO SAFE PATH: HAZARD MATRIX BLOCKED
         </div>
       )}

       <div className="absolute top-14 right-4 z-[1000] bg-slate-950/85 backdrop-blur-md border border-cyan-500/30 px-3 py-1.5 rounded-xs shadow-md text-right flex gap-3 pointer-events-none">
          <div>
            <div className="text-[8px] text-slate-400 tracking-wider font-semibold">GROUND SPEED</div>
            <div className="text-xs font-bold text-[#00ff9d] tabular-nums">{speed?.toFixed(1)} <span className="text-[9px] text-slate-400 font-normal">m/s</span></div>
          </div>
          <div className="border-l border-cyan-500/20 pl-3">
            <div className="text-[8px] text-slate-400 tracking-wider font-semibold">BEARING</div>
            <div className="text-xs font-bold text-[#00ff9d] tabular-nums">{heading}°</div>
          </div>
       </div>

       {/* Leaflet MapContainer */}
       <div className={`absolute inset-0 z-0 ${currentTile.className}`}>
         <MapContainer 
           center={currentPos} 
           zoom={15} 
           zoomControl={false}
           scrollWheelZoom={true} 
           style={{ width: '100%', height: '100%' }}
         >
           <TileLayer 
             key={mapStyle}
             url={currentTile.url} 
             attribution={currentTile.attribution} 
             maxZoom={19} 
           />
           <RecenterMap position={currentPos} />
           
           {/* Drone Flight Trail Polyline */}
           {trail.length > 1 && (
             <Polyline positions={trail} pathOptions={{ color: '#00f0ff', opacity: 0.9, weight: 3 }} />
           )}

           {/* A* Planned Route Segment Polylines */}
           {plannedPath.length > 1 && plannedPath.slice(0, -1).map((pt, idx) => {
             const nextPt = plannedPath[idx + 1];
             const isHazard = pt.cost > 10 || nextPt.cost > 10;
             return (
               <Polyline 
                 key={idx}
                 positions={[[pt.lat, pt.lng], [nextPt.lat, nextPt.lng]]}
                 pathOptions={{ 
                   color: isHazard ? '#ff0055' : '#00ff9d', 
                   opacity: 0.95, 
                   weight: 4 
                 }} 
               />
             );
           })}

           {/* Hazard Radius Visualization */}
           {threatPos && (
             <Circle 
               center={threatPos} 
               radius={40} 
               pathOptions={{ color: '#ff0055', fillColor: '#ff0055', fillOpacity: 0.35, weight: 2 }} 
             />
           )}

           {/* Current Drone Location Marker */}
           <Marker position={currentPos} icon={droneIcon} />
         </MapContainer>
       </div>

       {/* Map Bottom Status Bar */}
       <div className="z-[1000] bg-slate-950/90 border-t border-cyan-500/20 px-4 py-1.5 flex justify-between items-center text-[9px] text-slate-400 font-semibold pointer-events-auto">
          <span className="flex items-center gap-1.5"><Navigation size={12} className="text-cyan-400" /> OPERATIONAL SECTOR: SECTOR ALPHA-01</span>
          <span className="flex items-center gap-1.5"><Compass size={12} className="text-[#00ff9d]" /> WAYPOINT PATROL: BASE ➔ CP-1</span>
       </div>

    </div>
  );
}