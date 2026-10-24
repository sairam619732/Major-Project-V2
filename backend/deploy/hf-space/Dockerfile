# Cloud offloading node for Hugging Face Spaces (Docker SDK, free CPU tier).
# Built from the folder made by backend/scripts/build_hf_space.py.
FROM python:3.12-slim

# ffmpeg re-encodes annotated video results.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Spaces run the container as user 1000.
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    TORCH_HOME=/home/user/.cache/torch \
    PYTHONUNBUFFERED=1 \
    NODE_TIER=CLOUD \
    NODE_PORT=7860
WORKDIR /home/user/app

# CPU-only PyTorch (much smaller than the default CUDA build), then the rest.
RUN pip install --no-cache-dir --user torch torchvision --index-url https://download.pytorch.org/whl/cpu
COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

COPY --chown=user app ./app
COPY --chown=user node ./node

# Download the detector weights at build time so the first task isn't slowed by it.
RUN python -c "from torchvision.models.detection import ssdlite320_mobilenet_v3_large as m, SSDLite320_MobileNet_V3_Large_Weights as w; m(weights=w.DEFAULT)"

EXPOSE 7860
CMD ["python", "-m", "node.run"]
