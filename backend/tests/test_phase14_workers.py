import asyncio
import os
import io
import httpx
from PIL import Image, ImageDraw

async def run_tests():
    async with httpx.AsyncClient(timeout=30.0) as client:
        # 1. Health checks
        r_edge = await client.get("http://127.0.0.1:8001/health")
        print(f"Edge health: {r_edge.status_code}, {r_edge.json()}")
        assert r_edge.status_code == 200
        assert r_edge.json()["tier"].upper() == "EDGE"

        r_cloud = await client.get("http://127.0.0.1:8002/health")
        print(f"Cloud health: {r_cloud.status_code}, {r_cloud.json()}")
        assert r_cloud.status_code == 200
        assert r_cloud.json()["tier"].upper() == "CLOUD"

        # 2. Test direct worker execution
        img = Image.new("RGB", (320, 240), color="blue")
        draw = ImageDraw.Draw(img)
        draw.rectangle([50, 50, 200, 200], fill="red")
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        img_bytes = buf.getvalue()

        # Direct edge worker execute
        r_direct_edge = await client.post(
            "http://127.0.0.1:8001/execute",
            data={"workload_type": "single_image", "task_id": "test_direct"},
            files=[("files", ("test.jpg", img_bytes, "image/jpeg"))]
        )
        print(f"Direct Edge execute: {r_direct_edge.status_code}, {r_direct_edge.json()['worker_id']}, proc_time={r_direct_edge.json()['processing_time_ms']}ms")
        assert r_direct_edge.status_code == 200
        assert r_direct_edge.json()["tier"].upper() == "EDGE"

        # 3. Test Main Backend /api/simulation/execute with different telemetry to induce LOCAL, EDGE, CLOUD

        # Test Case A: Good local resources (high cpu/mem available, low latency) -> should prefer LOCAL
        # Let's see what DQN picks
        data_local = {
            "task_id": "TASK_LOCAL_TEST",
            "workload_type": "single_image",
            "deadline_ms": "3000",
            "priority": "1",
            "device_cpu_available": "95.0",
            "device_memory_available": "90.0",
            "device_battery_level": "99.0",
            "device_base_latency": "1.0",
            "edge_cpu_load": "95.0",
            "edge_task_queue": "100",
            "edge_network_latency": "80.0",
            "edge_bandwidth": "0.1",
            "cloud_cpu_load": "95.0",
            "cloud_task_queue": "100",
            "cloud_network_latency": "150.0",
            "cloud_bandwidth": "0.1",
        }
        res_a = await client.post(
            "http://127.0.0.1:8000/api/simulation/execute",
            data=data_local,
            files=[("files", ("image1.jpg", img_bytes, "image/jpeg"))]
        )
        json_a = res_a.json()
        print(f"\n--- Scenario A (Local favored) ---")
        print(f"Decision: {json_a.get('decision')}")
        print(f"Worker: {json_a.get('execution_worker')}")
        print(f"Proc Time: {json_a.get('processing_time_ms')} ms")
        print(f"Net Time: {json_a.get('network_transfer_ms')} ms")
        print(f"Total Latency: {json_a.get('latency_ms')} ms")
        print(f"Detections: {json_a.get('detection_count')}")

        # Test Case B: Heavy local constraint, favorable Edge
        data_edge = {
            "task_id": "TASK_EDGE_TEST",
            "workload_type": "single_image",
            "deadline_ms": "500",
            "priority": "2",
            "device_cpu_available": "5.0",
            "device_memory_available": "10.0",
            "device_battery_level": "10.0",
            "device_base_latency": "50.0",
            "edge_cpu_load": "5.0",
            "edge_task_queue": "0",
            "edge_network_latency": "5.0",
            "edge_bandwidth": "5.0",
            "cloud_cpu_load": "90.0",
            "cloud_task_queue": "50",
            "cloud_network_latency": "150.0",
            "cloud_bandwidth": "0.5",
        }
        res_b = await client.post(
            "http://127.0.0.1:8000/api/simulation/execute",
            data=data_edge,
            files=[("files", ("image1.jpg", img_bytes, "image/jpeg"))]
        )
        json_b = res_b.json()
        print(f"\n--- Scenario B (Edge favored) ---")
        print(f"Decision: {json_b.get('decision')}")
        print(f"Worker: {json_b.get('execution_worker')}")
        print(f"Proc Time: {json_b.get('processing_time_ms')} ms")
        print(f"Net Time: {json_b.get('network_transfer_ms')} ms")
        print(f"Total Latency: {json_b.get('latency_ms')} ms")

        # Test Case C: Favorable Cloud, heavy edge & local congestion
        data_cloud = {
            "task_id": "TASK_CLOUD_TEST",
            "workload_type": "single_image",
            "deadline_ms": "1000",
            "priority": "2",
            "device_cpu_available": "5.0",
            "device_memory_available": "5.0",
            "device_battery_level": "15.0",
            "device_base_latency": "50.0",
            "edge_cpu_load": "98.0",
            "edge_task_queue": "90",
            "edge_network_latency": "60.0",
            "edge_bandwidth": "0.1",
            "cloud_cpu_load": "5.0",
            "cloud_task_queue": "0",
            "cloud_network_latency": "15.0",
            "cloud_bandwidth": "10.0",
        }
        res_c = await client.post(
            "http://127.0.0.1:8000/api/simulation/execute",
            data=data_cloud,
            files=[("files", ("image1.jpg", img_bytes, "image/jpeg"))]
        )
        json_c = res_c.json()
        print(f"\n--- Scenario C (Cloud favored) ---")
        print(f"Decision: {json_c.get('decision')}")
        print(f"Worker: {json_c.get('execution_worker')}")
        print(f"Proc Time: {json_c.get('processing_time_ms')} ms")
        print(f"Net Time: {json_c.get('network_transfer_ms')} ms")
        print(f"Total Latency: {json_c.get('latency_ms')} ms")

        # Test Case D: Batch Images Workload
        print(f"\n--- Scenario D: Image Batch Workload ---")
        batch_files = [
            ("files", (f"img_{i}.jpg", img_bytes, "image/jpeg"))
            for i in range(3)
        ]
        res_d = await client.post(
            "http://127.0.0.1:8000/api/simulation/execute",
            data={**data_edge, "workload_type": "batch_images", "task_id": "TASK_BATCH_TEST"},
            files=batch_files
        )
        json_d = res_d.json()
        print(f"Batch Decision: {json_d.get('decision')}")
        print(f"Batch Worker: {json_d.get('execution_worker')}")
        print(f"Processed Count: {json_d.get('processed_count')}")
        print(f"Proc Time: {json_d.get('processing_time_ms')} ms")
        print(f"Net Time: {json_d.get('network_transfer_ms')} ms")
        print(f"Total Latency: {json_d.get('latency_ms')} ms")
        print(f"Batch items count: {len(json_d.get('batch_items', []))}")

        # Test Case E: Video Workload (using sample video from public/samples)
        print(f"\n--- Scenario E: Video Workload ---")
        repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        video_path = os.path.join(repo_root, "public", "samples", "sample_video.mp4")
        with open(video_path, "rb") as vf:
            video_bytes = vf.read()
        res_e = await client.post(
            "http://127.0.0.1:8000/api/simulation/execute",
            data={**data_cloud, "workload_type": "video", "task_id": "TASK_VIDEO_TEST"},
            files=[("files", ("sample_video.mp4", video_bytes, "video/mp4"))]
        )
        json_e = res_e.json()
        print(f"Video Decision: {json_e.get('decision')}")
        print(f"Video Worker: {json_e.get('execution_worker')}")
        print(f"Processed Count (frames): {json_e.get('processed_count')}")
        print(f"Proc Time: {json_e.get('processing_time_ms')} ms")
        print(f"Net Time: {json_e.get('network_transfer_ms')} ms")
        print(f"Total Latency: {json_e.get('latency_ms')} ms")

if __name__ == "__main__":
    asyncio.run(run_tests())
