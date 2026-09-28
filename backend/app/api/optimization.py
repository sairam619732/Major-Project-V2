"""FastAPI router for DQN offloading optimization, training, and benchmarking."""

from fastapi import APIRouter, status, HTTPException
from app.models.optimization import (
    OptimizationRequest,
    OptimizationDecisionResponse,
    TrainingRequest,
    TrainingResponse,
    BaselineComparisonResponse,
)
from app.ml.config import DQNConfig
from app.ml.inference import inference_service
from app.ml.train import run_training_loop
from app.ml.environment import state_to_vector
from app.ml.baselines import evaluate_baselines

router = APIRouter(prefix="/optimization", tags=["Optimization (DQN)"])


@router.post(
    "/decision",
    response_model=OptimizationDecisionResponse,
    status_code=status.HTTP_200_OK,
    summary="Compute DQN Offloading Decision",
    description=(
        "Evaluates the current task and system telemetry using the trained Deep Q-Network. "
        "Returns the chosen discrete action, confidence derived from Boltzmann Softmax, "
        "estimated Q-values, and trade-off metrics. Falls back to validated rule-based logic "
        "if no model checkpoint is available."
    ),
)
async def get_optimization_decision(payload: OptimizationRequest) -> OptimizationDecisionResponse:
    """Computes intelligent offloading placement using the DQN policy."""
    result = inference_service.predict(
        task=payload.task,
        local=payload.local,
        edge=payload.edge,
        cloud=payload.cloud,
        weights=payload.weights,
        temperature=payload.temperature or 1.0,
    )
    return OptimizationDecisionResponse(**result)


@router.post(
    "/train",
    response_model=TrainingResponse,
    status_code=status.HTTP_200_OK,
    summary="Train DQN Offloading Policy",
    description="Triggers reproducible off-policy DQN training with replay buffer and target network updates.",
)
async def train_dqn_endpoint(req: TrainingRequest) -> TrainingResponse:
    """Executes offline DQN training loop and reloads the inference engine with the new checkpoint."""
    cfg = DQNConfig(
        episodes=req.episodes,
        seed=req.seed,
        learning_rate=req.learning_rate,
    )
    try:
        results = run_training_loop(config=cfg, weights=req.weights)
        # Reload the inference service with the newly trained checkpoint
        inference_service.reload()
        return TrainingResponse(**results)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"DQN training failed: {str(e)}"
        )


@router.post(
    "/benchmark",
    response_model=BaselineComparisonResponse,
    status_code=status.HTTP_200_OK,
    summary="Benchmark DQN Against 5 Classical Baselines",
    description=(
        "Evaluates the current task across DQN and 5 classical baselines: "
        "Local-Only, Edge-Only, Cloud-Only, Random, and Rule-Based Greedy. "
        "Provides empirical comparison without fabricated results."
    ),
)
async def benchmark_endpoint(payload: OptimizationRequest) -> BaselineComparisonResponse:
    """Runs comparative evaluation between DQN and classical baselines."""
    # 1. DQN Decision
    dqn_res = inference_service.predict(
        task=payload.task,
        local=payload.local,
        edge=payload.edge,
        cloud=payload.cloud,
        weights=payload.weights,
        temperature=payload.temperature or 1.0,
    )

    # 2. Classical Baselines
    state_vec = state_to_vector(payload.task, payload.local, payload.edge, payload.cloud)
    baselines_res = evaluate_baselines(
        task=payload.task,
        local=payload.local,
        edge=payload.edge,
        cloud=payload.cloud,
        state_vec=state_vec,
        weights=payload.weights,
    )

    return BaselineComparisonResponse(
        dqn=OptimizationDecisionResponse(**dqn_res),
        baselines=baselines_res,
    )


