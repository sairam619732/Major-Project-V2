"""Verification script for testing FastAPI backend endpoints."""

import json
import urllib.request
import urllib.error

BASE_URL = "http://127.0.0.1:8000"


def test_health():
    url = f"{BASE_URL}/health"
    req = urllib.request.Request(url, method="GET")
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        print("GET /health -> Status:", resp.status)
        print("Response:", json.dumps(data, indent=2))
        assert data["status"] == "ok"
        assert data["service"] == "cloud-edge-offloading-backend"


def test_api_info():
    url = f"{BASE_URL}/api"
    req = urllib.request.Request(url, method="GET")
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        print("\nGET /api -> Status:", resp.status)
        print("Response:", json.dumps(data, indent=2))
        assert "name" in data
        assert "version" in data
        assert "optimization_decision" in data["endpoints"]
        assert "optimization_benchmark" in data["endpoints"]


def test_task_validate_valid():
    url = f"{BASE_URL}/api/tasks/validate"
    payload = {
        "task_id": "TASK_001",
        "task_type": "OBJECT_DETECTION",
        "data_size_mb": 24.5,
        "cpu_demand_percent": 65.0,
        "memory_demand_percent": 45.0,
        "deadline_ms": 45.0,
        "priority": "medium",
    }
    data_bytes = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data_bytes,
        headers={"Content-Type": "application/json", "Origin": "http://localhost:3000"},
        method="POST",
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        cors_header = resp.headers.get("access-control-allow-origin")
        print("\nPOST /api/tasks/validate (Valid) -> Status:", resp.status)
        print("CORS Origin Header:", cors_header)
        assert data["valid"] is True
        assert data["task_id"] == "TASK_001"
        assert cors_header == "http://localhost:3000"


def test_task_validate_invalid():
    url = f"{BASE_URL}/api/tasks/validate"
    payload = {
        "task_id": "",
        "task_type": "OBJECT_DETECTION",
        "data_size_mb": -5.0,
        "cpu_demand_percent": 150.0,
        "memory_demand_percent": 45.0,
        "deadline_ms": 0.0,
    }
    data_bytes = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data_bytes,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        urllib.request.urlopen(req)
        raise AssertionError("Expected 422 Unprocessable Entity for invalid task payload")
    except urllib.error.HTTPError as e:
        print("\nPOST /api/tasks/validate (Invalid payload expected 422) -> Status:", e.code)
        assert e.code == 422


def test_simulation_evaluate_valid():
    url = f"{BASE_URL}/api/simulation/evaluate"
    payload = {
        "task": {
            "task_id": "TASK_001",
            "task_type": "OBJECT_DETECTION",
            "data_size_mb": 24.5,
            "cpu_demand_percent": 65.0,
            "memory_demand_percent": 45.0,
            "deadline_ms": 45.0,
            "priority": 3,
        },
        "local": {
            "cpu_available": 38.0,
            "memory_available": 48.0,
            "battery_level": 72.0,
            "base_latency": 0.8,
        },
        "edge": {
            "cpu_load": 41.0,
            "task_queue": 2,
            "network_latency": 3.8,
            "bandwidth": 10.0,
        },
        "cloud": {
            "cpu_load": 67.0,
            "task_queue": 18,
            "network_latency": 42.0,
            "bandwidth": 25.0,
        },
    }
    data_bytes = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data_bytes,
        headers={"Content-Type": "application/json", "Origin": "http://localhost:3000"},
        method="POST",
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        print("\nPOST /api/simulation/evaluate (Valid) -> Status:", resp.status)
        assert data["status"] == "success"
        assert data["selectedTarget"] in ["local", "edge", "cloud"]


def test_optimization_status():
    url = f"{BASE_URL}/api/optimization/status"
    req = urllib.request.Request(url, method="GET")
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        print("\nGET /api/optimization/status -> Status:", resp.status)
        print("Response:", json.dumps(data, indent=2))
        assert data["status"] == "operational"
        assert "model_loaded" in data
        assert data["fallback_available"] is True


def test_optimization_decision():
    url = f"{BASE_URL}/api/optimization/decision"
    payload = {
        "task": {
            "task_id": "TASK_001",
            "task_type": "OBJECT_DETECTION",
            "data_size_mb": 24.5,
            "cpu_demand_percent": 65.0,
            "memory_demand_percent": 45.0,
            "deadline_ms": 45.0,
            "priority": 3,
        },
        "local": {
            "cpu_available": 38.0,
            "memory_available": 48.0,
            "battery_level": 72.0,
            "base_latency": 0.8,
        },
        "edge": {
            "cpu_load": 41.0,
            "task_queue": 2,
            "network_latency": 3.8,
            "bandwidth": 10.0,
        },
        "cloud": {
            "cpu_load": 67.0,
            "task_queue": 18,
            "network_latency": 42.0,
            "bandwidth": 25.0,
        },
        "temperature": 1.0,
    }
    data_bytes = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data_bytes,
        headers={"Content-Type": "application/json", "Origin": "http://localhost:3000"},
        method="POST",
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        print("\nPOST /api/optimization/decision -> Status:", resp.status)
        print("Response:", json.dumps(data, indent=2))
        assert data["decision"] in ["LOCAL", "EDGE", "CLOUD"]
        assert data["action_index"] in [0, 1, 2]
        assert data["confidence"] >= 0.33
        assert "local" in data["q_values"]
        assert "edge" in data["q_values"]
        assert "cloud" in data["q_values"]
        assert "metrics" in data


