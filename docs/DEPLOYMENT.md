# Deployment: three machines

How to run EdgeOffload AI across three real machines for the presentation.

| Tier | Machine | Runs | Address |
| --- | --- | --- | --- |
| **WEB APP** | Vercel (free Hobby plan) | The Next.js site, opened in Chrome on your laptop | `https://edgeoffload-ai.vercel.app` |
| **LOCAL** | Your laptop (i5 10th gen, 16 GB RAM, 256 GB SSD) | Backend (DQN, real local telemetry of this laptop) | `http://localhost:8000` |
| **EDGE** | Teammate's laptop, anywhere with internet (joined by Radmin VPN) | Offloading node (PyTorch detector) | `http://26.x.x.x:8100` |
| **CLOUD** (main) | Your desktop (i7-14700KF, 32 GB, RTX 5070), joined by Radmin VPN | Offloading node, detector on the **GPU** (Part 5) | `http://26.x.x.x:8200` |
| **CLOUD** (backup) | Vercel (free Hobby plan), Mumbai region | Offloading node (same detector on ONNX Runtime, CPU) | `https://edgeoffload-cloud.vercel.app` |

Only one cloud is used at a time: the one in `CLOUD_NODE_URL` on your laptop.

Your laptop's backend checks both nodes every 3 s (real latency, bandwidth, CPU load, queue), feeds those values to the DQN, and sends each task to the tier the DQN picks. A node that stops answering is shown **OFFLINE** and gets no tasks.

The web app's pages come from Vercel, but they run in **your** browser and call the backend on **your** laptop (`localhost:8000`); that is why the local tier's readings are your laptop's. Someone opening the site on another computer sees "Backend offline" unless that computer runs the backend too.

Do the parts in this order: **0 → 5 (desktop cloud) → 4 (web app) → 2 (teammate) → 1 (your laptop)**, because your laptop's settings need the other addresses. Parts 3 (Vercel cloud, backup) and 4 are already done.

---

## Part 0. Get the code onto every machine (do this on the desktop)

The code is on GitHub. After any new commit on the desktop, push it so both laptops get it (`git pull` on each laptop):

```powershell
cd "C:\Users\saira\.gemini\config\Major Project V2"
git push origin main
```

The repository includes the trained DQN checkpoint and the ONNX detector (`backend/app/ml/checkpoints/`), so nothing has to be trained or exported on the laptops.

---

## Remote nodes: how they work, settings and keys

**Local first.** The app needs no node and no key. With both nodes off (the default), the DQN still runs, every task runs on this computer, and results show *DQN chose … · ran on LOCAL*. Edge and cloud are optional workers you switch on.

**Eligibility and fallback.** A tier is used only when its node is switched on, online, measured (latency + bandwidth) and able to run the task (video needs ffmpeg there; upload under its size limit). The DQN's own choice is tried first; if that tier isn't eligible or fails, the next tiers in the DQN's Q-value order are tried, ending at LOCAL at the latest. Every result reports `dqn_decision`, `executed_on`, `accelerator` (GPU only when the GPU really ran it) and `routing_notes` explaining any fallback. If local execution fails too, the request returns an error, never a success.

**Settings page.** Configuration → *Remote compute nodes*: switch on/off, endpoint URL, API key, **Test connection**, and live status (latency, bandwidth, CPU, RAM, queue, GPU, imposed limits). Keys go from the browser only to the backend on the same computer (over the loopback interface; they never leave the machine), are never sent back to the browser, and are saved in **plain text** in `backend\node_settings.json` on that computer (not encrypted; ignored by git). Settings saved there override `backend\.env`. Only the computer running the backend can change them (requests from other devices get 403). Use `https://` node URLs over the internet.

**Worker API** (`backend/node/server.py`; the same program for edge and cloud). Every endpoint needs the key in the `X-API-Key` header (compared in constant time; the older `X-Node-Token` header still works):

| Endpoint | Purpose |
| --- | --- |
| `GET /health` | identity and readiness; the backend times it for latency |
| `GET /status` | real CPU/RAM/queue (psutil), GPU, host limits, **imposed** constraints, network emulation |
| `POST /echo` | bandwidth probe (counts bytes, max 4 MB) |
| `POST /execute` | form `files`, `workload_type`, `task_id`: runs the fixed detection task; never runs code sent by a caller |
| `GET /tasks/{task_id}` | status/result of a received task |

