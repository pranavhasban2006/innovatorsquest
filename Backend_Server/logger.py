# Backend_Server/logger.py

import os
from datetime import datetime

_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_FILE = os.path.join(_THIS_DIR, '..', 'Logs', 'forensics.log')

def log_event(event_type, message):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    log_line = f"[{timestamp}] [{event_type}] {message}\n"

    print(log_line)

    with open(LOG_FILE, "a") as f:
        f.write(log_line)