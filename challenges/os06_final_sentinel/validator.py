import csv
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
EVIDENCE_FILE = BASE_DIR / "evidence" / "final_incident_log.csv"
FLAG_FILE = BASE_DIR.parents[1] / "organizer" / "flags" / "os06_flag.txt"

print("OPERATION SENTINEL 2026 - OS-06")
print("Complete the final incident investigation.")
print()

node_id = input("Compromised Node ID: ").strip()
incident_id = input("Incident ID: ").strip()
backup_reference = input("Backup Reference: ").strip()

matched = False

with EVIDENCE_FILE.open(newline="", encoding="utf-8-sig") as file:
    for row in csv.DictReader(file):
        if (
            row["node_id"] == node_id
            and row["incident_id"] == incident_id
            and row["backup_reference"] == backup_reference
            and row["event_type"] == "UNAUTHORIZED_BACKUP_ACCESS"
            and row["status"] == "COMPROMISED"
            and row["service_account"] == "backupsvc"
            and node_id == "NODE-03"
            and incident_id == "INC-4721"
            and backup_reference == "DR-2026-09"
        ):
            matched = True
            break

if matched:
    print("\nFinal investigation successful!")
    print(FLAG_FILE.read_text(encoding="utf-8-sig").strip())
else:
    print("\nIncorrect investigation details. Review the final incident log.")
