---
title: EdgeOffload Cloud Node
emoji: ☁️
colorFrom: purple
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# EdgeOffload AI — cloud node

The cloud tier of the EdgeOffload AI project: it reports this server's real CPU, memory and task
queue and runs SSDLite MobileNet V3 object detection on images sent by the project's backend.

Endpoints: `GET /health`, `GET /status`, `POST /echo` (bandwidth probe), `POST /execute`.
Set the Space secret `NODE_TOKEN` so only the project's backend (with the same `CLOUD_NODE_TOKEN`)
can use it.
