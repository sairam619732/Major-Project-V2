# Deployment: three machines

How to run EdgeOffload AI across three real machines for the presentation.

| Tier | Machine | Runs | Address |
| --- | --- | --- | --- |
| **LOCAL** | Your laptop (i5 10th gen, 16 GB RAM, 256 GB SSD) | Backend (DQN, real local telemetry) + web app | `http://localhost:3000` |
| **EDGE** | Teammate's laptop, anywhere with internet (joined by Radmin VPN) | Offloading node (PyTorch detector) | `http://26.x.x.x:8100` |
| **CLOUD** | Vercel (free Hobby plan), Mumbai region | Offloading node (same detector on ONNX Runtime) | `https://<project>.vercel.app` |

Your laptop's backend checks both nodes every 3 s (real latency, bandwidth, CPU load, queue), feeds those values to the DQN, and sends each task to the tier the DQN picks. A node that stops answering is shown **OFFLINE** and gets no tasks.

Do the parts in this order: **0 → 3 (Vercel) → 2 (teammate) → 1 (your laptop)**, because your laptop's settings need the other two addresses.

---

## Part 0. Get the code onto every machine (do this on the desktop)

The code is on GitHub. After any new commit on the desktop, push it so both laptops get it (`git pull` on each laptop):

```powershell
cd "C:\Users\saira\.gemini\config\Major Project V2"
git push origin main
```

The repository includes the trained DQN checkpoint and the ONNX detector (`backend/app/ml/checkpoints/`), so nothing has to be trained or exported on the laptops.

---

## Part 3. Cloud node on Vercel (do this on the desktop)

### What runs where, and the limits

Vercel runs Python as serverless functions. PyTorch is too large for them, so the cloud node runs **the same detector exported to ONNX** (`backend/scripts/export_detector_onnx.py`). It gives the same objects and boxes as PyTorch (tested to within 0.001 px). Free Hobby limits that matter:

| Limit | Effect in the project |
| --- | --- |
| 1 vCPU, 2 GB memory | Detection on the cloud node is slower than on a laptop. |
| 4.5 MB per request | The node reports a 4 MB upload limit. Bigger photos or batches are routed to another tier, with a note in the result. |
| No ffmpeg | The node reports that it can't do video; video tasks go to another tier. |
| 1 M requests, 4 h CPU, 360 GB-h memory per month | Fine for rehearsals and the presentation. **Don't leave your laptop's backend running for days**: it checks the node every 3 s, which keeps the cloud instance awake. |

### Status: deployed

The cloud node is live at **https://edgeoffload-cloud.vercel.app** (Vercel project `edgeoffload-cloud`, account `sairam619732`, region Mumbai `bom1`), deployed from the desktop with Vercel CLI 65.2.0. Checked after deploying:
- `/health` answers `{"status":"ok","tier":"CLOUD","node_id":"cloud-vercel","model_ready":true}`.
- `/status` without the key, or with a wrong key, answers `401`.
- A detection task on the traffic sample finds the same 4 objects as PyTorch, in about 160–210 ms of compute.
- The backend shows it **online** at about 47 ms latency from the desktop. The first probe after it has been idle can time out while Vercel starts the instance; it recovers on its own.

The access key is in Vercel as the secret `NODE_TOKEN`, and the same value is in the desktop's `backend\.env` as `CLOUD_NODE_TOKEN`. Copy the two `CLOUD_NODE_*` lines from that file to your laptop's `backend\.env` (Part 1). Don't paste the key into chats or commit it.

### Updating the cloud node after code changes (on the desktop)

```powershell
cd "C:\Users\saira\.gemini\config\Major Project V2\backend"
.\.venv\Scripts\python.exe scripts\build_vercel_node.py
cd dist\vercel-node
npx --yes vercel@65.2.0 deploy --prod --yes
```

The build keeps `dist\vercel-node\.vercel` (the link to the Vercel project), so this always updates the same project. The key stays in Vercel.

### Setting it up from scratch (another account or machine)

