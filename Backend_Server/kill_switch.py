import subprocess
import os
from logger import log_event

_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_ALERT_TRIGGER = os.path.join(_THIS_DIR, '..', 'Cloud_Functions', 'alert_trigger.js')

def trigger_kill_switch():
    print("[ALERT] KILL SWITCH ACTIVATED")
    log_event("KILL_SWITCH", "System halted due to integrity failure")

    # Call Node alert system
    subprocess.run(["node", _ALERT_TRIGGER])