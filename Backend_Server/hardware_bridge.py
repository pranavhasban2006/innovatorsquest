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

import time, json, cv2, threading, requests, base64, ssl, queue, hashlib, secrets, random, os, math
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

BROKER = os.environ.get("MQTT_BROKER", "afc6727442064c98b65753a9cae78163.s1.eu.hivemq.cloud")
PORT = int(os.environ.get("MQTT_PORT", 8883))
TOPIC = os.environ.get("MQTT_TOPIC", "drone/DRONE_01")
USERNAME = os.environ.get("MQTT_USERNAME", os.environ.get("MQTT_USER", "Drone123"))
PASSWORD = os.environ.get("MQTT_PASS", "Spectr@123")

KEY = os.environ.get("AES_SECRET_KEY", "DRONE_SECURE_KEY").encode("utf-8")
IV  = os.environ.get("AES_IV", "INITVECTOR123456").encode("utf-8")
EXPRESS_API_URL = os.environ.get("EXPRESS_API_URL", "http://localhost:5000/api/data")

# Live GPS Tracking State
last_gps_lat = 0.0
last_gps_lng = 0.0
last_gps_time = 0.0

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

CAMERA_URL_ENV = os.environ.get("CAMERA_URL", "http://192.168.137.127/stream")
video_source = CAMERA_URL_ENV

detection_state = {
    "humanDetected": False,
    "confidence": 0.0,
    "boxCount": 0,
    "weaponDetected": False,
    "weaponConfidence": 0.0,
    "cameraStatus": "NOT CONNECTED"
}

import numpy as np

def cam_thread():
    global latest_frame, camera_online
    target = os.environ.get("CAMERA_URL", "http://192.168.137.127/stream")
    print(f"[SYSTEM] 🎯 Connecting to ESP32 Stream: {target}", flush=True)

    while True:
        try:
            r = requests.get(target, stream=True, timeout=5)
            if r.status_code == 200:
                print(f"[SYSTEM] ✅ Connected to ESP32 Camera at {target}!", flush=True)
                bytes_buf = b""
                for chunk in r.iter_content(chunk_size=8192):
                    if not chunk:
                        continue
                    bytes_buf += chunk
                    soi = bytes_buf.find(b'\xff\xd8')
                    eoi = bytes_buf.rfind(b'\xff\xd9')
                    if soi != -1 and eoi != -1 and eoi > soi:
                        jpg = bytes_buf[soi:eoi+2]
                        bytes_buf = bytes_buf[eoi+2:]
                        frame = cv2.imdecode(np.frombuffer(jpg, dtype=np.uint8), cv2.IMREAD_COLOR)
                        if frame is not None and frame.shape[0] > 0:
                            latest_frame = frame
                            camera_online = True
            else:
                time.sleep(1)
        except Exception as e:
            camera_online = False
            print(f"[SYSTEM ⚠️] ESP32 Stream reconnecting ({e}). Ensure no browser tab is directly open to {target}.", flush=True)
            time.sleep(1)

threading.Thread(target=cam_thread, daemon=True).start()

print("[SYSTEM] Importing YOLO Models (Human & Weapon Detection)...", flush=True)
import warnings
warnings.filterwarnings("ignore")
try:
    model = YOLO("yolov8n.pt")
    print("[SYSTEM] Standard YOLO Human Detection Model loaded successfully!", flush=True)
except Exception as e:
    print(f"[SYSTEM] Standard YOLO failed to load: {e}", flush=True)

weapon_model = None
if os.path.exists("yolov8_weapon.pt"):
    try:
        weapon_model = YOLO("yolov8_weapon.pt")
        print("[SYSTEM] ✅ Fine-Tuned SPECTR Weapon Detection Model (yolov8_weapon.pt) loaded!", flush=True)
    except Exception as e:
        print(f"[SYSTEM] Could not load yolov8_weapon.pt: {e}", flush=True)

