"""
SPECTR False Attack Simulator
==============================
Sends a staged, escalating attack scenario directly to the Express backend
via HTTP POST to /api/data — no MQTT or hardware needed.

Stages:
  1. NORMAL    — baseline idle telemetry (LOW threat)
  2. ANOMALY   — suspicious activity begins (ELEVATED threat)
  3. INTRUSION — human detected, high threat score, email alert fires
  4. CRITICAL  — threat > 85, second email alert fires
  5. CAPTURE   — extreme tilt + high threat, triggers breach protocol

Run: python false_attack.py [--stage all|normal|anomaly|intrusion|critical|capture]
"""

import requests
import time
import argparse
import random
import hashlib
import secrets

API_URL = "http://localhost:5000/api/data"

# ── Helpers ────────────────────────────────────────────────────────────────

def make_hash(payload, level):
    raw = str(sorted(payload.items()))
    if level == "LOW":
        return hashlib.sha256(raw.encode()).hexdigest(), None, "SAFE"
    else:
        salt = secrets.token_hex(4)
        h = hashlib.sha512((salt + raw).encode()).hexdigest()
        return h, salt, "ALERT" if level == "ELEVATED" else "GHOST"

def send(payload, label):
    level = payload.get("threatLevel", "LOW")
    h, salt, sec = make_hash(payload, level)
    payload["blockchain_hash"] = h
    payload["security_level"] = sec
    if salt:
        payload["salt"] = salt

    try:
        res = requests.post(API_URL, json=payload, timeout=3)
        score = payload.get("threatScore", 0)
        human = "👤 HUMAN" if payload.get("humanDetected") else "      "
        print(f"  [{label:<18}] SCORE={score:>5.1f}  LVL={level:<8}  {human}  → HTTP {res.status_code}")
    except Exception as e:
        print(f"  [{label:<18}] ❌ Failed to reach backend: {e}")
        print("  Make sure `node backend/server.js` is running on port 5000.")

# ── Stages ─────────────────────────────────────────────────────────────────

def stage_normal(count=4):
    print("\n🟢 STAGE 1 — NORMAL OPERATIONS (LOW threat)\n")
    for i in range(count):
        score = round(random.uniform(5, 28), 1)
        payload = {
            "threatLevel": "LOW",
            "humanDetected": False,
            "detectionConfidence": 0.0,
            "detectionCount": 0,
            "cameraStatus": "CONNECTED",
            "temperature": round(random.uniform(24, 29), 1),
            "humidity": random.randint(45, 60),
            "pitch": round(random.uniform(-2, 2), 1),
            "roll": round(random.uniform(-2, 2), 1),
            "latitude": 34.09670 + random.uniform(-0.0002, 0.0002),
            "longitude": -118.19156 + random.uniform(-0.0002, 0.0002),
            "threatScore": score,
            "magneticHeading": random.randint(100, 130),
            "magnetic": 1,
            "frontDist": round(random.uniform(100, 150), 1),
            "sideDist": round(random.uniform(100, 150), 1),
            "obstacle": "CLEAR",
            "move": "FORWARD",
            "speed": round(random.uniform(1, 3), 1),
            "heading": random.randint(45, 65),
        }
        send(payload, f"NORMAL #{i+1}")
        time.sleep(2)

def stage_anomaly(count=4):
    print("\n🟡 STAGE 2 — ANOMALY DETECTED (ELEVATED threat)\n")
    print("  ⚠️  An ELEVATED email alert will fire if >5 min since last one.\n")
    for i in range(count):
        score = round(random.uniform(36, 62), 1)
        payload = {
            "threatLevel": "ELEVATED",
            "humanDetected": False,
            "detectionConfidence": round(random.uniform(20, 45), 1),
            "detectionCount": 0,
            "cameraStatus": "CONNECTED",
            "temperature": round(random.uniform(28, 34), 1),
            "humidity": random.randint(55, 72),
            "pitch": round(random.uniform(-5, 5), 1),
            "roll": round(random.uniform(-5, 5), 1),
            "latitude": 34.09680 + random.uniform(-0.0003, 0.0003),
            "longitude": -118.19140 + random.uniform(-0.0003, 0.0003),
            "threatScore": score,
            "magneticHeading": random.randint(100, 150),
            "magnetic": 1,
            "frontDist": round(random.uniform(50, 90), 1),
            "sideDist": round(random.uniform(60, 100), 1),
            "obstacle": "CLEAR",
            "move": "FORWARD",
            "speed": round(random.uniform(2, 4), 1),
            "heading": random.randint(40, 80),
        }
        send(payload, f"ANOMALY #{i+1}")
        time.sleep(2)

