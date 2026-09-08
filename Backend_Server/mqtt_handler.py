# --- DEPRECATION NOTICE ---
# NOTE: This legacy MQTT handler (listening on 'spectr/telemetry') is deprecated.
# Active production hardware bridge is `hardware_bridge.py` (listening on 'drone/DRONE_01').
# --------------------------
import paho.mqtt.client as mqtt
import ssl
import json
import requests
from decryptor import decrypt_packet
from integrity_checker import verify_integrity
from logger import log_event
from kill_switch import trigger_kill_switch

BROKER = "d4152fc4908b486d88b26fefd6dfa7ab.s1.eu.hivemq.cloud"
PORT = 8883
TOPIC = "spectr/telemetry"

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("[MQTT] Connected successfully")
        client.subscribe(TOPIC)
        print(f"[MQTT] Subscribed to topic: {TOPIC}")
    else:
        print("[MQTT] Connection failed with code", rc)

def send_to_api(data):
    url = "http://localhost:5000/api/data"
    try:
        requests.post(url, json=data)
    except Exception as e:
        print(f"[API Error] Could not send to API: {e}")

def on_message(client, userdata, msg):
    try:
        # Decrypt packet first
        decrypted_str = decrypt_packet(msg.payload)
        packet = json.loads(decrypted_str)
        
        # Verify Integrity
        is_valid = verify_integrity(packet)
        if not is_valid:
            print("[MQTT] ALERT: Integrity check failed!")
            # Trigger kill switch? trigger_kill_switch()
            return
            
        print(f"[MQTT] VALID DATA RECV: Heat {packet['data'].get('temperature', 0)}C | Threat {packet['data'].get('threatScore', 0)}")
        
        # Send actual data to Node API
        send_to_api(packet["data"])
    except Exception as e:
        print(f"[MQTT Error] Parsing or sending failed: {e}")
def start_mqtt_listener():
    client = mqtt.Client()

    client.username_pw_set("spectr_user", "Strongpassword123")
    client.tls_set()

    client.on_connect = on_connect
    client.on_message = on_message

    print("[MQTT] Connecting to broker...")

    client.connect(BROKER, PORT, 60)

    # 🔥 IMPORTANT: use loop_start instead of loop_forever for debugging
    client.loop_start()

    while True:
        pass