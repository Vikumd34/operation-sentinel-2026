
from pathlib import Path
from scapy.all import rdpcap, IP, Raw

BASE_DIR = Path(__file__).resolve().parent
PCAP_FILE = BASE_DIR / "evidence" / "sentinel_traffic.pcap"
FLAG_FILE = BASE_DIR.parents[1] / "organizer" / "flags" / "os04_flag.txt"

print("OPERATION SENTINEL 2026 - OS-04")
print("Investigate the missing packet.")
print()

source_ip = input("Suspicious Source IP: ").strip()
service_account = input("Service Account: ").strip()
backup_reference = input("Backup Reference: ").strip()

packets = rdpcap(str(PCAP_FILE))

matched = False

for packet in packets:
    if not packet.haslayer(IP) or not packet.haslayer(Raw):
        continue

    payload = bytes(packet[Raw].load).decode("utf-8", errors="replace")

    if (
        packet[IP].src == source_ip
        and f"X-Service-Account: {service_account}\r\n" in payload
        and f"ref={backup_reference}" in payload
        and "Host: backup-console\r\n" in payload
        and source_ip == "10.10.20.47"
        and service_account == "backupsvc"
        and backup_reference == "DR-2026-09"
    ):
        matched = True
        break

if matched:
    print("\nInvestigation successful!")
    print(FLAG_FILE.read_text(encoding="utf-8-sig").strip())
else:
    print("\nIncorrect packet details. Review the PCAP.")
