"""Start an offloading node on this machine.

Run from the backend/ folder:
    .venv\\Scripts\\python.exe -m node.run            (edge, port 8100)
    set NODE_TIER=CLOUD & .venv\\Scripts\\python.exe -m node.run

Prints the LAN address to put in the main backend's .env as EDGE_NODE_URL.
"""

import os
import socket

import uvicorn


def lan_addresses():
    """(main address, other addresses) other machines may reach this one at.

    The main one is the interface used for outgoing traffic (normally the Wi-Fi/LAN adapter);
    others are often virtual adapters (WSL, Hyper-V, VPN) that other devices can't reach.
    """
    main = None
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))  # no packet is sent; just picks the outgoing interface
        main = s.getsockname()[0]
        s.close()
    except OSError:
        pass
    others = set()
    try:
        for ip in socket.gethostbyname_ex(socket.gethostname())[2]:
            if not ip.startswith("127.") and ip != main:
                others.add(ip)
    except OSError:
        pass
    return main, sorted(others)


def main():
    host = os.getenv("NODE_HOST", "0.0.0.0")
    port = int(os.getenv("NODE_PORT", os.getenv("PORT", "8100")))
    tier = os.getenv("NODE_TIER", "EDGE").upper()
    main_ip, other_ips = lan_addresses()
    print(f"Offloading node ({tier}) listening on {host}:{port}")
    if main_ip:
        print(f"  Set {tier}_NODE_URL=http://{main_ip}:{port} in the main backend's .env")
    for ip in other_ips:
        print(f"  Also at http://{ip}:{port} (probably a virtual adapter)")
    uvicorn.run("node.server:app", host=host, port=port, log_level="info")


if __name__ == "__main__":
    main()