Each execution gets a unique `task_id` from the backend. Sending the same ID again never runs the task twice: a finished task returns its recorded result (`replayed: true`), a running one answers 409. If a request times out after sending, the backend asks `GET /tasks/{id}` (for up to 30 s) instead of re-sending; if the node never received it, the task moves to the next tier; if it is still running there, the result says so and the task runs on the next tier. A full node answers 503 straight away so the backend can use another tier. Results are kept for 15 minutes in the worker's memory (on Vercel, per instance: a lookup can miss if Vercel routes it to another instance).

**Edge-like profile.** `NODE_PROFILE=edge-like` makes a node behave like a constrained edge server: 1 task at a time, at most 3 accepted (running + waiting), detector limited to 2 CPU threads (override with `NODE_MAX_CONCURRENT`, `NODE_MAX_QUEUE`, `DETECTOR_CPU_THREADS`). These are **imposed** limits, reported separately (`constraints`) from the measured values. Such a node is an edge-like remote node, not a physical edge device. Memory limits are not enforced (not supported on Windows without extra tooling).

**Environment variables**

| Where | Variable | Meaning |
| --- | --- | --- |
| backend (`backend\.env`) | `EDGE_NODE_URL`, `CLOUD_NODE_URL` | node base URLs (or set them on the Configuration page) |
| backend | `EDGE_NODE_API_KEY`, `CLOUD_NODE_API_KEY` | each node's key (old names `*_NODE_TOKEN` work too) |
| backend | `FRONTEND_URL` | the hosted web app allowed to call this backend (default `https://edgeoffload-ai.vercel.app`) |
| backend | `BANDWIDTH_PROBE_MB`, `BANDWIDTH_PROBE_INTERVAL_S` | lighter bandwidth test on metered links |
| worker | `NODE_TIER` (`EDGE`/`CLOUD`), `NODE_ID`, `NODE_PORT`, `NODE_HOST` | identity and address |
| worker | `NODE_API_KEY` (old name `NODE_TOKEN`), `NODE_REQUIRE_API_KEY=1` | access key; refuse everything until one is set |
| worker | `NODE_PROFILE=edge-like`, `NODE_MAX_CONCURRENT`, `NODE_MAX_QUEUE`, `DETECTOR_CPU_THREADS` | imposed limits |
| worker | `DETECTOR_DEVICE` (`auto`/`cpu`/`cuda`), `DETECTOR_ENGINE` (`auto`/`torch`/`onnx`) | detector hardware/engine |
| worker | `NODE_MAX_UPLOAD_MB` | host upload limit (4 on Vercel) |
| Vercel cloud worker | `NODE_TOKEN` (secret) | its key; `index.py` sets the rest |
| Vercel web app | none | the site has no secrets; it calls `http://localhost:8000` from the browser |

**Separate keys.** Make one key per worker (run in `backend`):
```powershell
.\.venv\Scripts\python.exe -c "import secrets; print('edge:', secrets.token_urlsafe(32)); print('cloud:', secrets.token_urlsafe(32))"
```
Set the edge one as `NODE_API_KEY` on the edge worker and in the Configuration page (or `EDGE_NODE_API_KEY`); the cloud one likewise. Never commit them or paste them into chats.

**Start a worker** (in `backend`, PowerShell):
```powershell
# Edge-like worker (e.g. the teammate's laptop)
$env:NODE_TIER="EDGE"; $env:NODE_PROFILE="edge-like"; $env:NODE_API_KEY="<edge key>"
.\.venv\Scripts\python.exe -m node.run
# Cloud worker on the desktop (GPU); creates/uses backend\.cloud-node-token as its key
.\.venv-gpu\Scripts\python.exe scripts\start_cloud_node.py
```

**HTTPS address without a VPN: Cloudflare quick tunnel** (temporary, for testing). On the worker's machine, in a second window:
```powershell
winget install Cloudflare.cloudflared
cloudflared tunnel --url http://localhost:8100   # 8200 for the cloud worker
```
It prints `https://<random>.trycloudflare.com`: paste that into the node's URL on the Configuration page and press **Test connection**. The address changes every time the tunnel restarts; update it on the page (no code change needed). Quick tunnels are meant for testing and carry no uptime guarantee.

