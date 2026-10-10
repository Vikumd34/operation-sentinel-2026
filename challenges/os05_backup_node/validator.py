import csv
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
EVIDENCE_FILE = BASE_DIR / "evidence" / "backup_jobs.csv"
FLAG_FILE = BASE_DIR.parents[1] / "organizer" / "flags" / "os05_flag.txt"

print("OPERATION SENTINEL 2026 - OS-05")
print("Identify the suspicious backup node.")
print()

service_account = input("Service Account: ").strip()
backup_reference = input("Backup Reference: ").strip()
node_id = input("Backup Node ID: ").strip()

matched = False

with EVIDENCE_FILE.open(newline="", encoding="utf-8-sig") as file:
    for row in csv.DictReader(file):
        if (
            row["service_account"] == service_account
            and row["backup_reference"] == backup_reference
            and row["node_id"] == node_id
            and row["status"] == "REVIEW_REQUIRED"
            and service_account == "backupsvc"
            and backup_reference == "DR-2026-09"
            and node_id == "NODE-03"
        ):
            matched = True
            break

if matched:
    print("\nInvestigation successful!")
    print(FLAG_FILE.read_text(encoding="utf-8-sig").strip())
else:
    print("\nIncorrect backup details. Review the backup log.")
