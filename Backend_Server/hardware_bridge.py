print("[TRACE] Booting bridge...", flush=True)

# --- WINDOWS HANG WORKAROUND ---
# PyTorch and Ultralytics occasionally hang on certain Windows versions when querying the WMI API during import.
# By mocking the system introspections, the code bypasses those deep OS calls entirely and loads instantly.
import platform
from collections import namedtuple
UnameResult = namedtuple('uname_result', ['system', 'node', 'release', 'version', 'machine', 'processor'])
platform.uname = lambda: UnameResult("Windows", "PC", "10", "10.0.19041", "AMD64", "AMD64")
platform.system = lambda: "Windows"
platform.win32_ver = lambda *a, **k: ("10", "10.0.19041", "", "Multiprocessor Free")
# -------------------------------

import time, json, cv2, threading, requests, base64, ssl, queue, hashlib, secrets, random, os
import paho.mqtt.client as mqtt
from Crypto.Cipher import AES
from Crypto.Util.Padding import unpad
from ultralytics import YOLO
from flask import Flask, Response
from flask_cors import CORS

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

BROKER = os.environ.get("MQTT_BROKER", "d4152fc4908b486d88b26fefd6dfa7ab.s1.eu.hivemq.cloud")
PORT = int(os.environ.get("MQTT_PORT", 8883))
TOPIC = os.environ.get("MQTT_TOPIC", "drone/DRONE_01")
USERNAME = os.environ.get("MQTT_USERNAME", os.environ.get("MQTT_USER", "Drone123"))
PASSWORD = os.environ.get("MQTT_PASS", "Spectr@123")

KEY = os.environ.get("AES_SECRET_KEY", "DRONE_SECURE_KEY").encode("utf-8")
IV  = os.environ.get("AES_IV", "INITVECTOR123456").encode("utf-8")
EXPRESS_API_URL = os.environ.get("EXPRESS_API_URL", "http://localhost:5000/api/data")

# Blockchain Crypto Setup
crypto_queue = queue.Queue()

def crypto_transmission_engine():
    HW_SALT = "SPECTR_MAC_9X4Z"
    while True:
        try:
            payload = crypto_queue.get()
            # 🛑 FLUSH BACKLOG: Discard stale packets if the drone transmits faster than the delay
            while not crypto_queue.empty():
                try:
                    payload = crypto_queue.get_nowait()
                except:
                    pass
                    
            level = payload.get("threatLevel", "LOW")
            
            raw_str = json.dumps(payload, sort_keys=True)
            
            if level == "LOW":
                # Safe: Normal mode -> Continuous data -> SHA-256
                hash_val = hashlib.sha256(raw_str.encode()).hexdigest()
                payload["blockchain_hash"] = hash_val
                payload["security_level"] = "SAFE"
                delay = 0

            elif level == "ELEVATED":
                # Alert: Suspicious activity -> Interval data -> SHA-512 + salt
                sw_salt = secrets.token_hex(4)
                salted_str = sw_salt + raw_str
                hash_val = hashlib.sha512(salted_str.encode()).hexdigest()
                payload["blockchain_hash"] = hash_val
                payload["salt"] = sw_salt
                payload["security_level"] = "ALERT"
                delay = 2.0  # Constant interval

            else:
                # Ghost: Stealth mode -> Random bursts -> SHA-512 + HW salt
                salted_str = HW_SALT + raw_str
                hash_val = hashlib.sha512(salted_str.encode()).hexdigest()
                payload["blockchain_hash"] = hash_val
                payload["salt"] = "HW_LOCKED"
                payload["security_level"] = "GHOST"
                delay = random.uniform(0.3, 2.5) # Chaotic burst timing
                
            if delay > 0:
                 time.sleep(delay)
                 
            requests.post(EXPRESS_API_URL, json=payload, timeout=2)
        except Exception as e:
            pass

threading.Thread(target=crypto_transmission_engine, daemon=True).start()

# Attempt IP Camera Stream connection
latest_frame = None
camera_online = False
cap = None

CAMERA_URL_ENV = os.environ.get("CAMERA_URL", "http://192.168.137.27:8080/video")
try:
    video_source = int(CAMERA_URL_ENV)
except ValueError:
    video_source = CAMERA_URL_ENV

detection_state = {
    "humanDetected": False,
    "confidence": 0.0,
    "boxCount": 0,
    "cameraStatus": "NOT CONNECTED"
}

