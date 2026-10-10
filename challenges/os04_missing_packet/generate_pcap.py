from pathlib import Path
from scapy.all import IP, TCP, Raw, wrpcap

OUTPUT = Path(__file__).resolve().parent / "evidence" / "sentinel_traffic.pcap"

packets = []

def add_request(source, destination, sport, path, host, service_account=None):
        payload = (
            f"GET {path} HTTP/1.1\r\n"
            f"Host: {host}\r\n"
            "User-Agent: Sentinel-Monitor/1.0\r\n"
        )
        if service_account:
            payload += f"X-Service-Account: {service_account}\r\n"
        payload += "Connection: close\r\n\r\n"

        packet = (
           IP(src=source, dst=destination)
          / TCP(sport=sport, dport=80, flags="PA", seq=1000)
         / Raw(load=payload.encode())
        )

        packets.append(packet)


# Normal monitoring traffic
add_request(
    "10.10.20.12", "10.10.20.10",
    51001, "/health", "monitoring-console"
)

add_request(
    "10.10.20.18", "10.10.20.10",
    51002, "/status", "monitoring-console"
)

# Suspicious traffic linked to OS-03
add_request(
    "10.10.20.47", "10.10.20.30",
    51003, "/api/backup/jobs?ref=DR-2026-09",
    "backup-console",
    service_account="backupsvc"
)

# Additional normal traffic
add_request(
    "10.10.20.12", "10.10.20.10",
    51004, "/metrics", "monitoring-console"
)

wrpcap(str(OUTPUT), packets)

print("PCAP created:", OUTPUT)
print("Packet count:", len(packets))