**Test local-only operation**
1. Configuration → switch both nodes **off** (or leave them unset).
2. Simulation → run a task (e.g. the TRAFFIC sample). The result shows *ran on LOCAL* with real detections and time.
3. Or from PowerShell, with the backend running:
   ```powershell
   curl.exe -F "files=@public\samples\traffic_monitoring.jpg" http://127.0.0.1:8000/api/simulation/execute
   ```

---

## Part 5. Cloud node on your desktop (GPU, recommended)

Your desktop (i7-14700KF, 32 GB RAM, RTX 5070 12 GB) is the most powerful machine, as a real cloud would be. It runs the same node as the edge, with the detector on the GPU, and your laptop reaches it over the internet through **Radmin VPN** (the same virtual network as the edge).

### Install (once, on the desktop)

The desktop already has the project in `C:\Users\saira\.gemini\config\Major Project V2`. The GPU needs the CUDA build of PyTorch, kept in its own environment (`backend\.venv-gpu`, about 5 GB) so the normal one stays as it is:
```powershell
cd "C:\Users\saira\.gemini\config\Major Project V2\backend"
python -m venv .venv-gpu
.\.venv-gpu\Scripts\python.exe -m pip install --upgrade pip
.\.venv-gpu\Scripts\python.exe -m pip install torch==2.14.0 torchvision==0.29.1 --index-url https://download.pytorch.org/whl/cu130
.\.venv-gpu\Scripts\python.exe -m pip install -r requirements.txt
```
(`cu130` = CUDA 13.0. The RTX 5070 needs CUDA 12.8 or newer, and the NVIDIA driver must be recent, e.g. 621.)

Install **Radmin VPN** on the desktop and **join the same network** as the two laptops (Part 2, Option A). Then allow the cloud port for the VPN only (PowerShell **as administrator**):
```powershell
New-NetFirewallRule -DisplayName "EdgeOffload cloud node (VPN)" -Direction Inbound -Protocol TCP -LocalPort 8200 -Action Allow -Profile Any -RemoteAddress 26.0.0.0/8,100.64.0.0/10
```

### Start (every time)

```powershell
cd "C:\Users\saira\.gemini\config\Major Project V2\backend"
.\.venv-gpu\Scripts\python.exe scripts\start_cloud_node.py
```
It prints the detector (it should say **GPU (NVIDIA GeForce RTX 5070)**) and the address, e.g. `CLOUD_NODE_URL=http://26.x.x.x:8200`. The first run creates an access key in `backend\.cloud-node-token`; put the same value in `CLOUD_NODE_TOKEN` on your laptop. Keep the window open and the desktop awake while presenting.

On your laptop's `backend\.env`:
```
CLOUD_NODE_URL=http://26.x.x.x:8200
CLOUD_NODE_TOKEN=<the contents of .cloud-node-token on the desktop>
```
To switch back to the Vercel cloud, put the Vercel address and key (Part 3) there instead.

---

## Part 3. Cloud node on Vercel (backup; done from the desktop)

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
- `/health` with the key answers `{"status":"ok","tier":"CLOUD","node_id":"cloud-vercel","model_ready":true}`; without it, 401 (every endpoint needs the key since the update of 2026-10-25).
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
4. Check it with **Test connection** on the Configuration page. In a browser, `https://<project>.vercel.app/health` shows *Missing or wrong API key*, which means it is running. If a Vercel login page appears instead, turn off **Settings → Deployment Protection → Vercel Authentication** for the project.

What the deploy folder needs (already set in `backend/deploy/vercel/`): `vercel.json` with `"framework": "fastapi"` and the region, and `pyproject.toml` with the dependencies and `entrypoint = "index:app"`. Without the framework setting, Vercel builds nothing (404). Vercel installs dependencies from `pyproject.toml`, not from a `requirements.txt` next to it.

---

## Part 4. Web app on Vercel (done; from the desktop)