def cam_thread():
    global latest_frame, camera_online, cap
    print(f"[SYSTEM] Attempting concurrent connection to Drone IP Camera ({video_source})...", flush=True)
    cap = cv2.VideoCapture(video_source)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
    
    while True:
        if not cap.isOpened():
            print("[SYSTEM] Camera disconnected. Reconnecting...", flush=True)
            cap.release()
            cap = cv2.VideoCapture(video_source)
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            time.sleep(2)
            continue
            
        ret, frame = cap.read()
        if ret:
            latest_frame = frame
            camera_online = True
        else:
            camera_online = False
            print("[SYSTEM] Camera frame dropped. Reconnecting...", flush=True)
            cap.release() # Force reconnect on next iteration
            time.sleep(1)

threading.Thread(target=cam_thread, daemon=True).start()

print("[SYSTEM] Importing YOLO Model... (This may take a moment to load)", flush=True)
import warnings
warnings.filterwarnings("ignore")
try:
    model = YOLO("yolov8n.pt")
    print("[SYSTEM] YOLO Model loaded successfully!", flush=True)
except Exception as e:
    print(f"[SYSTEM] YOLO failed to load: {e}", flush=True)

# Continuous AI Detection Thread
display_frame = None
def detection_thread():
    global display_frame, detection_state
    while True:
        if camera_online and latest_frame is not None:
            try:
                results = model.predict(latest_frame, imgsz=320, conf=0.5, classes=[0], verbose=False)
                display_frame = results[0].plot()
                boxes = results[0].boxes
                if len(boxes) > 0:
                    max_conf = float(max(b.conf[0] for b in boxes))
                    detection_state = {
                        "humanDetected": True,
                        "confidence": round(max_conf * 100, 1),
                        "boxCount": len(boxes),
                        "cameraStatus": "CONNECTED"
                    }
                else:
                    detection_state = {
                        "humanDetected": False,
                        "confidence": 0.0,
                        "boxCount": 0,
                        "cameraStatus": "CONNECTED"
                    }
            except Exception as e:
                detection_state["cameraStatus"] = "ERROR"
        else:
            detection_state = {
                "humanDetected": False,
                "confidence": 0.0,
                "boxCount": 0,
                "cameraStatus": "NOT CONNECTED"
            }
            display_frame = None
        time.sleep(0.2) # ~5 FPS detection rate

threading.Thread(target=detection_thread, daemon=True).start()

# ---- FLASK VIDEO STREAMING SERVER ----
app_flask = Flask(__name__)
CORS(app_flask)

def gen_frames():
    global display_frame
    while True:
        if display_frame is not None:
            ret, buffer = cv2.imencode('.jpg', display_frame)
            frame_bytes = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        else:
            time.sleep(0.1)