@router.get(
    "/status",
    summary="DQN Model and Service Status",
    description="Returns current status of the DQN agent, checkpoint loading status, and active configuration.",
)
async def get_optimization_status():
    """Returns model loading and hyperparameter status."""
    return {
        "status": "operational",
        "model_loaded": inference_service.is_model_loaded,
        "model_path": inference_service.config.model_path,
        "seed": inference_service.config.seed,
        "state_dim": inference_service.config.state_dim,
        "action_dim": inference_service.config.action_dim,
        "device": str(inference_service.agent.device),
        "fallback_available": True,
    }


@router.get(
    "/benchmark-report",
    summary="Retrieve Latest Empirical Benchmark Summary",
    description="Returns the aggregated results, statistics, training history, and relative comparisons from the empirical benchmark run.",
)
async def get_benchmark_report():
    """Returns the latest empirical benchmark summary JSON, enriched with training history and experiment configuration."""
    from pathlib import Path
    import json

    base_dir = Path(__file__).resolve().parent.parent.parent
    results_dir = base_dir / "benchmarks" / "results"
    report_path = results_dir / "evaluation_results.json"
    if not report_path.exists():
        report_path = results_dir / "benchmark_summary.json"

    if not report_path.exists():
        report_path = Path("benchmarks/results/evaluation_results.json")
    if not report_path.exists():
        report_path = Path("benchmarks/results/benchmark_summary.json")

    if not report_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Benchmark report not found. Run benchmark experiment first."
        )

    with open(report_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Attach training history if available
    history_path = results_dir / "training_history.json"
    if not history_path.exists():
        history_path = Path("benchmarks/results/training_history.json")
    if history_path.exists():
        with open(history_path, "r", encoding="utf-8") as hf:
            data["training_history"] = json.load(hf)

    # Attach markdown report if available
    md_path = results_dir / "EVALUATION_REPORT.md"
    if not md_path.exists():
        md_path = results_dir / "BENCHMARK_REPORT.md"
    if not md_path.exists():
        md_path = Path("benchmarks/results/EVALUATION_REPORT.md")
    if not md_path.exists():
        md_path = Path("benchmarks/results/BENCHMARK_REPORT.md")
    if md_path.exists():
        with open(md_path, "r", encoding="utf-8") as mf:
            data["markdown_report"] = mf.read()

    # Attach hyperparameters from DQNConfig
    cfg = DQNConfig()
    data["training_config"] = {
        "state_dim": cfg.state_dim,
        "action_dim": cfg.action_dim,
        "hidden_dims": cfg.hidden_dims,
        "seed": cfg.seed,
        "episodes": cfg.episodes,
        "learning_rate": cfg.learning_rate,
        "gamma": cfg.gamma,
        "epsilon_start": cfg.epsilon_start,
        "epsilon_end": cfg.epsilon_end,
        "epsilon_decay": cfg.epsilon_decay,
        "batch_size": cfg.batch_size,
        "target_update_frequency": cfg.target_update_frequency,
        "replay_capacity": cfg.replay_capacity,
    }

    return data


@router.get(
    "/evaluation-results",
    summary="Retrieve Phase 18 Comprehensive Scientific Evaluation Results",
    description="Returns machine-readable 5-seed evaluation metrics, baseline trade-offs, and stability statistics.",
)
async def get_evaluation_results():
    """Alias for comprehensive evaluation results."""
    return await get_benchmark_report()


@router.get(
    "/training-history",
    summary="Retrieve DQN Training Trajectory History",
    description="Returns the per-episode reward, loss, epsilon, and action counts from training.",
)
async def get_training_history():
    """Returns the per-episode training history list."""
    from pathlib import Path
    import json
    base_dir = Path(__file__).resolve().parent.parent.parent
    history_path = base_dir / "benchmarks" / "results" / "training_history.json"
    if not history_path.exists():
        history_path = Path("benchmarks/results/training_history.json")
    if not history_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Training history not found. Train DQN agent first."
        )
    with open(history_path, "r", encoding="utf-8") as f:
        return json.load(f)


