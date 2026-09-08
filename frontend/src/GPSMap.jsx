import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, Compass, AlertTriangle, Layers } from 'lucide-react';

// Fix Leaflet default icon paths in bundlers (Vite/Webpack)
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// Child component inside MapContainer to dynamically re-center map view & invalidate size
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

export default function GPSMap({ lat = 34.09670, lng = -118.19156, heading = 52, speed = 3.8, connected = true }) {
  // Ensure valid coordinate fallbacks
  const validLat = typeof lat === 'number' && !isNaN(lat) && lat !== 0 ? lat : 34.09670;
  const validLng = typeof lng === 'number' && !isNaN(lng) && lng !== 0 ? lng : -118.19156;
  const currentPos = useMemo(() => [validLat, validLng], [validLat, validLng]);

  const [trail, setTrail] = useState([]);
  const [plannedPath, setPlannedPath] = useState([]);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isPlanning, setIsPlanning] = useState(false);
  const [threatPos, setThreatPos] = useState(null);
  const [mapStyle, setMapStyle] = useState('dark'); // 'dark' | 'satellite' | 'street'

  // Track up to 50 last position points if position changes
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
          goal: { lat: 34.09740, lng: -118.19050 },
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
      console.error("Pathfind call failed:", e);
      setPlannedPath([
        { lat: validLat, lng: validLng, cost: 1 },
        { lat: validLat + 0.0002, lng: validLng + 0.0004, cost: 1 },
        { lat: 34.09740, lng: -118.19050, cost: 1 }
      ]);
    } finally {
      setIsPlanning(false);
    }
  };

  // Custom L.divIcon with SVG drone marker
  const droneIcon = useMemo(() => {
    return L.divIcon({
      className: 'custom-drone-marker',
      html: `
        <div style="transform: rotate(${heading}deg); transition: transform 0.3s ease; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px;">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 0 8px #10b981);">
            <path d="M12 2L19 21L12 17L5 21L12 2Z" fill="#10B981" stroke="#047857" stroke-width="2" stroke-linejoin="round"/>
          </svg>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
  }, [heading]);

  // Open-source Map Tile Providers (100% Free, NO API Key required)
  const tileProviders = {
    dark: {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      className: 'tactical-dark-tiles'
    },
    satellite: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      className: 'tactical-satellite-tiles'
    },
    street: {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      className: 'tactical-clean-tiles'
    }
  };

  const currentTile = tileProviders[mapStyle];

  return (
    <div className="w-full h-full relative border border-[#CBD5E1] flex flex-col justify-between overflow-hidden font-['Share_Tech_Mono'] text-slate-900 bg-slate-900">
       
       {/* Top Header Controls Bar - z-[1000] */}
       <div className="z-[1000] bg-white/95 backdrop-blur border-b border-[#CBD5E1] px-4 py-2 flex justify-between items-center text-[10px] pointer-events-auto">
          <div className="flex items-center gap-2 text-sky-800 font-['Rajdhani'] font-bold tracking-[0.18em] uppercase">
             <MapPin size={14} className="text-emerald-600" /> GPS TACTICAL LEAFLET VECTOR MAP
          </div>
          <div className="flex items-center gap-3">
             {/* Map Layer Switcher */}
             <div className="flex items-center gap-1 bg-slate-100 p-0.5 border border-slate-300 rounded">
               <button 
                 onClick={() => setMapStyle('dark')} 
                 className={`px-2 py-0.5 text-[9px] font-bold uppercase transition-all rounded ${mapStyle === 'dark' ? 'bg-sky-700 text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'}`}
               >
                 TACTICAL
               </button>
               <button 
                 onClick={() => setMapStyle('satellite')} 
                 className={`px-2 py-0.5 text-[9px] font-bold uppercase transition-all rounded ${mapStyle === 'satellite' ? 'bg-sky-700 text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'}`}
               >
                 SATELLITE
               </button>
               <button 
                 onClick={() => setMapStyle('street')} 
                 className={`px-2 py-0.5 text-[9px] font-bold uppercase transition-all rounded ${mapStyle === 'street' ? 'bg-sky-700 text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'}`}
               >
                 MAP
               </button>
             </div>

             <button 
               onClick={handlePlanRoute}
               disabled={isPlanning}
               className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-bold tracking-wider rounded text-[9px] uppercase transition-all shadow-sm cursor-pointer"
             >
               {isPlanning ? 'CALCULATING...' : 'PLAN ROUTE (A*)'}
             </button>
          </div>
       </div>

       {/* Floating Telemetry HUD Badges - z-[1000] */}
       <div className="absolute top-14 left-4 z-[1000] flex gap-2 pointer-events-none">
         <div className="bg-white/90 backdrop-blur border border-[#CBD5E1] px-3 py-1.5 shadow-sm">
           <div className="text-[8px] text-slate-600 tracking-wider font-semibold">LATITUDE</div>
           <div className="text-xs font-bold text-sky-900 tabular-nums">{validLat?.toFixed(5)}° N</div>
         </div>
         <div className="bg-white/90 backdrop-blur border border-[#CBD5E1] px-3 py-1.5 shadow-sm">
           <div className="text-[8px] text-slate-600 tracking-wider font-semibold">LONGITUDE</div>
           <div className="text-xs font-bold text-sky-900 tabular-nums">{validLng?.toFixed(5)}° W</div>
         </div>
       </div>

       {/* Blocked Path Danger Warning Banner */}
       {isBlocked && (
         <div className="absolute top-14 left-1/2 -translate-x-1/2 z-[1000] bg-red-600 text-white font-bold px-4 py-2 text-xs tracking-widest uppercase border border-red-700 animate-bounce shadow-lg flex items-center gap-2">
           <AlertTriangle size={16} /> NO SAFE PATH: HAZARD MATRIX BLOCKED
         </div>
       )}

       <div className="absolute top-14 right-4 z-[1000] bg-white/90 backdrop-blur border border-[#CBD5E1] px-3 py-1.5 shadow-sm text-right flex gap-3 pointer-events-none">
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
             <Polyline positions={trail} pathOptions={{ color: '#22d3ee', opacity: 0.85, weight: 3 }} />
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
                   color: isHazard ? '#ef4444' : '#10b981', 
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
               pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.3, weight: 2 }} 
             />
           )}

           {/* Current Drone Location Marker */}
           <Marker position={currentPos} icon={droneIcon} />
         </MapContainer>
       </div>

       {/* Map Bottom Status Bar - z-[1000] */}
       <div className="z-[1000] bg-white/95 border-t border-[#CBD5E1] px-4 py-1.5 flex justify-between items-center text-[9px] text-slate-600 font-semibold pointer-events-auto">
          <span className="flex items-center gap-1.5"><Navigation size={11} className="text-sky-700" /> OPERATIONAL ZONE: SECTOR ALPHA-01</span>
          <span className="flex items-center gap-1.5"><Compass size={11} className="text-emerald-700" /> WAYPOINT: BASE ➔ CP-1</span>
       </div>

    </div>
  );
}