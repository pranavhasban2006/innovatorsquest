const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const { sendAlert } = require('../Cloud_Functions/alert_handler'); // Intrusion Email Protocol

dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/spectr';
mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

// ─── Schemas ───────────────────────────────────────────────────────────────
const SensorDataSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  threatLevel: { type: String, enum: ['LOW', 'ELEVATED', 'HIGH'], default: 'LOW' },
  humanDetected: { type: Boolean, default: false },
  temperature: { type: Number },
  humidity: { type: Number },
  pitch: { type: Number },
  roll: { type: Number },
  magneticHeading: { type: Number },
  magDeclination: { type: Number },
  latitude: { type: Number },
  longitude: { type: Number },
  speed: { type: Number },
  heading: { type: Number },
  threatScore: { type: Number, min: 0, max: 100 },
  detectionConfidence: { type: Number },
  detectionCount: { type: Number },
  cameraStatus: { type: String },
  blockchain_hash: { type: String },
  salt: { type: String },
  security_level: { type: String }
});

const AlertSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  type: { type: String },
  message: { type: String },
  severity: { type: String, enum: ['INFO', 'WARNING', 'CRITICAL'] }
});

const SensorData = mongoose.model('SensorData', SensorDataSchema);
const Alert = mongoose.model('Alert', AlertSchema);

// ─── REST Routes ────────────────────────────────────────────────────────────
app.get('/api/sensor/latest', async (req, res) => {
  try {
    const latest = await SensorData.findOne().sort({ timestamp: -1 });
    res.json(latest || generateMockData());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/sensor/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 60;
    const data = await SensorData.find().sort({ timestamp: -1 }).limit(limit);
    res.json(data.reverse());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/sensor', async (req, res) => {
  try {
    const entry = new SensorData(req.body);
    await entry.save();
    broadcastToClients({ type: 'SENSOR_UPDATE', data: entry });
    res.status(201).json(entry);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/alerts', async (req, res) => {
  try {
    const alerts = await Alert.find().sort({ timestamp: -1 }).limit(20);
    res.json(alerts);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/alerts', async (req, res) => {
  try {
    const alert = new Alert(req.body);
    await alert.save();
    broadcastToClients({ type: 'ALERT', data: alert });
    res.status(201).json(alert);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', uptime: process.uptime(), dbState: mongoose.connection.readyState });
});

// ─── WebSocket ──────────────────────────────────────────────────────────────
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`Client connected. Total: ${clients.size}`);

  ws.send(JSON.stringify({ type: 'CONNECTED', message: 'SPECTR system online' }));

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`Client disconnected. Total: ${clients.size}`);
  });

  ws.on('error', () => clients.delete(ws));
});

function broadcastToClients(data) {
  const msg = JSON.stringify(data);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  });
}

// ─── Simulator (for demo when no hardware connected) ─────────────────────
let simLat = 34.1005;
let simLng = -118.3250;
let simHeading = 0;
let threatHistory = [];

function generateMockData() {
  simHeading = (simHeading + (Math.random() * 10 - 5) + 360) % 360;
  simLat += (Math.cos((simHeading * Math.PI) / 180) * 0.0001);
  simLng += (Math.sin((simHeading * Math.PI) / 180) * 0.0001);

  const score = Math.random() * 100;
  threatHistory.push(score);
  if (threatHistory.length > 60) threatHistory.shift();

  const threatLevel = score > 65 ? 'HIGH' : score > 35 ? 'ELEVATED' : 'LOW';
  const humanDetected = score > 55 || Math.random() > 0.7;

  return {
    timestamp: new Date(),
    threatLevel,
    humanDetected,
    temperature: +(20 + Math.random() * 15).toFixed(1),
    humidity: +(40 + Math.random() * 40).toFixed(0),
    pitch: +(Math.random() * 10 - 5).toFixed(1),
    roll: +(Math.random() * 10 - 5).toFixed(1),
    magneticHeading: +simHeading.toFixed(0),
    magDeclination: 2.3,
    latitude: +simLat.toFixed(6),
    longitude: +simLng.toFixed(6),
    speed: +(Math.random() * 5).toFixed(1),
    heading: +simHeading.toFixed(0),
    threatScore: +score.toFixed(1),
    threatHistory: [...threatHistory]
  };
}

