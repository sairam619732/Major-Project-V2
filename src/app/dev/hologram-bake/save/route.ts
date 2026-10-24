import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

// Dev-only: stores the images rendered by /dev/hologram-bake.
const IMAGE_DIR = path.join(process.cwd(), "public", "assets", "holo");
const VIEWS_FILE = path.join(process.cwd(), "src", "lib", "three", "hologramViews.json");
const IMAGE_NAME = /^(landing|decision|sim)-(local|edge|cloud)-(holo|real)\.webp$/;

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") return new Response(null, { status: 404 });

  const { name, dataUrl, views } = await request.json();
  if (name === "views.json") {
    await writeFile(VIEWS_FILE, JSON.stringify(views, null, 2) + "\n");
    return Response.json({ ok: true });
  }
  if (typeof name !== "string" || !IMAGE_NAME.test(name) || typeof dataUrl !== "string") {
    return Response.json({ error: "Unexpected file" }, { status: 400 });
  }
  const [header, base64] = dataUrl.split(",");
  if (header !== "data:image/webp;base64" || !base64) {
    return Response.json({ error: "Expected a WebP image" }, { status: 400 });
  }
  const bytes = Buffer.from(base64, "base64");
  await mkdir(IMAGE_DIR, { recursive: true });
  await writeFile(path.join(IMAGE_DIR, name), bytes);
  return Response.json({ ok: true, bytes: bytes.length });
}
