# --- DEPRECATION NOTICE ---
# NOTE: This legacy configuration file is deprecated.
# Active configuration for `hardware_bridge.py` reads directly from environment variables / .env.
# --------------------------
BROKER = "your-hivemq-url"
PORT = 8883
TOPIC = "spectr/telemetry"

AES_KEY = b'12345678901234567890123456789012'
AES_IV = b'1234567890123456'