**Status: deployed** at **https://edgeoffload-ai.vercel.app** (Vercel project `edgeoffload-ai`, Mumbai). The pages, the 3D scenes and the dataset page (`/api/dataset`) are served by Vercel; everything the DQN uses comes from the backend on the laptop that opens the site.

- The backend allows this site's address (`FRONTEND_URL` in `backend/.env`, default `https://edgeoffload-ai.vercel.app`) and answers Chrome's local-network check, so the site may call `http://localhost:8000`.
- `.vercelignore` keeps the backend, Python environments, tests and every `.env` file out of the upload; `vercel.json` sets Next.js and the Mumbai region.

**Update the site after frontend changes** (on the desktop, from the project folder, which is linked to the Vercel project):
```powershell
cd "C:\Users\saira\.gemini\config\Major Project V2"
npx --yes vercel@65.2.0 deploy --prod --yes
```

**From scratch:** in the project folder run `npx --yes vercel@65.2.0 link --yes --project edgeoffload-ai`, then the deploy command above. `link` also writes a Vercel token into `.env.local`; it is not uploaded (`.vercelignore`), but you can delete that line.

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

Before presenting, check that your laptop can reach the edge: with Radmin VPN connected, press **Test connection** on the Configuration page (or open `http://26.x.x.x:8100/health`: *Missing or wrong API key* means it is reachable). If it fails, see Troubleshooting.

### Start (every time)

The web app is hosted on Vercel at **https://edgeoffload-ai.vercel.app** (Part 4), so your laptop only runs the backend:

```powershell
cd Major-Project-V2
npm run present:backend
```

After a few seconds it prints each node's status, for example:
```
 Nodes (from backend/.env):
   EDGE  online   http://26.18.104.7:8100  38.5 ms, 0.04 Gbps
   CLOUD online   https://edgeoffload-cloud.vercel.app  41.2 ms, 0.05 Gbps
```
Open **https://edgeoffload-ai.vercel.app/devices** in Chrome. The first time, Chrome asks whether the site may **access devices on your local network**: click **Allow** (the site needs it to reach the backend on your laptop). Until you do, Chrome holds every request and the app shows "Backend offline", with an orange **Chrome needs your permission** notice at the bottom. If you missed or closed the prompt: click the icon left of the address bar → **Site settings** → **Local network access** → **Allow**, then reload. Chrome remembers it for this site. All three tiers should show **LIVE**. Then go to `/simulation` and run tasks. Press **Ctrl+C** in the window to stop the backend.

**Backup (no internet for the site, or Chrome blocks it):** `npm run present` builds and runs the web app on your laptop too (about a minute on an i5); open <http://localhost:3000> instead. If port 3000 is taken: `npm run present -- --port=3001`.

### Tips for your laptop (i5 10th gen, Intel graphics)

- **Plug in the charger** and set **Settings → System → Power → Power mode → Best performance**. The battery level is a real DQN input, and on battery the CPU slows down.
- Close other heavy apps and browser tabs; the 3D pages use the integrated graphics.
- `npm run present` uses the production build, which is much lighter than `npm run dev`.

---

## Presentation-day checklist

