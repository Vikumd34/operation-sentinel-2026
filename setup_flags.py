from pathlib import Path
import json
import secrets

root = Path(__file__).resolve().parent
flag_dir = root / "organizer" / "flags"
web_dir = root / "platform" / "sentinel-web" / "organiser_only"
web_file = web_dir / "flags.json"

flag_dir.mkdir(parents=True, exist_ok=True)
web_dir.mkdir(parents=True, exist_ok=True)

flags = {}

for n in range(1, 7):
    stage = f"OS-{n:02d}"
    file = flag_dir / f"os{n:02d}_flag.txt"

    if file.exists():
        flag = file.read_text(encoding="utf-8-sig").strip()
    elif n == 1:
        flag = "FLAG{SENTINEL_INC4721_DISCOVERED}"
        file.write_text(flag + "\n", encoding="utf-8")
    elif n == 2:
        flag = "FLAG{SENTINEL_TICKET4721_REVIEWED}"
        file.write_text(flag + "\n", encoding="utf-8")
    else:
        flag = f"FLAG{{SENTINEL_OS{n:02d}_{secrets.token_hex(12).upper()}}}"
        file.write_text(flag + "\n", encoding="utf-8")

    flags[stage] = flag

if web_file.exists():
    raise SystemExit(
        "STOP: Existing web flags.json found. "
        "No files overwritten; check configuration manually."
    )

web_file.write_text(json.dumps(flags, indent=2) + "\n", encoding="utf-8")
print("SUCCESS: Six private stage flags configured.")
print("SUCCESS: Web platform flags.json created.")
print("NOTE: Keep organizer/flags and organiser_only/flags.json private.")
