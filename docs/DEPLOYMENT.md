# Deployment: three machines

How to run EdgeOffload AI across three real machines for the presentation.

| Tier | Machine | Runs | Address |
| --- | --- | --- | --- |
| **LOCAL** | Your laptop (i5 10th gen, 16 GB RAM, 256 GB SSD) | Backend (DQN, real local telemetry) + web app | `http://localhost:3000` |
| **EDGE** | Teammate's laptop, on the same network | Offloading node (PyTorch detector) | `http://<teammate-ip>:8100` |
| **CLOUD** | Vercel (free Hobby plan), Mumbai region | Offloading node (same detector on ONNX Runtime) | `https://<project>.vercel.app` |

Your laptop's backend checks both nodes every 3 s (real latency, bandwidth, CPU load, queue), feeds those values to the DQN, and sends each task to the tier the DQN picks. A node that stops answering is shown **OFFLINE** and gets no tasks.

Do the parts in this order: **0 → 3 (Vercel) → 2 (teammate) → 1 (your laptop)**, because your laptop's settings need the other two addresses.

---

## Part 0. Get the code onto every machine (do this on the desktop)

All recent work is committed on the desktop but not pushed. Push it so both laptops can download it:

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

### Steps

1. **Create a free Vercel account** at <https://vercel.com/signup> (Hobby plan).

2. **Build the upload folder.** From the project folder:
   ```powershell
   cd backend
   .\.venv\Scripts\python.exe scripts\build_vercel_node.py
   ```
   This creates `backend\dist\vercel-node` (node code + ONNX model, about 14 MB).

3. **Make an access key** (the node is on the public internet; without the key it refuses all tasks):
   ```powershell
   .\.venv\Scripts\python.exe -c "import secrets; print(secrets.token_urlsafe(32))"
   ```
   Copy the printed key somewhere safe. You need it twice: in Vercel and on your laptop.

4. **Deploy with the Vercel CLI** (needs Node.js):
   ```powershell
   cd dist\vercel-node
   npx vercel@latest login
   npx vercel@latest deploy --prod
   ```
   Answer the questions: set up and deploy → **yes**; scope → your account; link to existing project → **no**; project name → e.g. `edgeoffload-cloud`; code directory → `./`; change settings → **no**. Vercel detects FastAPI and installs `requirements.txt` (no PyTorch). The region is Mumbai (`bom1`) from `vercel.json`.

5. **Add the access key to Vercel**, then deploy again so the node picks it up:
   ```powershell
   npx vercel@latest env add NODE_TOKEN production
   npx vercel@latest deploy --prod
   ```
   Paste the key from step 3 when asked.

6. **Check it.** Open `https://<project>.vercel.app/health` in a browser. You should see:
   ```json
   {"status":"ok","tier":"CLOUD","node_id":"cloud-vercel","model_ready":true}
   ```
   - The first request after a while can take several seconds (the instance starts up). Refresh once.
   - If you see a Vercel login page instead, open the project on vercel.com → **Settings → Deployment Protection** and turn off **Vercel Authentication**.
   - `/status` without the key answers `401`; that is correct.

7. Note the address (`https://<project>.vercel.app`) and the key for Part 1.

To update the cloud node later (after code changes), repeat steps 2 and 4 (`deploy --prod`); the key stays in Vercel.

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

### Network (most important)

Both laptops must be on **the same network**, and that network must let laptops reach each other.

- **College or office Wi-Fi often blocks this** ("client isolation"). For the presentation, use a **phone hotspot** that both laptops join. It also gives your laptop internet for the cloud node.
- On the teammate's laptop: **Settings → Network & internet → Wi-Fi → (the network) → Network profile type → Private**.
- Allow the node through the firewall. In PowerShell **run as administrator**:
  ```powershell
  New-NetFirewallRule -DisplayName "EdgeOffload edge node" -Direction Inbound -Protocol TCP -LocalPort 8100 -Action Allow -Profile Private
  ```
  (Or click **Allow** on "Private networks" when Windows asks the first time the node starts.)

### Start the edge node (every time)