1. Both laptops online, with Radmin VPN open and **both shown in the same network**.
2. Teammate: start the edge node. The printed Radmin address should match `EDGE_NODE_URL` in your `backend\.env`.
3. You: Configuration page → **Test connection** on both nodes (Connected).
4. If you use the Vercel cloud: its first request after a while is slow (it starts up); the Test connection wakes it.
5. You: `npm run present:backend`. Both nodes **online** in the printout. Open https://edgeoffload-ai.vercel.app/devices in Chrome (allow local network access if asked): all three tiers **LIVE**.
6. Run one test task on `/simulation` before the audience arrives.

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| EDGE shows OFFLINE, `ConnectError` or timeout | Is Radmin VPN open on **both** laptops, in the same network, with the teammate shown online? Is the edge node window still running? Was the firewall rule added (Part 2)? Test `http://26.x.x.x:8100/health` from your laptop. |
| Radmin VPN shows the teammate as connected through a relay, or latency is high | It still works, just slower: the two networks blocked a direct link, so traffic goes through Radmin's servers. Try another network (e.g. a phone hotspot), or Tailscale (Option B). |
| EDGE error `401` | `EDGE_NODE_TOKEN` on your laptop doesn't match `NODE_TOKEN` on the teammate's laptop. |
| Cloudflare tunnel stopped working | The `trycloudflare.com` address changes every restart: copy the new one into `EDGE_NODE_URL` and restart `npm run present`. |
| CLOUD shows OFFLINE right after starting | The Vercel instance is starting up; it turns online within ~30 s. Pressing **Test connection** on the Configuration page first wakes it. |
| CLOUD error `401` | `CLOUD_NODE_TOKEN` on your laptop doesn't match `NODE_TOKEN` in Vercel. |
| CLOUD error `503` "no NODE_TOKEN set" | Add `NODE_TOKEN` in Vercel (Part 3, step 5) and deploy again. |
| A task says "over the cloud node's 4 MB limit" | Expected: Vercel accepts at most 4.5 MB per request, so that task ran on another tier. |
| A task says "can't process videos (no ffmpeg there)" | Expected for the cloud node; video runs on local or edge. |
| `These ports are already in use` | Another copy is running. Close it, or `npm run demo:stop`, or use `--port=3001`. |
| The app says "Backend offline" | Is the backend running on this laptop (`npm run present:backend`)? On the Vercel site, Chrome must allow local network access: click the icon left of the address bar → **Site settings** → **Local network access: Allow**, then reload. Still blocked: use `npm run present` and http://localhost:3000. If the backend window shows an error, check that `backend\.venv` exists and the install step finished. |

---

## Notes for the viva

- **Real values:** local CPU, memory and battery (psutil on your laptop); each node's own CPU load, memory and task queue; latency and bandwidth measured by the backend over the real internet path every 3 s / 30 s. The edge is reached through Radmin VPN, a virtual network over the internet, so its latency includes that path.
- **Same detector everywhere:** SSDLite320 MobileNetV3 with COCO weights. The cloud runs it on ONNX Runtime instead of PyTorch (Vercel's size limit), with identical results.
- **The cloud is your desktop:** a remote, much more powerful machine (RTX 5070 GPU) reached over the internet, which is the role a cloud datacenter plays in this model. It isn't a commercial datacenter; the Vercel deployment (Part 3) shows the same node running on real cloud infrastructure.
- **Vercel is serverless:** the cloud's CPU load and queue are those of the function instance that answered, and Vercel may run several instances. Treat them as approximate.
- **The DQN currently sends almost every task to LOCAL**, even when the cost model says the edge would be cheaper. That is the trained policy's behaviour, not a deployment problem. The routing to edge and cloud is in place and tested.
- **Offline or unsuitable nodes:** if the DQN picks a tier that is offline, or can't take the task (video without ffmpeg, upload over the size limit), the task runs on the best remaining tier and the result says why.

## Known limitations

- **The trained DQN rarely offloads.** With the nodes live it still chooses LOCAL for the sample tasks (its Q-values rank LOCAL first). Remote execution and fallback are verified by tests that force an EDGE/CLOUD choice against a real worker, not by the DQN choosing them on its own. Retraining with input ranges that match the real measurements would be needed.
- **DQN inputs outside its training ranges.** Real bandwidths (e.g. 0.05–0.3 Gbps) are far below the simulator's training range (1–40 "Gbps"), and the measured round trip is used where the cost model expects one-way latency.
- **Keys in plain text.** `backend\node_settings.json` and `backend\.env` are unencrypted files on the presenter's computer (ignored by git).
- **No hard execution timeout on a worker.** A task that hangs inside the detector can't be killed; the backend stops waiting after 90 s + 30 s of status checks and runs the task on the next tier.
- **Vercel cloud worker:** CPU only (ONNX Runtime), 4.5 MB per request, no video, results kept per instance (a status lookup can reach a different instance), cold starts of a few seconds; Hobby has monthly limits (1 M requests, 4 h CPU, 360 GB-h memory).
- **Edge-like limits** cover concurrency, queue length and CPU threads; memory limits are not enforced.
- **Shared machines.** When several tiers run on one computer (tests, single-laptop demo), they share its CPU/GPU, and their latency is a loopback or emulated link (labelled as such).
- **The backend can't run on Vercel**: it reads the presenter's real hardware and keeps a monitoring loop running; it runs on the presenter's laptop.
