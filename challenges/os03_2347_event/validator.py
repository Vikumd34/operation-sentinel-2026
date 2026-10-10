import csv
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
LOG_FILE = BASE_DIR / "evidence" / "security_events.csv"
FLAG_FILE = BASE_DIR.parents[1] / "organizer" / "flags" / "os03_flag.txt"

print("OPERATION SENTINEL 2026 - OS-03")
print("Investigate the 23:47 security event.")
print()

event_id = input("Event ID: ").strip()
source_ip = input("Source IP: ").strip()
destination = input("Destination: ").strip()

with LOG_FILE.open("r", encoding="utf-8-sig", newline="") as file:
    events = list(csv.DictReader(file))

matching_events = [
    event for event in events
    if event["timestamp"].startswith("2026-09-26 23:47")
    and event["account"] == "ops_readonly"
    and event["event_id"] == event_id
    and event["source_ip"] == source_ip
    and event["destination"] == destination
]

if matching_events:
    print("\nInvestigation successful!")
    print(FLAG_FILE.read_text(encoding="utf-8-sig").strip())
else:
    print("\nIncorrect investigation details. Review the logs.")