// Push simulated data every 2 seconds (disabled by default)
if (process.env.SIMULATE === 'true') {
  setInterval(async () => {
    const data = generateMockData();
    try {
      const entry = new SensorData(data);
      await entry.save();
    } catch (e) { /* ignore */ }
    broadcastToClients({ type: 'SENSOR_UPDATE', data });
  }, 2000);
}

// 🛑 REAL DATA MODE: Native Routing of Payload ────────────────────────────

let realtimeThreatHistory = [];
let breachData = { active: false, timer: null };
let lastEmailTime = 0; // Prevent Gmail spam bans during constant intrusion
let lastElevatedEmailTime = 0; // Separate rate limit for ELEVATED alerts

// Pre-resolve log path once at startup
const logDir = path.join(__dirname, '..', 'Logs');
const logFilePath = path.join(logDir, 'spectr_blockchain_ledger.txt');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

app.post("/api/data", async (req, res) => {
  const data = req.body;

  // Basic input validation — reject obviously malformed payloads
  if (!data || typeof data !== 'object') {
    return res.status(400).send("Invalid payload");
  }

  // Sanitize numeric fields — replace NaN/Infinity with 0
  const numericFields = ['threatScore', 'temperature', 'humidity', 'pitch', 'roll',
    'latitude', 'longitude', 'speed', 'heading', 'detectionConfidence',
    'detectionCount', 'magneticHeading', 'frontDist', 'sideDist'];
  for (const field of numericFields) {
    if (data[field] !== undefined) {
      const val = Number(data[field]);
      data[field] = isFinite(val) ? val : 0;
    }
  }

  if (data.threatScore !== undefined) {
    realtimeThreatHistory.push(data.threatScore);
    if (realtimeThreatHistory.length > 60) realtimeThreatHistory.shift();
    data.threatHistory = [...realtimeThreatHistory];
  }

  console.log("Received from Python:", data.humanDetected, data.threatScore);

  // Email Alert Threshold (Spam protected to 1 max per minute for HIGH, 5 min for ELEVATED)
  if (data.threatScore > 85 && (Date.now() - lastEmailTime) > 60000) {
      console.log("📧 SENDING EMAIL ALERT FOR HIGH INTRUSION!");
      sendAlert("🚨 HIGH THREAT INTRUSION DETECTED", `SPECTR YOLO system has detected a critical high-level threat in the perimeter.\n\nSeverity Score: ${data.threatScore.toFixed(1)}\nHuman Subject Verified: ${data.humanDetected}\nCoordinates: ${data.latitude}, ${data.longitude}`);
      lastEmailTime = Date.now();
  } else if (data.threatScore > 35 && data.threatScore <= 85 && (Date.now() - lastElevatedEmailTime) > 300000) {
      sendAlert("⚠️ ELEVATED THREAT DETECTED", `SPECTR system has detected elevated activity.\n\nSeverity Score: ${data.threatScore.toFixed(1)}\nCoordinates: ${data.latitude}, ${data.longitude}`);
      lastElevatedEmailTime = Date.now();
  }

  // Breach Detection: Extreme Tilt + High Threat indicates drone capture!
  if (!breachData.active && (Math.abs(data.pitch) > 60 || Math.abs(data.roll) > 60) && data.threatScore > 65) {
      breachData.active = true;
      console.log("🚨 PROBABLE DRONE CAPTURE DETECTED. INITIATING BREACH PROTOCOL!");
      broadcastToClients({ type: 'ALERT', data: { timestamp: new Date(), severity: 'CRITICAL', message: `BREACH PROTOCOL: DRONE CAPTURED! AWAITING ADMIN AUTH FOR WIPE!` }});
      
      sendAlert("CRITICAL HARDWARE CAPTURE DETECTED", "SPECTR Unit 7 has detected kinematic conditions matching physical capture. Breach protocol initiated. Hard drive wipe in 30 seconds unless aborted via dashboard.");
      
      breachData.timer = setTimeout(async () => {
         if (breachData.active) {
            console.log("☠️ BREACH TIMEOUT REACHED -> WIPING DB SECRETS!");
            await SensorData.deleteMany({});
            broadcastToClients({ type: 'ALERT', data: { timestamp: new Date(), severity: 'CRITICAL', message: `DATA WIPED: SPECTR AUTO-DELETE PROTOCOL EXECUTED.` }});
            breachData.active = false;
         }
      }, 30000); // 30 second timer
  }

  // Dynamic System Log Injection based on AI/Sensors
  if (data.obstacle && data.obstacle !== "CLEAR") {
    broadcastToClients({ type: 'ALERT', data: { timestamp: new Date(), severity: 'WARNING', message: `NAV-SYS: ${data.obstacle} -> Auto-Routing ${data.move}` }});
  } else if (data.threatScore > 65) {
    broadcastToClients({ type: 'ALERT', data: { timestamp: new Date(), severity: 'CRITICAL', message: `YOLO-AI: HIGH TARGET THREAT CONFIRMED (LVL ${Math.round(data.threatScore)})` }});
  } else if (data.humanDetected) {
    broadcastToClients({ type: 'ALERT', data: { timestamp: new Date(), severity: 'INFO', message: "TARGET ACQUIRED: Human Presence Verified by YOLO" }});
  } else if (data.magnetic === 0) {
    broadcastToClients({ type: 'ALERT', data: { timestamp: new Date(), severity: 'WARNING', message: "ANOMALY: High Magnetic Interference Detected" }});
  }

  // Send to frontend via WebSocket IMMEDIATELY for zero latency
  broadcastToClients({ type: 'SENSOR_UPDATE', data });
  
  // Respond to Python script immediately
  res.send("OK");
  
  try {
    const entry = new SensorData(data);
    entry.save().catch(e => console.warn('[MongoDB Save Warning]:', e.message));
    
    // 💾 Physical File Logging for Live Demonstration
    const logLine = `[${new Date().toLocaleString()}] LVL: ${data.security_level || 'SAFE'} | HASH: ${data.blockchain_hash} | SCORE: ${data.threatScore}\n`;
    fs.appendFile(logFilePath, logLine, (err) => {
        if (err) console.error("[Ledger Write Error]:", err.message);
    });
    
  } catch (e) { 
    console.error("[Telemetry Post Handling Error]:", e.message);
  }
});

app.get("/api/breach/status", (req, res) => {
   res.json({ active: breachData.active });
});

app.post("/api/breach/approve", async (req, res) => {
   const secret = process.env.BREACH_SECRET;
   if (secret && req.headers['x-breach-token'] !== secret) {
     return res.status(403).send("Unauthorized");
   }
   if (!breachData.active) return res.status(400).send("No active breach");
   console.log("☠️ ADMIN APPROVED BREACH -> SECURE WIPE INITIATED!");
   clearTimeout(breachData.timer);
   await SensorData.deleteMany({});
   broadcastToClients({ type: 'ALERT', data: { timestamp: new Date(), severity: 'CRITICAL', message: `DATA WIPED: ADMIN EXECUTED SECURE WIPE.` }});
   breachData.active = false;
   res.send("BREACH APPROVED");
});

app.post("/api/breach/cancel", async (req, res) => {
   if (!breachData.active) return res.status(400).send("No active breach");
   clearTimeout(breachData.timer);
   breachData.active = false;
   broadcastToClients({ type: 'ALERT', data: { timestamp: new Date(), severity: 'INFO', message: `BREACH CANCELLED: Stand down order given.` }});
   res.send("BREACH CANCELLED");
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`SPECTR server running on port ${PORT}`));