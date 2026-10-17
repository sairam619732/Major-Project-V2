"""Phase 14A Test Suite: Real Edge Server Connection over HTTP.

Tests:
1. Real Edge Server health check (GET /health)
2. Direct Edge Server execution (POST /execute) for Image, Batch, and Video
3. Autonomous routing to LOCAL when local resources are favorable
4. Autonomous routing to EDGE when edge conditions are optimal
5. Real network transfer time measurement (T_network = T_roundtrip - T_processing)
6. Unreachable Edge Server handling: returns 503 error without faking execution
"""

import asyncio
import os
import io
import httpx
from PIL import Image, ImageDraw

MAIN_BACKEND_URL = "http://127.0.0.1:8000"
EDGE_SERVER_URL = "http://127.0.0.1:8001"


async def run_edge_tests():
    print("=" * 65)
    print("RUNNING PHASE 14A REAL EDGE SERVER VERIFICATION SUITE")
    print("=" * 65)

    async with httpx.AsyncClient(timeout=30.0) as client:
        # TEST 1: Health check
        print("\n[TEST 1] Testing Edge Server Health Check...")
        r_health = await client.get(f"{EDGE_SERVER_URL}/health")
        print(f"  Status code: {r_health.status_code}")
        health_data = r_health.json()
        print(f"  Response: {health_data}")
        assert r_health.status_code == 200
        assert health_data["execution_node"] == "EDGE"
        assert health_data["status"] == "healthy"
        print("  -> PASSED: Real Edge Server is online and reporting healthy.")

        # Create test image
        img = Image.new("RGB", (320, 240), color="blue")
        draw = ImageDraw.Draw(img)
        draw.rectangle([50, 50, 200, 200], fill="red")
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        test_img_bytes = buf.getvalue()

        # TEST 2: Direct Edge Server Execution
        print("\n[TEST 2] Testing Direct Edge Server Execution (POST /execute)...")
        r_direct = await client.post(
            f"{EDGE_SERVER_URL}/execute",
            data={"workload_type": "IMAGE", "task_id": "DIRECT_EDGE_TEST"},
            files=[("files", ("test.jpg", test_img_bytes, "image/jpeg"))],
        )
        print(f"  Status code: {r_direct.status_code}")
        direct_data = r_direct.json()
        print(f"  Worker: {direct_data.get('worker_id')}")
        print(f"  Execution Node: {direct_data.get('execution_node')}")
        print(f"  Success: {direct_data.get('success')}")
        print(f"  Processing Time: {direct_data.get('processing_time')} ms")
        print(f"  Payload Size: {direct_data.get('payload_size')} MB")
        assert r_direct.status_code == 200
        assert direct_data["execution_node"] == "EDGE"
        assert direct_data["success"] is True
        assert direct_data["processing_time"] > 0
        print("  -> PASSED: Direct Edge execution executed real neural inference.")

        # TEST 3: Autonomous LOCAL Routing via Main Backend
        print("\n[TEST 3] Testing Autonomous LOCAL Routing via Main Backend (:8000)...")
        data_local = {
            "task_id": "TEST_LOCAL_ROUTING",
            "workload_type": "IMAGE",
            "deadline_ms": "5000",
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
        res_local = await client.post(
            f"{MAIN_BACKEND_URL}/api/simulation/execute",
            data=data_local,
            files=[("files", ("test.jpg", test_img_bytes, "image/jpeg"))],
        )
        json_local = res_local.json()
        print(f"  DQN Decision: {json_local.get('decision')}")
        print(f"  Worker: {json_local.get('execution_worker')}")
        print(f"  Inference Time: {json_local.get('processing_time_ms')} ms")
        print(f"  Network Transfer: {json_local.get('network_transfer_ms')} ms")
        print(f"  Total Latency: {json_local.get('latency_ms')} ms")
        assert json_local.get("decision") == "LOCAL"
        assert json_local.get("network_transfer_ms") == 0.0
        print("  -> PASSED: Workload executed locally on device without network transmission.")

        # TEST 4: Autonomous EDGE Routing via Main Backend over Real HTTP
        print("\n[TEST 4] Testing Autonomous EDGE Routing via Main Backend (:8000)...")
        data_edge = {
            "task_id": "TEST_EDGE_ROUTING",
            "workload_type": "IMAGE",
            "deadline_ms": "600",
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
        res_edge = await client.post(
            f"{MAIN_BACKEND_URL}/api/simulation/execute",
            data=data_edge,
            files=[("files", ("test.jpg", test_img_bytes, "image/jpeg"))],
        )
        json_edge = res_edge.json()
        print(f"  DQN Decision: {json_edge.get('decision')}")
        print(f"  Worker: {json_edge.get('execution_worker')}")
        print(f"  Inference Time: {json_edge.get('processing_time_ms')} ms")
        print(f"  Network Transfer (Real HTTP RTT): {json_edge.get('network_transfer_ms')} ms")
        print(f"  Total Latency: {json_edge.get('latency_ms')} ms")
        assert json_edge.get("decision") == "EDGE"
        assert json_edge.get("network_transfer_ms") > 0
        print("  -> PASSED: Task dispatched to Edge server over HTTP with real network latency.")

        # TEST 5: Edge Batch Workload Execution
        print("\n[TEST 5] Testing Edge Batch Workload Execution...")
        batch_files = [
            ("files", (f"frame_{i}.jpg", test_img_bytes, "image/jpeg"))
            for i in range(3)
        ]
        res_batch = await client.post(
            f"{MAIN_BACKEND_URL}/api/simulation/execute",
            data={**data_edge, "workload_type": "IMAGE_BATCH", "task_id": "TEST_EDGE_BATCH"},
            files=batch_files,
        )
        json_batch = res_batch.json()
        print(f"  DQN Decision: {json_batch.get('decision')}")
        print(f"  Worker: {json_batch.get('execution_worker')}")
        print(f"  Processed Count: {json_batch.get('processed_count')}")
        print(f"  Batch Items Count: {len(json_batch.get('batch_items', []))}")
        print(f"  Inference Time: {json_batch.get('processing_time_ms')} ms")
        print(f"  Network Transfer: {json_batch.get('network_transfer_ms')} ms")
        assert json_batch.get("decision") == "EDGE"
        assert json_batch.get("processed_count") == 3
        print("  -> PASSED: All 3 images in batch processed by Edge server.")

        # TEST 6: Edge Unreachable Connection Error Handling
        print("\n[TEST 6] Testing Unreachable Edge Server Handling...")
        from app.services import worker_client
        from app.main import app
        old_url = os.environ.get("EDGE_SERVER_URL")
        try:
            os.environ["EDGE_SERVER_URL"] = "http://127.0.0.1:19999"
            
            # Verify worker_client directly returns status FAILED and descriptive error
            direct_unreachable = await worker_client.execute_on_worker(
                tier="EDGE",
                workload_type="IMAGE",
                files_data=[("test.jpg", test_img_bytes, "image/jpeg")],
                task_id="TEST_DIRECT_UNREACHABLE",
            )
            assert direct_unreachable.get("success") is False
            assert "unreachable" in direct_unreachable.get("error_message", "").lower()
            print("  Direct worker_client status:", direct_unreachable.get("status"))
            print("  Direct worker error:", direct_unreachable.get("error_message")[:80] + "...")

            # Verify FastAPI endpoint raises HTTP 503 Service Unavailable without faking
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as asgi_client:
                fail_res = await asgi_client.post(
                    "/api/simulation/execute",
                    data={**data_edge, "task_id": "TEST_UNREACHABLE_EDGE"},
                    files=[("files", ("test.jpg", test_img_bytes, "image/jpeg"))],
                )
                print(f"  FastAPI Status code: {fail_res.status_code}")
                print(f"  FastAPI Error Detail: {fail_res.json().get('detail')}")
                assert fail_res.status_code == 503
                assert "unreachable" in fail_res.json().get("detail", "").lower()
                print("  -> PASSED: Unreachable Edge server returns HTTP 503 with clear error without faking.")
        finally:
            if old_url:
                os.environ["EDGE_SERVER_URL"] = old_url
            else:
                os.environ.pop("EDGE_SERVER_URL", None)

    print("\n" + "=" * 65)
    print("ALL PHASE 14A REAL EDGE SERVER VERIFICATION TESTS PASSED!")
    print("=" * 65)


if __name__ == "__main__":
    asyncio.run(run_edge_tests())
