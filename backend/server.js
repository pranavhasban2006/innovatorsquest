const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const { sendAlert, getEmailStatus } = require('../Cloud_Functions/alert_handler'); // Intrusion Email Protocol

dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

// MongoDB Connection (Handles offline state gracefully)
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/spectr';
mongoose.set('bufferCommands', false);
mongoose.connection.on('error', err => console.warn('[MongoDB Offline Warning]:', err.message));
mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 3000 })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.warn('MongoDB connection deferred (Offline mode active)'));

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

app.get('/api/alerts/email-config', (req, res) => {
  try {
    const status = getEmailStatus();
    res.json(status);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/alerts/test-email', async (req, res) => {
  try {
    const subject = req.body?.subject || "🚨 TEST ALERT: SPECTR Security Protocol Verification";
    const message = req.body?.message || "This is an automated test email sent from the SPECTR Tactical Command Center to verify SMTP connectivity and alert functionality.";
    const result = await sendAlert(subject, message, { severity: "INFO" });
    
    if (mongoose.connection.readyState === 1) {
      try {
        const alertEntry = new Alert({
          timestamp: new Date(),
          type: "SYSTEM_EMAIL_TEST",
          message: `Test email sent to ${result.recipients}`,
          severity: "INFO"
        });
        alertEntry.save().catch(() => {});
      } catch (err) {}
    }

    broadcastToClients({ type: 'ALERT', data: { timestamp: new Date(), severity: 'INFO', message: `Test email dispatched to ${result.recipients}` } });

    res.json({ success: true, message: `Email dispatched successfully to ${result.recipients}`, details: result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || "Failed to send email alert" });
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
let breachData = { active: false, timer: null, interval: null, secondsRemaining: 0, reason: '' };
let lastEmailTime = 0; // Prevent Gmail spam bans during constant intrusion
let lastElevatedEmailTime = 0; // Separate rate limit for ELEVATED alerts

// Pre-resolve log path once at startup
const logDir = path.join(__dirname, '..', 'Logs');
const logFilePath = path.join(logDir, 'spectr_blockchain_ledger.txt');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

async function executeSecureWipe(reason = "AUTO_DELETE_TIMEOUT") {
  console.log(`☠️ SECURE WIPE EXECUTING (${reason}) -> WIPING DATABASE & LEDGER!`);
  
  if (breachData.timer) clearTimeout(breachData.timer);
  if (breachData.interval) clearInterval(breachData.interval);
  breachData.timer = null;
  breachData.interval = null;

  try {
    await SensorData.deleteMany({});
  } catch (err) {
    console.error("[Wipe Error MongoDB]:", err.message);
  }

  try {
    fs.writeFileSync(logFilePath, `[${new Date().toLocaleString()}] ⚠️ DATA WIPED BY SPECTR SECURE BREACH PROTOCOL (${reason})\n`);
  } catch (err) {
    console.error("[Wipe Error Ledger File]:", err.message);
  }

  breachData.active = false;
  breachData.secondsRemaining = 0;

  broadcastToClients({
    type: 'BREACH_STATE',
    data: { state: 'EXECUTED', message: `DATA WIPED: ${reason}` }
  });

  broadcastToClients({
    type: 'ALERT',
    data: { timestamp: new Date(), severity: 'CRITICAL', message: `DATA WIPED: SPECTR AUTO-DELETE PROTOCOL EXECUTED (${reason}).` }
  });
}

function initiateBreachProtocol(reason = "DRONE CAPTURE SUSPECTED") {
  if (breachData.active) return;

  breachData.active = true;
  breachData.secondsRemaining = 30;
  breachData.reason = reason;

  console.log(`🚨 BREACH PROTOCOL ACTIVATED: ${reason}`);

  broadcastToClients({
    type: 'ALERT',
    data: { timestamp: new Date(), severity: 'CRITICAL', message: `BREACH PROTOCOL: ${reason}! PURGE IN 30s!` }
  });

  broadcastToClients({
    type: 'BREACH_STATE',
    data: { state: 'ACTIVATED', secondsRemaining: 30, reason }
  });

  sendAlert("CRITICAL SECURITY BREACH INITIATED", `SPECTR System Security Warning:\nReason: ${reason}\nHard drive and database purge in 30 seconds unless aborted via mission control dashboard.`);

  breachData.interval = setInterval(() => {
    if (!breachData.active) return;
    breachData.secondsRemaining -= 1;

    broadcastToClients({
      type: 'BREACH_STATE',
      data: { state: 'COUNTDOWN', secondsRemaining: breachData.secondsRemaining, reason }
    });

    if (breachData.secondsRemaining <= 0) {
      clearInterval(breachData.interval);
      executeSecureWipe("COUNTDOWN_EXPIRED");
    }
  }, 1000);
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

  console.log("Received telemetry payload:", "humanDetected=", data.humanDetected, "threatScore=", data.threatScore);

  // Email Alert Threshold (Spam protected to 1 max per minute for HIGH, 5 min for ELEVATED)
  if (data.threatScore > 85 && (Date.now() - lastEmailTime) > 60000) {
      console.log("📧 SENDING EMAIL ALERT FOR HIGH INTRUSION!");
      sendAlert("🚨 HIGH THREAT INTRUSION DETECTED", `SPECTR YOLO system has detected a critical high-level threat in the perimeter.\n\nSeverity Score: ${data.threatScore.toFixed(1)}\nHuman Subject Verified: ${data.humanDetected}\nCoordinates: ${data.latitude}, ${data.longitude}`);
      lastEmailTime = Date.now();
  } else if (data.threatScore > 35 && data.threatScore <= 85 && (Date.now() - lastElevatedEmailTime) > 300000) {
      sendAlert("⚠️ ELEVATED THREAT DETECTED", `SPECTR system has detected elevated activity.\n\nSeverity Score: ${data.threatScore.toFixed(1)}\nCoordinates: ${data.latitude}, ${data.longitude}`);
      lastElevatedEmailTime = Date.now();
  }

  // Breach Detection: Extreme Tilt + High Threat indicates physical capture or hostile interception!
  if (!breachData.active && (Math.abs(data.pitch) > 60 || Math.abs(data.roll) > 60) && data.threatScore > 65) {
      initiateBreachProtocol("DRONE KINEMATIC CAPTURE (EXTREME TILT + HIGH THREAT)");
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
   res.json({
     active: breachData.active,
     secondsRemaining: breachData.secondsRemaining,
     reason: breachData.reason
   });
});

app.post("/api/breach/trigger", (req, res) => {
   const reason = req.body?.reason || "MANUAL ADMIN TRIGGER";
   initiateBreachProtocol(reason);
   res.json({ status: "BREACH PROTOCOL INITIATED", reason });
});

app.post("/api/breach/approve", async (req, res) => {
   const secret = process.env.BREACH_SECRET;
   if (secret && req.headers['x-breach-token'] !== secret) {
     return res.status(403).send("Unauthorized");
   }
   if (!breachData.active) return res.status(400).send("No active breach");
   await executeSecureWipe("ADMIN_MANUAL_PURGE");
   res.send("BREACH APPROVED AND DATA WIPED");
});

app.post("/api/breach/cancel", async (req, res) => {
   if (!breachData.active) return res.status(400).send("No active breach");
   if (breachData.interval) clearInterval(breachData.interval);
   if (breachData.timer) clearTimeout(breachData.timer);
   breachData.active = false;
   breachData.secondsRemaining = 0;
   
   broadcastToClients({
     type: 'BREACH_STATE',
     data: { state: 'CANCELLED', message: 'ABORT ORDER EXECUTED BY COMMAND' }
   });

   broadcastToClients({ type: 'ALERT', data: { timestamp: new Date(), severity: 'INFO', message: `BREACH CANCELLED: Stand down order given.` }});
   res.send("BREACH CANCELLED");
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`SPECTR server running on port ${PORT}`));