def test_optimization_benchmark():
    url = f"{BASE_URL}/api/optimization/benchmark"
    payload = {
        "task": {
            "task_id": "TASK_001",
            "task_type": "OBJECT_DETECTION",
            "data_size_mb": 24.5,
            "cpu_demand_percent": 65.0,
            "memory_demand_percent": 45.0,
            "deadline_ms": 45.0,
            "priority": 3,
        },
        "local": {
            "cpu_available": 38.0,
            "memory_available": 48.0,
            "battery_level": 72.0,
            "base_latency": 0.8,
        },
        "edge": {
            "cpu_load": 41.0,
            "task_queue": 2,
            "network_latency": 3.8,
            "bandwidth": 10.0,
        },
        "cloud": {
            "cpu_load": 67.0,
            "task_queue": 18,
            "network_latency": 42.0,
            "bandwidth": 25.0,
        },
    }
    data_bytes = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data_bytes,
        headers={"Content-Type": "application/json", "Origin": "http://localhost:3000"},
        method="POST",
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        print("\nPOST /api/optimization/benchmark -> Status:", resp.status)
        print("DQN decision:", data["dqn"]["decision"])
        print("Baselines present:", list(data["baselines"].keys()))
        assert "local_only" in data["baselines"]
        assert "edge_only" in data["baselines"]
        assert "cloud_only" in data["baselines"]
        assert "random" in data["baselines"]
        assert "rule_based_greedy" in data["baselines"]


def test_optimization_benchmark_report():
    url = f"{BASE_URL}/api/optimization/benchmark-report"
    req = urllib.request.Request(url, method="GET")
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        print("\nGET /api/optimization/benchmark-report -> Status:", resp.status)
        assert "metadata" in data
        assert "policies" in data
        assert "comparisons" in data
        assert "DQN" in data["policies"]
        assert "training_history" in data
        assert "training_config" in data
        assert len(data["training_history"]) == 200
        print("Benchmark report (with training history & config) successfully retrieved via API!")


def test_optimization_training_history():
    url = f"{BASE_URL}/api/optimization/training-history"
    req = urllib.request.Request(url, method="GET")
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        print("\nGET /api/optimization/training-history -> Status:", resp.status)
        assert isinstance(data, list)
        assert len(data) == 200
        assert "episode" in data[0]
        assert "average_reward" in data[0]
        assert "epsilon" in data[0]
        print("Training history endpoint successfully verified!")


def test_phase17_dqn_integration():
    url = f"{BASE_URL}/api/simulation/evaluate"
    payload = {
        "task": {
            "task_id": "TASK_P17",
            "task_type": "OBJECT_DETECTION",
            "data_size_mb": 24.5,
            "cpu_demand_percent": 65.0,
            "memory_demand_percent": 45.0,
            "deadline_ms": 45.0,
            "priority": 3,
        },
        "local": {
            "cpu_available": 38.0,
            "memory_available": 48.0,
            "battery_level": 72.0,
            "base_latency": 0.8,
        },
        "edge": {
            "cpu_load": 41.0,
            "task_queue": 2,
            "network_latency": 3.8,
            "bandwidth": 10.0,
        },
        "cloud": {
            "cpu_load": 67.0,
            "task_queue": 18,
            "network_latency": 42.0,
            "bandwidth": 25.0,
        },
        "algorithm": "dqn",
    }
    data_bytes = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data_bytes,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        print("\nPOST /api/simulation/evaluate (Phase 17 DQN Integration) -> Status:", resp.status)
        print("  Decision:", data["selectedTarget"])
        print("  Method:", data.get("method"))
        print("  Confidence:", data.get("confidence"))
        print("  Q-Values:", data.get("q_values"))
        assert data["status"] == "success"
        assert data["selectedTarget"] in ["local", "edge", "cloud"]
        assert data["method"] in ["dqn", "rule_based_fallback"]
        assert "confidence" in data
        assert "q_values" in data
        assert "is_fallback" in data

    # Test Determinism: Re-executing with identical input yields identical target
    req_det = urllib.request.Request(
        url,
        data=data_bytes,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req_det) as resp2:
        data2 = json.loads(resp2.read().decode())
        assert data2["selectedTarget"] == data["selectedTarget"]
        assert data2.get("confidence") == data.get("confidence")
        print("  Determinism check passed!")

    # Test Algorithm Selection: "greedy"
    payload["algorithm"] = "greedy"
    req_greedy = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req_greedy) as resp_g:
        data_g = json.loads(resp_g.read().decode())
        assert data_g["method"] == "rule_based"
        print("  Algorithm selection ('greedy') check passed!")


if __name__ == "__main__":
    print("=== Testing FastAPI Backend Endpoints (Regression & Optimization) ===")
    test_health()
    test_api_info()
    test_task_validate_valid()
    test_task_validate_invalid()
    test_simulation_evaluate_valid()
    test_optimization_status()
    test_optimization_decision()
    test_optimization_benchmark()
    test_optimization_benchmark_report()
    test_optimization_training_history()
    test_phase17_dqn_integration()
    print("\nALL BACKEND API REGRESSION & OPTIMIZATION TESTS PASSED SUCCESSFULLY!")



