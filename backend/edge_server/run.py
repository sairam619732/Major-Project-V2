"""CLI Runner for Real Edge Execution Server.

Phase 14A: Real Edge Server Connection.
Runs on the Edge PC/Laptop on local LAN/Wi-Fi (0.0.0.0:8001 by default).
Detects and prints local network IPs for convenient configuration on the Main PC.
"""

import os
import sys
import socket
from pathlib import Path

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import uvicorn
from edge_server.server import app


def get_local_ip_addresses():
    """Identifies candidate IPv4 LAN addresses on the current machine."""
    ips = set()
    try:
        # Standard UDP socket connect trick to find primary routing IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.1)
        s.connect(("8.8.8.8", 80))
        primary_ip = s.getsockname()[0]
        s.close()
        ips.add(primary_ip)
    except Exception:
        pass

    try:
        hostname = socket.gethostname()
        for ip in socket.gethostbyname_ex(hostname)[2]:
            if not ip.startswith("127."):
                ips.add(ip)
    except Exception:
        pass

    return sorted(list(ips))


def main():
    host = os.getenv("EDGE_SERVER_HOST", "0.0.0.0")
    port = int(os.getenv("EDGE_SERVER_PORT", "8001"))
    lan_ips = get_local_ip_addresses()

    print("=" * 65)
    print("   AI CLOUD-EDGE OFFLOADING — REAL EDGE EXECUTION SERVER")
    print("   Phase 14A: Hardware Edge Server for Physical LAN/Wi-Fi")
    print("=" * 65)
    print(f"Binding Address : {host}:{port}")
    print(f"Local Loopback  : http://127.0.0.1:{port}")
    if lan_ips:
        print("Detected LAN IP(s) on this Edge Machine:")
        for ip in lan_ips:
            print(f"  -> http://{ip}:{port}")
        print("\nCONFIGURATION FOR MAIN PC:")
        print(f"  Set environment variable before starting main backend:")
        print(f"  $env:EDGE_SERVER_URL = \"http://{lan_ips[0]}:{port}\"   (PowerShell)")
        print(f"  export EDGE_SERVER_URL=\"http://{lan_ips[0]}:{port}\"     (Bash/Linux/Mac)")
    else:
        print("\nCould not automatically resolve LAN IP. Run 'ipconfig' (Windows)")
        print("or 'ifconfig' / 'ip a' (Linux/Mac) to find this Edge PC's IPv4 address.")
    print("=" * 65)
    print("Starting server... Press Ctrl+C to terminate.\n")

    uvicorn.run(
        app,
        host=host,
        port=port,
        log_level="info",
    )


if __name__ == "__main__":
    main()