```powershell
cd Major-Project-V2\backend
.\.venv\Scripts\python.exe -m node.run
```

It prints a line like `Set EDGE_NODE_URL=http://192.168.43.57:8100`. Send that address to the presenter. Keep this window open, the laptop **plugged in**, and sleep turned off (**Settings → System → Power → Screen and sleep → Never** while presenting).

The address changes when the laptop joins a different network (for example, switching from college Wi-Fi to the hotspot). Check the printed line each time and update Part 1's `.env` if it changed.

Optional: to require a key on the edge too, start it with `$env:NODE_TOKEN="some-key"; .\.venv\Scripts\python.exe -m node.run` and put the same key in `EDGE_NODE_TOKEN` on your laptop.

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
# The address printed on the teammate's laptop
EDGE_NODE_URL=http://192.168.43.57:8100
# Leave empty unless you set a key on the edge
EDGE_NODE_TOKEN=
# Your Vercel address and the key from Part 3, step 3
CLOUD_NODE_URL=https://edgeoffload-cloud.vercel.app
CLOUD_NODE_TOKEN=paste-the-key-here
```

Before presenting, check that your laptop can reach the edge: open `http://<teammate-ip>:8100/health` in your browser. If it doesn't load, see Troubleshooting.

### Start (every time)

```powershell
cd Major-Project-V2
npm run present
```

This builds the web app (about a minute on an i5), starts the backend and the web app, and after a few seconds prints each node's status, for example:
```
 Nodes (from backend/.env):
   EDGE  online   http://192.168.43.57:8100  8.4 ms, 0.21 Gbps
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

1. Phone hotspot on; **both laptops** joined to it.
2. Teammate: start the edge node; send you the printed address.
3. You: update `EDGE_NODE_URL` in `backend\.env` if the address changed.
4. Open `https://<project>.vercel.app/health` once to wake the cloud node.
5. You: `npm run present`. All three nodes **online** in the printout, all **LIVE** on `/devices`.
6. Run one test task on `/simulation` before the audience arrives.

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| EDGE shows OFFLINE, `ConnectError` | Same network? Profile **Private**? Firewall rule added? Address changed? Test `http://<ip>:8100/health` from your laptop. College Wi-Fi often blocks laptop-to-laptop traffic: use a phone hotspot. |
| CLOUD shows OFFLINE right after starting | The Vercel instance is starting up; it turns online within ~30 s. Opening `/health` in a browser first helps. |
| CLOUD error `401` | `CLOUD_NODE_TOKEN` on your laptop doesn't match `NODE_TOKEN` in Vercel. |
| CLOUD error `503` "no NODE_TOKEN set" | Add `NODE_TOKEN` in Vercel (Part 3, step 5) and deploy again. |
| A task says "over the cloud node's 4 MB limit" | Expected: Vercel accepts at most 4.5 MB per request, so that task ran on another tier. |
| A task says "can't process videos (no ffmpeg there)" | Expected for the cloud node; video runs on local or edge. |
| `These ports are already in use` | Another copy is running. Close it, or `npm run demo:stop`, or use `--port=3001`. |
| The app says "Backend offline" | The backend window shows the error. Check that `backend\.venv` exists and the install step finished. |

---

## Notes for the viva

- **Real values:** local CPU, memory and battery (psutil on your laptop); each node's own CPU load, memory and task queue; latency and bandwidth measured by the backend over the real network every 3 s / 30 s.
- **Same detector everywhere:** SSDLite320 MobileNetV3 with COCO weights. The cloud runs it on ONNX Runtime instead of PyTorch (Vercel's size limit), with identical results.
- **Vercel is serverless:** the cloud's CPU load and queue are those of the function instance that answered, and Vercel may run several instances. Treat them as approximate.
- **The DQN currently sends almost every task to LOCAL**, even when the cost model says the edge would be cheaper. That is the trained policy's behaviour, not a deployment problem. The routing to edge and cloud is in place and tested.
- **Offline or unsuitable nodes:** if the DQN picks a tier that is offline, or can't take the task (video without ffmpeg, upload over the size limit), the task runs on the best remaining tier and the result says why.