1. Create a free Vercel account at <https://vercel.com/signup> (Hobby plan).
2. Build the folder: `.\.venv\Scripts\python.exe scripts\build_vercel_node.py` (from `backend`).
3. In `backend\dist\vercel-node`:
   ```powershell
   npx --yes vercel@65.2.0 login
   npx --yes vercel@65.2.0 project create edgeoffload-cloud
   npx --yes vercel@65.2.0 link --yes --project edgeoffload-cloud
   Remove-Item .env.local -ErrorAction SilentlyContinue
   npx --yes vercel@65.2.0 env add NODE_TOKEN production
   npx --yes vercel@65.2.0 deploy --prod --yes
   ```
   `login` prints a link: open it and click **Allow**. `link` writes a `.env.local` with a temporary Vercel token; delete it so it isn't uploaded. `env add` asks for the key: make one with `.\.venv\Scripts\python.exe -c "import secrets; print(secrets.token_urlsafe(32))"` (from `backend`) and put the same value in `CLOUD_NODE_TOKEN` on your laptop.
4. Check `https://<project>.vercel.app/health` in a browser. If a Vercel login page appears instead, turn off **Settings → Deployment Protection → Vercel Authentication** for the project.

What the deploy folder needs (already set in `backend/deploy/vercel/`): `vercel.json` with `"framework": "fastapi"` and the region, and `pyproject.toml` with the dependencies and `entrypoint = "index:app"`. Without the framework setting, Vercel builds nothing (404). Vercel installs dependencies from `pyproject.toml`, not from a `requirements.txt` next to it.

---

## Part 2. Edge node on the teammate's laptop

### Install (once)