def stage_intrusion(count=4):
    print("\n🟠 STAGE 3 — HUMAN INTRUSION DETECTED (HIGH threat)\n")
    print("  ⚠️  Dashboard will show CRITICAL BREACH ALERT.\n")
    for i in range(count):
        score = round(random.uniform(66, 84), 1)
        payload = {
            "threatLevel": "HIGH",
            "humanDetected": True,
            "detectionConfidence": round(random.uniform(70, 92), 1),
            "detectionCount": random.randint(1, 2),
            "cameraStatus": "CONNECTED",
            "temperature": round(random.uniform(32, 38), 1),
            "humidity": random.randint(60, 78),
            "pitch": round(random.uniform(-8, 8), 1),
            "roll": round(random.uniform(-8, 8), 1),
            "latitude": 34.09700 + random.uniform(-0.0004, 0.0004),
            "longitude": -118.19100 + random.uniform(-0.0004, 0.0004),
            "threatScore": score,
            "magneticHeading": random.randint(90, 160),
            "magnetic": 1,
            "frontDist": round(random.uniform(30, 55), 1),
            "sideDist": round(random.uniform(40, 70), 1),
            "obstacle": "FRONT DETECTED" if random.random() > 0.5 else "CLEAR",
            "move": "LEFT",
            "speed": round(random.uniform(3, 5), 1),
            "heading": random.randint(30, 90),
        }
        send(payload, f"INTRUSION #{i+1}")
        time.sleep(2)

def stage_critical(count=3):
    print("\n🔴 STAGE 4 — CRITICAL THREAT (score > 85)\n")
    print("  📧 HIGH THREAT email alert will fire (rate-limited to 1/min).\n")
    for i in range(count):
        score = round(random.uniform(86, 98), 1)
        payload = {
            "threatLevel": "HIGH",
            "humanDetected": True,
            "detectionConfidence": round(random.uniform(88, 99), 1),
            "detectionCount": random.randint(1, 3),
            "cameraStatus": "CONNECTED",
            "temperature": round(random.uniform(36, 42), 1),
            "humidity": random.randint(65, 85),
            "pitch": round(random.uniform(-12, 12), 1),
            "roll": round(random.uniform(-12, 12), 1),
            "latitude": 34.09710 + random.uniform(-0.0005, 0.0005),
            "longitude": -118.19080 + random.uniform(-0.0005, 0.0005),
            "threatScore": score,
            "magneticHeading": random.randint(80, 180),
            "magnetic": 0,   # metal detected — magnetic interference
            "frontDist": round(random.uniform(15, 35), 1),
            "sideDist": round(random.uniform(20, 40), 1),
            "obstacle": "FRONT DETECTED",
            "move": "LEFT",
            "speed": round(random.uniform(4, 6), 1),
            "heading": random.randint(20, 100),
        }
        send(payload, f"CRITICAL #{i+1}")
        time.sleep(2)

def stage_capture():
    print("\n☠️  STAGE 5 — DRONE CAPTURE SIMULATION\n")
    print("  🚨 Extreme tilt (>60°) + HIGH threat will trigger BREACH PROTOCOL.")
    print("  You have 30 seconds to cancel via: POST /api/breach/cancel\n")

    payload = {
        "threatLevel": "HIGH",
        "humanDetected": True,
        "detectionConfidence": 97.5,
        "detectionCount": 2,
        "cameraStatus": "CONNECTED",
        "temperature": 43.2,
        "humidity": 82,
        "pitch": 72.0,    # ← extreme tilt — breach trigger condition
        "roll": 68.0,     # ← extreme tilt — breach trigger condition
        "latitude": 34.09720,
        "longitude": -118.19070,
        "threatScore": 90.0,
        "magneticHeading": 200,
        "magnetic": 0,
        "frontDist": 8.0,
        "sideDist": 12.0,
        "obstacle": "FRONT DETECTED",
        "move": "LEFT",
        "speed": 0.2,
        "heading": 15,
    }
    send(payload, "CAPTURE TRIGGER")
    print("\n  Breach protocol initiated. Run this to cancel:")
    print("  curl -X POST http://localhost:5000/api/breach/cancel\n")

# ── Main ───────────────────────────────────────────────────────────────────

STAGES = {
    "normal":    stage_normal,
    "anomaly":   stage_anomaly,
    "intrusion": stage_intrusion,
    "critical":  stage_critical,
    "capture":   stage_capture,
}

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SPECTR False Attack Simulator")
    parser.add_argument(
        "--stage",
        default="all",
        choices=["all", "normal", "anomaly", "intrusion", "critical", "capture"],
        help="Which stage to run (default: all)"
    )
    args = parser.parse_args()

    print("=" * 55)
    print("  SPECTR FALSE ATTACK SIMULATOR")
    print("  Target: " + API_URL)
    print("=" * 55)

    if args.stage == "all":
        stage_normal()
        stage_anomaly()
        stage_intrusion()
        stage_critical()

        ans = input("\n⚠️  Run CAPTURE stage? This triggers breach protocol (y/N): ")
        if ans.strip().lower() == "y":
            stage_capture()
        else:
            print("  Capture stage skipped.")
    else:
        if args.stage == "capture":
            ans = input("⚠️  This triggers breach protocol. Confirm (y/N): ")
            if ans.strip().lower() != "y":
                print("Aborted.")
                exit(0)
        STAGES[args.stage]()

    print("\n✅ Simulation complete.\n")