# Continuous AI Detection Thread
display_frame = None
detection_state = {
    "humanDetected": False,
    "confidence": 0.0,
    "boxCount": 0,
    "weaponDetected": False,
    "weaponConfidence": 0.0,
    "cameraStatus": "NOT CONNECTED"
}

def detection_thread():
    global display_frame, detection_state
    while True:
        if camera_online and latest_frame is not None:
            try:
                frame_copy = latest_frame.copy()

                # 1. Run Human Detection (COCO class 0: person)
                results = model.predict(frame_copy, imgsz=416, conf=0.35, iou=0.45, classes=[0], verbose=False)
                boxes = results[0].boxes
                
                human_found = len(boxes) > 0
                max_conf = float(max(b.conf[0] for b in boxes)) if human_found else 0.0

                # Draw Cyan bounding boxes for Humans
                if human_found:
                    for box in boxes:
                        x1, y1, x2, y2 = map(int, box.xyxy[0])
                        conf = float(box.conf[0]) * 100
                        cv2.rectangle(frame_copy, (x1, y1), (x2, y2), (255, 240, 0), 2)
                        label = f"HUMAN LOCK {conf:.1f}%"
                        (w, h), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
                        cv2.rectangle(frame_copy, (x1, y1 - 20), (x1 + w + 6, y1), (255, 240, 0), -1)
                        cv2.putText(frame_copy, label, (x1 + 3, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)

                weapon_found = False
                weapon_conf = 0.0

                # 2. Run Knife / Blade Detection using standard COCO model (class 43: knife, class 76: scissors)
                try:
                    knife_results = model.predict(frame_copy, imgsz=416, conf=0.25, iou=0.45, classes=[43, 76], verbose=False)
                    k_boxes = knife_results[0].boxes
                    if len(k_boxes) > 0:
                        weapon_found = True
                        weapon_conf = float(max(b.conf[0] for b in k_boxes)) * 100
                        for k_box in k_boxes:
                            kx1, ky1, kx2, ky2 = map(int, k_box.xyxy[0])
                            kconf = float(k_box.conf[0]) * 100
                            cls_id = int(k_box.cls[0])
                            k_name = "SCISSORS" if cls_id == 76 else "KNIFE"
                            cv2.rectangle(frame_copy, (kx1, ky1), (kx2, ky2), (0, 0, 255), 3) # Bright Red
                            klabel = f"⚠️ {k_name} {kconf:.1f}%"
                            (kw, kh), _ = cv2.getTextSize(klabel, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)
                            cv2.rectangle(frame_copy, (kx1, ky1 - 22), (kx1 + kw + 6, ky1), (0, 0, 255), -1)
                            cv2.putText(frame_copy, klabel, (kx1 + 3, ky1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)
                except Exception:
                    pass

                # 3. Run Gun / Firearm Detection using fine-tuned model (conf >= 0.25 for responsive detection)
                if weapon_model is not None:
                    try:
                        w_results = weapon_model.predict(frame_copy, imgsz=416, conf=0.25, iou=0.45, verbose=False)
                        w_boxes = w_results[0].boxes
                        if len(w_boxes) > 0:
                            g_conf = float(max(b.conf[0] for b in w_boxes)) * 100
                            weapon_found = True
                            weapon_conf = max(weapon_conf, g_conf)
                            
                            for w_box in w_boxes:
                                wx1, wy1, wx2, wy2 = map(int, w_box.xyxy[0])
                                wconf = float(w_box.conf[0]) * 100
                                cls_id = int(w_box.cls[0])
                                cls_name = weapon_model.names.get(cls_id, "WEAPON").upper()
                                
                                cv2.rectangle(frame_copy, (wx1, wy1), (wx2, wy2), (0, 0, 255), 3) # Bright Red
                                wlabel = f"⚠️ {cls_name} {wconf:.1f}%"
                                (ww, wh), _ = cv2.getTextSize(wlabel, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)
                                cv2.rectangle(frame_copy, (wx1, wy1 - 22), (wx1 + ww + 6, wy1), (0, 0, 255), -1)
                                cv2.putText(frame_copy, wlabel, (wx1 + 3, wy1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)
                    except Exception:
                        pass

                display_frame = frame_copy

                detection_state = {
                    "humanDetected": human_found,
                    "confidence": round(max_conf * 100, 1),
                    "boxCount": len(boxes),
                    "weaponDetected": weapon_found,
                    "weaponConfidence": round(weapon_conf, 1),
                    "cameraStatus": "CONNECTED"
                }
            except Exception as e:
                detection_state["cameraStatus"] = "ERROR"
        else:
            detection_state = {
                "humanDetected": False,
                "confidence": 0.0,
                "boxCount": 0,
                "weaponDetected": False,
                "weaponConfidence": 0.0,
                "cameraStatus": "CONNECTED"
            }
            display_frame = None
        time.sleep(0.2) # ~5 FPS detection rate

threading.Thread(target=detection_thread, daemon=True).start()

# ---- FLASK VIDEO STREAMING SERVER ----
app_flask = Flask(__name__)
CORS(app_flask)

def generate_standby_frame(frame_count):
    img = np.zeros((360, 640, 3), dtype=np.uint8)
    img[:] = (18, 26, 36) # Tactical dark slate

    # Grid background lines
    for x in range(0, 640, 40):
        cv2.line(img, (x, 0), (x, 360), (32, 45, 60), 1)
    for y in range(0, 360, 40):
        cv2.line(img, (0, y), (640, y), (32, 45, 60), 1)

    # Animated radar sweep line
    angle = (frame_count * 6) % 360
    rad = np.radians(angle)
    center = (320, 180)
    sweep_x = int(center[0] + 110 * np.cos(rad))
    sweep_y = int(center[1] + 110 * np.sin(rad))

    # Tactical HUD Crosshair
    cv2.circle(img, center, 110, (0, 180, 240), 1)
    cv2.circle(img, center, 65, (0, 210, 255), 1)
    cv2.circle(img, center, 15, (0, 210, 255), 1)
    cv2.line(img, (center[0] - 130, center[1]), (center[0] + 130, center[1]), (0, 180, 240), 1)
    cv2.line(img, (center[0], center[1] - 130), (center[0], center[1] + 130), (0, 180, 240), 1)
    cv2.line(img, center, (sweep_x, sweep_y), (0, 240, 255), 2)

    # HUD Text Overlay
    cv2.putText(img, "SPECTR AI OPTICAL STREAM // CAM-01", (20, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 240, 255), 2)
    cv2.putText(img, "TACTICAL STANDBY STREAM // AIRSPACE MONITORING", (20, 335), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 220, 200), 1)

    ts = time.strftime("%H:%M:%S")
    cv2.putText(img, f"UTC {ts}", (520, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 240, 255), 1)

    return img

def gen_frames():
    global display_frame
    frame_counter = 0
    while True:
        frame_counter += 1
        if display_frame is not None:
            frame_to_send = display_frame
        else:
            frame_to_send = generate_standby_frame(frame_counter)

        ret, buffer = cv2.imencode('.jpg', frame_to_send)
        if ret:
            frame_bytes = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        time.sleep(0.06)

@app_flask.route('/video_feed')
def video_feed():
    return Response(gen_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app_flask.route('/detection_status')
def detection_status():
    from flask import jsonify
    return jsonify(detection_state)

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
        start_lat = data.get("start", {}).get("lat", 26.91240)
        start_lng = data.get("start", {}).get("lng", 75.78730)
        goal_lat = data.get("goal", {}).get("lat", 26.91310)
        goal_lng = data.get("goal", {}).get("lng", 75.78820)
        
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
    if not enc:
        return None
    
    # 1. Try Direct Raw JSON parsing first (if unencrypted JSON published)
    try:
        raw_str = enc.strip()
        if raw_str.startswith("{") and raw_str.endswith("}"):
            return raw_str
    except Exception:
        pass

    # 2. Try AES CBC Decryption
    try:
        enc_clean = enc.strip()
        if len(enc_clean) % 4:
            enc_clean += '=' * (4 - len(enc_clean) % 4)
        raw = base64.b64decode(enc_clean)
        cipher = AES.new(KEY, AES.MODE_CBC, IV)
        decrypted = cipher.decrypt(raw)
        
        # PKCS7 Unpadding
        pad_len = decrypted[-1]
        if isinstance(pad_len, int) and 1 <= pad_len <= 16:
            decrypted = decrypted[:-pad_len]
        return decrypted.decode('utf-8', errors='ignore')
    except Exception as e:
        # 3. Fallback attempt with manual regex find
        try:
            raw = base64.b64decode(enc)
            cipher = AES.new(KEY, AES.MODE_CBC, IV)
            txt = cipher.decrypt(raw).decode('utf-8', errors='ignore')
            s = txt.find('{')
            e = txt.rfind('}')
            if s != -1 and e != -1:
                return txt[s:e+1]
        except Exception:
            pass
        return None

def on_message(client, userdata, msg):
    payload_str = msg.payload.decode(errors='ignore')
    print(f"[CLOUD INBOUND] Received MQTT message of length {len(payload_str)}")
    
    decoded = decrypt_packet(payload_str)
    if not decoded:
        print(f"[CLOUD INBOUND] ❌ Decryption / Parsing Failed. Raw: {payload_str[:50]}...")
        return

    start = decoded.find('{')
    end = decoded.rfind('}')
    if start == -1 or end == -1:
        return

    clean = decoded[start:end+1].replace("nan", "0")

    try:
        sensor = json.loads(clean)
    except Exception as e:
        print(f"[CLOUD INBOUND] JSON Parse Error: {e}")
        return

    print(f"[SYSTEM ✅] Parsed Telemetry Payload: {sensor}")

    temp = float(sensor.get("temp", sensor.get("temperature", 30)))
    humidity = float(sensor.get("humidity", sensor.get("hum", 50)))
    tilt = float(sensor.get("tilt", sensor.get("pitch", 0)))
    magnetic = int(sensor.get("magnetic", sensor.get("mag", 1)))
    front = float(sensor.get("frontDist", sensor.get("front", sensor.get("distance", 150))))
    side = float(sensor.get("sideDist", sensor.get("side", 150)))
    gps = sensor.get("gps", "26.91240,75.78730")

    intrusion = detection_state["humanDetected"]
    weapon = detection_state.get("weaponDetected", False)
    weapon_conf = detection_state.get("weaponConfidence", 0.0)
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
    if intrusion: threat += 35
    if weapon: threat += 55
    if tilt > 4: threat += 15
    if temp > 30: threat += 10
    if front < 50: threat += 20
    if side < 30: threat += 10
    if magnetic == 0: threat += 5

    if threat > 60 or weapon:
        level = "HIGH"
    elif threat > 25:
        level = "ELEVATED"
    else:
        level = "LOW"

    if front < 30:
        move = "LEFT"
    elif intrusion or weapon:
        move = "LEFT"
    elif tilt > 4:
        move = "RIGHT"
    else:
        move = "FORWARD"

    # --- ROUTE TO NODE.JS WEB DASHBOARD ---
    global last_gps_lat, last_gps_lng, last_gps_time
    lat, lng = 0.0, 0.0
    
    # 1. Flexible GPS Coordinate Extraction (Supports string, dict, list, or direct keys)
    if "latitude" in sensor and "longitude" in sensor:
        try: lat, lng = float(sensor["latitude"]), float(sensor["longitude"])
        except: pass
    elif "lat" in sensor and "lng" in sensor:
        try: lat, lng = float(sensor["lat"]), float(sensor["lng"])
        except: pass
    elif isinstance(gps, str) and "," in gps:
        try:
            parts = gps.split(',')
            lat, lng = float(parts[0].strip()), float(parts[1].strip())
        except: pass
    elif isinstance(gps, (list, tuple)) and len(gps) >= 2:
        try: lat, lng = float(gps[0]), float(gps[1])
        except: pass
    elif isinstance(gps, dict):
        try:
            lat = float(gps.get("lat", gps.get("latitude", 0)))
            lng = float(gps.get("lng", gps.get("longitude", 0)))
        except: pass

    # 2. Dynamic Speed & Bearing Kinematic Calculation from Consecutive Fixes
    calc_speed = float(sensor.get("speed", 0))
    calc_heading = int(sensor.get("heading", 0 if magnetic == 1 else 180))
    now = time.time()

    if lat != 0.0 and lng != 0.0:
        if last_gps_lat != 0.0 and last_gps_lng != 0.0:
            dt = max(now - last_gps_time, 0.1)
            # Haversine distance in meters
            dlat = math.radians(lat - last_gps_lat)
            dlng = math.radians(lng - last_gps_lng)
            a = math.sin(dlat/2)**2 + math.cos(math.radians(last_gps_lat)) * math.cos(math.radians(lat)) * math.sin(dlng/2)**2
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
            dist_m = 6371000 * c
            if calc_speed == 0 and dist_m > 0.1:
                calc_speed = round(dist_m / dt, 1)
            
            # Bearing calculation in degrees (0-360)
            if calc_heading == 0 or calc_heading == 180:
                y = math.sin(dlng) * math.cos(math.radians(lat))
                x = math.cos(math.radians(last_gps_lat)) * math.sin(math.radians(lat)) - math.sin(math.radians(last_gps_lat)) * math.cos(math.radians(lat)) * math.cos(dlng)
                calc_heading = int((math.degrees(math.atan2(y, x)) + 360) % 360)

        last_gps_lat, last_gps_lng, last_gps_time = lat, lng, now

    payload = {
        "threatLevel": level,
        "humanDetected": intrusion,
        "detectionConfidence": detection_conf,
        "detectionCount": box_count,
        "weaponDetected": weapon,
        "weaponConfidence": weapon_conf,
        "cameraStatus": cam_status,
        "temperature": temp,
        "humidity": humidity,
        "pitch": tilt,
        "roll": 0.0,
        "latitude": lat,
        "longitude": lng,
        "threatScore": threat,
        "magneticHeading": calc_heading,
        "magnetic": magnetic,
        "frontDist": front,
        "sideDist": side,
        "obstacle": obstacle,
        "move": move,
        "speed": calc_speed,
        "heading": calc_heading
    }

    try:
        crypto_queue.put(payload)
    except Exception as e:
        pass

    print("\n---- SECURE TELEMETRY SHIPPED TO CRYPTO ENGINE ----")
    print("Camera Status  :", cam_status)
    print("Human Detected :", "YES" if intrusion else "NO")
    print("Weapon Detected:", f"YES ({weapon_conf:.1f}%)" if weapon else "NO")
    print("Temperature    :", temp, "C")
    print("Humidity       :", humidity, "%")
    print("Tilt           :", tilt)
    print("Magnetic       :", "METAL DETECTED" if magnetic == 0 else "NORMAL")
    print("Obstacle       :", obstacle)
    print("GPS            :", f"{lat}, {lng}" if (lat != 0 or lng != 0) else gps)
    print("Threat Score   :", threat)
    print("Threat Level   :", level)
    print("----------------------------------------")

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1)
client.username_pw_set(USERNAME, PASSWORD)
client.tls_set(cert_reqs=ssl.CERT_NONE)

client.on_message = on_message

print("Connecting to HiveMQ Hardware Broker...")
try:
    client.connect(BROKER, PORT)
    client.subscribe(TOPIC)
    print("AI Hardware Bridge Server Ready — RUNNING YOLOv8")
    client.loop_forever()
except Exception as e:
    print(f"[SYSTEM WARNING] MQTT Broker connection error: {e}. Keeping Flask Video Proxy on Port 5001 ACTIVE.", flush=True)
    while True:
        time.sleep(1)