1. Install **Git** (<https://git-scm.com>) and **Python 3.12** from <https://www.python.org/downloads/> (on the first installer screen tick **Add python.exe to PATH**).
2. Optional, only for video tasks on the edge: `winget install Gyan.FFmpeg` in PowerShell, then reopen PowerShell.
3. Download the project and install the backend (about 2 GB, mostly PyTorch):
   ```powershell
   git clone https://github.com/sairam619732/Major-Project-V2.git
   cd Major-Project-V2\backend
   python -m venv .venv
   .\.venv\Scripts\python.exe -m pip install --upgrade pip
   .\.venv\Scripts\python.exe -m pip install -r requirements.txt
   ```
   (The first detection downloads the 14 MB detector weights once; it needs internet.)

### Network: connect the two laptops over the internet

The laptops don't need to be on the same Wi-Fi. They can be in different places (the teammate at home, you at college), each on its own internet connection. A free **virtual network** connects them; your laptop then reaches the edge node at a fixed address, and the backend measures the real internet latency and bandwidth to it.

**Option A: Radmin VPN (recommended: free, no account, Windows)**

Do this on **both** laptops:
1. Download Radmin VPN from <https://www.radmin-vpn.com> and install it.
2. **Teammate's laptop:** **Network → Create network**. Choose a network name and a password, and send both to the presenter.
3. **Your laptop:** **Network → Join network** with that name and password.
4. Both laptops now appear in the Radmin VPN window, each with an address starting with **26.** (for example `26.18.104.7`). The teammate's address is the one you need.

**Option B: Tailscale** (free, works on Windows, Mac and Linux, needs a Tailscale login)

Install Tailscale from <https://tailscale.com/download> on both laptops and **sign in to the same Tailscale account** on both (or invite the teammate to your tailnet). Each laptop gets an address starting with **100.**

**Option C: Cloudflare quick tunnel** (no install on your laptop; backup if neither VPN works)

On the teammate's laptop, after starting the node (below), run in a second PowerShell window:
```powershell
winget install Cloudflare.cloudflared
cloudflared tunnel --url http://localhost:8100
```
It prints an address like `https://random-words.trycloudflare.com`; that is the `EDGE_NODE_URL` (no `:8100`). The address **changes every time** the tunnel restarts, and the node is then reachable by anyone who has the address, so **use a key** (see "Access key" below). Traffic goes through Cloudflare's servers, so expect higher latency and lower bandwidth than a VPN (in testing: about 60 ms and 3.6 Mbps once warmed up, and slower for the first ~10 s).

**Firewall (Options A and B).** Allow the node, but only for the virtual network. On the teammate's laptop, in PowerShell **run as administrator**:
```powershell
New-NetFirewallRule -DisplayName "EdgeOffload edge node (VPN)" -Direction Inbound -Protocol TCP -LocalPort 8100 -Action Allow -Profile Any -RemoteAddress 26.0.0.0/8,100.64.0.0/10
```
Option C needs no firewall rule (the tunnel connects outwards).

**Mobile data.** If either laptop is on a phone hotspot, make the backend's bandwidth test lighter (it otherwise sends about 240 MB an hour). In your laptop's `backend\.env`:
```
BANDWIDTH_PROBE_MB=0.5
BANDWIDTH_PROBE_INTERVAL_S=120
```

### Start the edge node (every time)

```powershell
cd Major-Project-V2\backend
$env:NODE_TOKEN="the-edge-key"
.\.venv\Scripts\python.exe -m node.run
```

It prints the address to use, for example:
```
  Over the internet (Radmin VPN): put this in the main backend's .env
    EDGE_NODE_URL=http://26.18.104.7:8100
```
Send that line to the presenter (for Option C, send the `trycloudflare.com` address instead). If it says *No Radmin VPN or Tailscale address found*, the VPN isn't connected: open Radmin VPN or Tailscale and check that it's on.

Keep this window open, the laptop **plugged in**, and sleep turned off (**Settings → System → Power → Screen and sleep → Never** while presenting). The Radmin VPN and Tailscale addresses stay the same across networks and restarts, so you only set them once.

**Access key.** Use the same key in `$env:NODE_TOKEN` here and in `EDGE_NODE_TOKEN` on your laptop. It's optional for Radmin VPN and Tailscale (only members of your virtual network can reach the node) and **required** for a Cloudflare tunnel. Make one with:
```powershell
.\.venv\Scripts\python.exe -c "import secrets; print(secrets.token_urlsafe(24))"
```

---

## Part 1. Your laptop (local tier: backend + web app)

### Install (once)

1. Install **Git**, **Python 3.12** (tick **Add python.exe to PATH**), and **Node.js 22 LTS** (<https://nodejs.org>).
2. Install ffmpeg (needed for video tasks that run locally):
   ```powershell
   winget install Gyan.FFmpeg
   ```
   Close and reopen PowerShell afterwards.
3. Download and install (about 3 GB in total; your 256 GB SSD has plenty of room):
   ```powershell
   git clone https://github.com/sairam619732/Major-Project-V2.git
   cd Major-Project-V2
   npm ci
   cd backend
   python -m venv .venv
   .\.venv\Scripts\python.exe -m pip install --upgrade pip
   .\.venv\Scripts\python.exe -m pip install -r requirements.txt
   cd ..
   ```

### Configure the node addresses

Copy the example settings file and edit it:
```powershell
copy backend\.env.example backend\.env
notepad backend\.env
```
Fill in these four lines (the rest can stay as they are):
```
# The address printed on the teammate's laptop (Radmin VPN: 26.x.x.x)
EDGE_NODE_URL=http://26.18.104.7:8100
# The edge key from Part 2 (empty if the edge has none)
EDGE_NODE_TOKEN=the-edge-key
# Your Vercel address and the key from Part 3, step 3
CLOUD_NODE_URL=https://edgeoffload-cloud.vercel.app
CLOUD_NODE_TOKEN=paste-the-key-here
```

Before presenting, check that your laptop can reach the edge: with Radmin VPN connected, open `http://26.x.x.x:8100/health` (the teammate's address) in your browser. If it doesn't load, see Troubleshooting.

### Start (every time)

```powershell
cd Major-Project-V2
npm run present
```

This builds the web app (about a minute on an i5), starts the backend and the web app, and after a few seconds prints each node's status, for example:
```
 Nodes (from backend/.env):
   EDGE  online   http://26.18.104.7:8100  38.5 ms, 0.04 Gbps
   CLOUD online   https://edgeoffload-cloud.vercel.app  41.2 ms, 0.05 Gbps
```
Open <http://localhost:3000/devices>: all three tiers should show **LIVE**. Then go to `/simulation` and run tasks. Press **Ctrl+C** in the window to stop everything.

If port 3000 is taken: `npm run present -- --port=3001`.

### Tips for your laptop (i5 10th gen, Intel graphics)

- **Plug in the charger** and set **Settings → System → Power → Power mode → Best performance**. The battery level is a real DQN input, and on battery the CPU slows down.
- Close other heavy apps and browser tabs; the 3D pages use the integrated graphics.
- `npm run present` uses the production build, which is much lighter than `npm run dev`.

---

## Presentation-day checklist

1. Both laptops online, with Radmin VPN open and **both shown in the same network**.
2. Teammate: start the edge node. The printed Radmin address should match `EDGE_NODE_URL` in your `backend\.env`.
3. You: open `http://26.x.x.x:8100/health` once to check the edge answers.
4. Open `https://edgeoffload-cloud.vercel.app/health` once to wake the cloud node.
5. You: `npm run present`. All three nodes **online** in the printout, all **LIVE** on `/devices`.
6. Run one test task on `/simulation` before the audience arrives.

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| EDGE shows OFFLINE, `ConnectError` or timeout | Is Radmin VPN open on **both** laptops, in the same network, with the teammate shown online? Is the edge node window still running? Was the firewall rule added (Part 2)? Test `http://26.x.x.x:8100/health` from your laptop. |
| Radmin VPN shows the teammate as connected through a relay, or latency is high | It still works, just slower: the two networks blocked a direct link, so traffic goes through Radmin's servers. Try another network (e.g. a phone hotspot), or Tailscale (Option B). |
| EDGE error `401` | `EDGE_NODE_TOKEN` on your laptop doesn't match `NODE_TOKEN` on the teammate's laptop. |
| Cloudflare tunnel stopped working | The `trycloudflare.com` address changes every restart: copy the new one into `EDGE_NODE_URL` and restart `npm run present`. |
| CLOUD shows OFFLINE right after starting | The Vercel instance is starting up; it turns online within ~30 s. Opening https://edgeoffload-cloud.vercel.app/health in a browser first helps. |
| CLOUD error `401` | `CLOUD_NODE_TOKEN` on your laptop doesn't match `NODE_TOKEN` in Vercel. |
| CLOUD error `503` "no NODE_TOKEN set" | Add `NODE_TOKEN` in Vercel (Part 3, step 5) and deploy again. |
| A task says "over the cloud node's 4 MB limit" | Expected: Vercel accepts at most 4.5 MB per request, so that task ran on another tier. |
| A task says "can't process videos (no ffmpeg there)" | Expected for the cloud node; video runs on local or edge. |
| `These ports are already in use` | Another copy is running. Close it, or `npm run demo:stop`, or use `--port=3001`. |
| The app says "Backend offline" | The backend window shows the error. Check that `backend\.venv` exists and the install step finished. |

---

## Notes for the viva

- **Real values:** local CPU, memory and battery (psutil on your laptop); each node's own CPU load, memory and task queue; latency and bandwidth measured by the backend over the real internet path every 3 s / 30 s. The edge is reached through Radmin VPN, a virtual network over the internet, so its latency includes that path.
- **Same detector everywhere:** SSDLite320 MobileNetV3 with COCO weights. The cloud runs it on ONNX Runtime instead of PyTorch (Vercel's size limit), with identical results.
- **Vercel is serverless:** the cloud's CPU load and queue are those of the function instance that answered, and Vercel may run several instances. Treat them as approximate.
- **The DQN currently sends almost every task to LOCAL**, even when the cost model says the edge would be cheaper. That is the trained policy's behaviour, not a deployment problem. The routing to edge and cloud is in place and tested.
- **Offline or unsuitable nodes:** if the DQN picks a tier that is offline, or can't take the task (video without ffmpeg, upload over the size limit), the task runs on the best remaining tier and the result says why.