@app_flask.route('/video_feed')
def video_feed():
    return Response(gen_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app_flask.route('/detection_status')
def detection_status():
    return detection_state

@app_flask.route('/')
def index():
    return {"status": "AI Hardware Bridge Server Ready"}

from grid_map import GridMap
from pathfinding import a_star

@app_flask.route('/api/pathfind', methods=['POST'])
def get_pathfind_route():
    try:
        from flask import request, jsonify
        data = request.json or {}
        start_lat = data.get("start", {}).get("lat", 34.09670)
        start_lng = data.get("start", {}).get("lng", -118.19156)
        goal_lat = data.get("goal", {}).get("lat", 34.09720)
        goal_lng = data.get("goal", {}).get("lng", -118.19080)
        
        g_map = GridMap()
        
        # If intrusion is detected, mark hazard at threat position
        threats = data.get("threats", [])
        if detection_state.get("humanDetected") and "threat_lat" in data and "threat_lng" in data:
            threats.append({"lat": data["threat_lat"], "lng": data["threat_lng"]})
            
        for t in threats:
            g_map.mark_hazard(t["lat"], t["lng"], radius_cells=3, cost=100.0)
            
        start_cell = g_map.latlng_to_cell(start_lat, start_lng)
        goal_cell = g_map.latlng_to_cell(goal_lat, goal_lng)
        
        path_cells, total_cost = a_star(g_map, start_cell, goal_cell)
        
        if not path_cells:
            return jsonify({"status": "SUCCESS", "blocked": True, "path": [], "totalCost": None})
            
        path_segments = []
        for r, c in path_cells:
            lat, lng = g_map.cell_to_latlng(r, c)
            cost = g_map.get_cost(r, c)
            path_segments.append({"lat": lat, "lng": lng, "cost": cost})
            
        return jsonify({
            "status": "SUCCESS",
            "blocked": False,
            "path": path_segments,
            "totalCost": round(total_cost, 2)
        })
    except Exception as e:
        return jsonify({"status": "ERROR", "message": str(e)}), 500

def run_flask():
    print("[SYSTEM] Flask Video Proxy & Pathfinding API starting on port 5001...", flush=True)
    app_flask.run(host='0.0.0.0', port=5001, debug=False, use_reloader=False)

threading.Thread(target=run_flask, daemon=True).start()

def decrypt_packet(enc):
    try:
        enc = enc.strip()
        if len(enc) % 4:
            enc += '=' * (4 - len(enc) % 4)
        raw = base64.b64decode(enc)
        cipher = AES.new(KEY, AES.MODE_CBC, IV)
        return unpad(cipher.decrypt(raw), 16).decode(errors='ignore')
    except:
        return None

def on_message(client, userdata, msg):
    print(f"[CLOUD INBOUND] Received encrypted packet of length {len(msg.payload)}")
    decoded = decrypt_packet(msg.payload.decode())
    if not decoded:
        print("[CLOUD INBOUND] ❌ Decryption Failed (Is the DRONE_SECURE_KEY matching?)")
        return

    start = decoded.find('{')
    end = decoded.rfind('}')
    if start == -1 or end == -1:
        return

    clean = decoded[start:end+1].replace("nan", "0")

    try:
        sensor = json.loads(clean)
    except:
        return

    temp = float(sensor.get("temp", 30))
    humidity = float(sensor.get("humidity", 50))
    tilt = float(sensor.get("tilt", 0))
    magnetic = int(sensor.get("magnetic", 1))
    front = float(sensor.get("frontDist", 150))
    side = float(sensor.get("sideDist", 150))
    gps = sensor.get("gps", "0,0")

    intrusion = detection_state["humanDetected"]
    cam_status = detection_state["cameraStatus"]
    detection_conf = detection_state["confidence"]
    box_count = detection_state["boxCount"]

    # Obstacle mapping
    if front < 30:
        obstacle = "FRONT DETECTED"
    elif side < 30:
        obstacle = "SIDE DETECTED"
    else:
        obstacle = "CLEAR"

    # Danger Assessment Engine
    threat = 0
    if intrusion: threat += 40
    if tilt > 4: threat += 15
    if temp > 30: threat += 10
    if front < 50: threat += 20
    if side < 30: threat += 10
    if magnetic == 0: threat += 5

    if threat > 60:
        level = "HIGH"
    elif threat > 25:
        level = "ELEVATED"
    else:
        level = "LOW"

    if front < 30:
        move = "LEFT"
    elif intrusion:
        move = "LEFT"
    elif tilt > 4:
        move = "RIGHT"
    else:
        move = "FORWARD"

    # --- ROUTE TO NODE.JS WEB DASHBOARD ---
    lat, lng = 0.0, 0.0
    
    if "," in gps:
        try:
            parts = gps.split(',')
            lat, lng = float(parts[0]), float(parts[1])
        except:
            pass

    payload = {
        "threatLevel": level,
        "humanDetected": intrusion,
        "detectionConfidence": detection_conf,
        "detectionCount": box_count,
        "cameraStatus": cam_status,
        "temperature": temp,
        "humidity": humidity,
        "pitch": tilt,
        "roll": 0.0,
        "latitude": lat,
        "longitude": lng,
        "threatScore": threat,
        "magneticHeading": 0 if magnetic == 1 else 180,
        "magnetic": magnetic,
        "frontDist": front,
        "sideDist": side,
        "obstacle": obstacle,
        "move": move,
        "speed": 0,
        "heading": 0
    }

    try:
        crypto_queue.put(payload)
    except Exception as e:
        pass

    print("\n---- SECURE TELEMETRY SHIPPED TO CRYPTO ENGINE ----")
    print("Camera Status  :", cam_status)
    print("Human Detected :", "YES" if intrusion else "NO")
    print("Temperature    :", temp, "C")
    print("Humidity       :", humidity, "%")
    print("Tilt           :", tilt)
    print("Magnetic       :", "METAL DETECTED" if magnetic == 0 else "NORMAL")
    print("Obstacle       :", obstacle)
    print("GPS            :", gps)
    print("Threat Score   :", threat)
    print("Threat Level   :", level)
    print("----------------------------------------")

client = mqtt.Client()
client.username_pw_set(USERNAME, PASSWORD)
client.tls_set(cert_reqs=ssl.CERT_NONE)

client.on_message = on_message

print("Connecting to HiveMQ Hardware Broker...")
client.connect(BROKER, PORT)
client.subscribe(TOPIC)

print("AI Hardware Bridge Server Ready — RUNNING YOLOv8")
client.loop_forever()
