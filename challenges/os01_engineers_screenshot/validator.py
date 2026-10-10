from pathlib import Path

FLAG_FILE = (
    Path(__file__).resolve().parents[2]
    / "organizer"
    / "flags"
    / "os01_flag.txt"
)

print("OPERATION SENTINEL 2026 — OS-01")
print("The Engineer's Screenshot")
print("Investigate the screenshot metadata to identify the incident.\n")

incident = input("Incident reference: ").strip().upper()

if incident == "INC-4721":
    print("\nInvestigation successful!")
    print(FLAG_FILE.read_text(encoding="utf-8-sig").strip())
else:
    print("\nIncorrect incident reference. Review the screenshot metadata.")