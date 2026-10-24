"""Start an offloading node on this machine.

Run from the backend/ folder:
    .venv\\Scripts\\python.exe -m node.run            (edge, port 8100)
    set NODE_TIER=CLOUD & .venv\\Scripts\\python.exe -m node.run

Prints the address to put in the main backend's .env as EDGE_NODE_URL: the Radmin VPN or Tailscale
address when one of them is running (reachable over the internet from any network), else the LAN
address (same Wi-Fi only). See docs/DEPLOYMENT.md.
"""

import ipaddress
import os
import socket
import sys

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


# Virtual networks that connect the laptops over the internet: Radmin VPN gives each computer a
# 26.x.x.x address, Tailscale a 100.64.0.0/10 one.
VPN_NETS = {
    "Radmin VPN": ipaddress.ip_network("26.0.0.0/8"),
    "Tailscale": ipaddress.ip_network("100.64.0.0/10"),
}


def vpn_name(ip: str):
    """'Radmin VPN' / 'Tailscale' when ip is on that virtual network, else None."""
    try:
        addr = ipaddress.ip_address(ip)
    except ValueError:
        return None
    return next((name for name, net in VPN_NETS.items() if addr in net), None)


def main():
    host = os.getenv("NODE_HOST", "0.0.0.0")
    port = int(os.getenv("NODE_PORT", os.getenv("PORT", "8100")))
    tier = os.getenv("NODE_TIER", "EDGE").upper()
    main_ip, other_ips = lan_addresses()
    addresses = [ip for ip in [main_ip, *other_ips] if ip]
    vpn = [(ip, vpn_name(ip)) for ip in addresses if vpn_name(ip)]
    lan = [ip for ip in addresses if not vpn_name(ip)]
    print(f"Offloading node ({tier}) listening on {host}:{port}")
    if vpn:
        for ip, name in vpn:
            print(f"  Over the internet ({name}): put this in the main backend's .env")
            print(f"    {tier}_NODE_URL=http://{ip}:{port}")
    else:
        print("  No Radmin VPN or Tailscale address found, so only devices on this same network can reach this node.")
    if lan:
        print(f"  Same network only: {tier}_NODE_URL=http://{lan[0]}:{port}")
        for ip in lan[1:]:
            print(f"    (also http://{ip}:{port}, probably a virtual adapter)")
    if not os.getenv("NODE_TOKEN"):
        print("  No NODE_TOKEN set: anyone who can reach this address can use the node.")
    sys.stdout.flush()  # show the address right away, even when output goes to a log file
    uvicorn.run("node.server:app", host=host, port=port, log_level="info")


if __name__ == "__main__":
    main()
