# src/agents/telegram_bridge.py
from typing import Dict, List, Optional


STATUS_EMOJI = {
    "green": "\U0001f7e2",
    "yellow": "\U0001f7e1",
    "red": "\U0001f534",
}

COMMANDS_HELP = {
    "/scan": "Scan for new tokens",
    "/score": "Score a token: /score <contract_address> <chain>",
    "/health": "System health check",
    "/boot": "Boot status report",
    "/pipeline": "Pipeline stage counts",
    "/tasks": "Active/failed/done task counts",
    "/retry": "List retryable failed tasks",
    "/experience": "Last 5 learned patterns",
    "/status": "Combined health + pipeline + tasks overview",
    "/help": "Show this help message",
}


class TelegramBridge:
    """Maps Telegram bot commands to OrchestratorAgent.execute() calls.

    Pure command parser/formatter — does NOT import any Telegram SDK.
    The actual sending is handled by OpenClaw's built-in Telegram integration.
    """

    def __init__(self, orchestrator, chat_id: int):
        self.orchestrator = orchestrator
        self.chat_id = chat_id

    async def handle_command(self, command_str: str) -> str:
        parts = command_str.strip().split()
        cmd = parts[0].lower() if parts else ""
        args = parts[1:] if len(parts) > 1 else []

        handler = {
            "/scan": self._handle_scan,
            "/score": self._handle_score,
            "/health": self._handle_health,
            "/boot": self._handle_boot,
            "/pipeline": self._handle_pipeline,
            "/tasks": self._handle_tasks,
            "/retry": self._handle_retry,
            "/experience": self._handle_experience,
            "/status": self._handle_status,
            "/help": self._handle_help,
        }.get(cmd)

        if handler is None:
            return self._handle_unknown(cmd)

        return await handler(args)

    # ------------------------------------------------------------------
    # Command handlers
    # ------------------------------------------------------------------

    async def _handle_scan(self, args: List[str]) -> str:
        try:
            result = await self.orchestrator.execute({"mode": "scan"})
            return self.orchestrator.format_scan_result(result)
        except Exception as e:
            return f"\U0001f534 Error running scan: {e}"

    async def _handle_score(self, args: List[str]) -> str:
        if len(args) < 2:
            return "Usage: /score <contract_address> <chain>\nExample: /score 0xABC123 ethereum"
        contract_address = args[0]
        chain = args[1]
        try:
            result = await self.orchestrator.execute({
                "mode": "evaluate",
                "token_data": {
                    "token_address": contract_address,
                    "chain": chain,
                },
                "depth": "standard",
            })
            return self.orchestrator.format_evaluate_result(result)
        except Exception as e:
            return f"\U0001f534 Error scoring token: {e}"

    async def _handle_health(self, args: List[str]) -> str:
        try:
            result = await self.orchestrator.execute({"mode": "health"})
            return self.format_health_report(result)
        except Exception as e:
            return f"\U0001f534 Error checking health: {e}"

    async def _handle_boot(self, args: List[str]) -> str:
        try:
            result = await self.orchestrator.execute({"mode": "boot"})
            return self.format_boot_report(result)
        except Exception as e:
            return f"\U0001f534 Error running boot: {e}"

    async def _handle_pipeline(self, args: List[str]) -> str:
        mm = self.orchestrator.memory_manager
        if mm is None:
            return "\U0001f534 Pipeline unavailable: memory_manager not configured"
        summary = mm.get_pipeline_summary()
        return self.format_pipeline_summary(summary)

    async def _handle_tasks(self, args: List[str]) -> str:
        tr = self.orchestrator.task_registry
        if tr is None:
            return "\U0001f534 Tasks unavailable: task_registry not configured"
        summary = tr.get_summary()
        return self._format_tasks_summary(summary)

    async def _handle_retry(self, args: List[str]) -> str:
        tr = self.orchestrator.task_registry
        if tr is None:
            return "\U0001f534 Retry unavailable: task_registry not configured"
        retryable = tr.get_retryable()
        if not retryable:
            return "\u2705 No retryable failed tasks"
        lines = ["\U0001f504 *Retryable Tasks:*", ""]
        for task in retryable:
            agent = task.get("agent_name", "unknown")
            error = task.get("error", "unknown error")
            retries = task.get("retry_count", 0)
            lines.append(f"\u2022 *{agent}* \u2014 {error} (retries: {retries})")
        return "\n".join(lines)

    async def _handle_experience(self, args: List[str]) -> str:
        mm = self.orchestrator.memory_manager
        if mm is None:
            return "\U0001f534 Experience unavailable: memory_manager not configured"
        patterns = mm.read_experience()
        if not patterns:
            return "\U0001f4ad No experience patterns learned yet"
        last_5 = patterns[-5:]
        lines = ["\U0001f9e0 *Recent Experience Patterns:*", ""]
        for p in last_5:
            pattern = p.get("pattern", "unknown")
            lines.append(f"\u2022 {pattern}")
        return "\n".join(lines)

    async def _handle_status(self, args: List[str]) -> str:
        return await self.format_status_overview()

    async def _handle_help(self, args: List[str]) -> str:
        lines = ["\U0001f916 *Ogie Commands:*", ""]
        for cmd, desc in COMMANDS_HELP.items():
            lines.append(f"{cmd} \u2014 {desc}")
        return "\n".join(lines)

    # ------------------------------------------------------------------
    # Format methods
    # ------------------------------------------------------------------

    def format_health_report(self, report: Dict) -> str:
        overall = report.get("overall", "unknown")
        emoji = STATUS_EMOJI.get(overall, "\u26aa")
        components = report.get("components", {})

        lines = [f"{emoji} *Health Report: {overall.upper()}*", ""]

        tasks = components.get("tasks", {})
        tasks_emoji = STATUS_EMOJI.get(tasks.get("status", "green"), "\u26aa")
        lines.append(f"{tasks_emoji} Tasks: {tasks.get('stale_count', 0)} stale")

        crons = components.get("crons", {})
        crons_emoji = STATUS_EMOJI.get(crons.get("status", "green"), "\u26aa")
        lines.append(f"{crons_emoji} Crons: {crons.get('total', 0)} loaded, {crons.get('missing', 0)} missing")

        scans = components.get("scans", {})
        scans_emoji = STATUS_EMOJI.get(scans.get("status", "green"), "\u26aa")
        hours = scans.get("hours_ago")
        if hours is not None:
            lines.append(f"{scans_emoji} Last scan: {hours:.1f}h ago")
        else:
            lines.append(f"{scans_emoji} Last scan: none")

        pipeline = components.get("pipeline", {})
        if pipeline:
            stages = ", ".join(f"{k}: {v}" for k, v in pipeline.items())
            lines.append(f"\U0001f4e6 Pipeline: {stages}")

        return "\n".join(lines)

    def format_boot_report(self, report: Dict) -> str:
        status = report.get("status", "unknown")
        emoji = STATUS_EMOJI.get(status, "\u26aa")

        lines = [
            f"{emoji} *Boot Report*",
            "",
            f"Crons: {report.get('crons_found', 0)}/{report.get('crons_expected', 0)}",
            f"Experience patterns: {report.get('experience_loaded', 0)}",
            f"Pipeline prospects: {report.get('pipeline_loaded', 0)}",
        ]

        missing = report.get("crons_missing", [])
        if missing:
            lines.append(f"\n\u26a0\ufe0f Missing crons: {', '.join(missing[:10])}")

        return "\n".join(lines)

    def format_pipeline_summary(self, summary: Dict[str, int]) -> str:
        if not summary:
            return "\U0001f4e6 *Pipeline:* empty \u2014 no prospects in pipeline"
        total = sum(summary.values())
        lines = [f"\U0001f4e6 *Pipeline Summary* ({total} total)", ""]
        for stage, count in summary.items():
            lines.append(f"\u2022 {stage}: {count}")
        return "\n".join(lines)

    async def format_status_overview(self) -> str:
        hm = self.orchestrator.health_monitor
        mm = self.orchestrator.memory_manager
        tr = self.orchestrator.task_registry

        if hm is None:
            return "\U0001f534 Status unavailable: health_monitor not configured"

        lines = ["\U0001f4ca *Status Overview*", ""]

        # Health
        health_report = hm.full_health_check()
        overall = health_report.get("overall", "unknown")
        emoji = STATUS_EMOJI.get(overall, "\u26aa")
        lines.append(f"{emoji} *Health:* {overall.upper()}")

        # Pipeline
        if mm is not None:
            pipeline = mm.get_pipeline_summary()
            if pipeline:
                stages = ", ".join(f"{k}: {v}" for k, v in pipeline.items())
                lines.append(f"\U0001f4e6 *Pipeline:* {stages}")
            else:
                lines.append("\U0001f4e6 *Pipeline:* empty")
        else:
            lines.append("\U0001f4e6 *Pipeline:* not configured")

        # Tasks
        if tr is not None:
            task_summary = tr.get_summary()
            q = task_summary.get("queued", 0)
            r = task_summary.get("running", 0)
            d = task_summary.get("done", 0)
            f = task_summary.get("failed", 0)
            lines.append(f"\U0001f4cb *Tasks:* {q} queued, {r} running, {d} done, {f} failed")
        else:
            lines.append("\U0001f4cb *Tasks:* not configured")

        return "\n".join(lines)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _format_tasks_summary(self, summary: Dict[str, int]) -> str:
        q = summary.get("queued", 0)
        r = summary.get("running", 0)
        d = summary.get("done", 0)
        f = summary.get("failed", 0)
        total = q + r + d + f
        lines = [
            f"\U0001f4cb *Task Summary* ({total} total)",
            "",
            f"\u23f3 Queued: {q}",
            f"\u25b6\ufe0f Running: {r}",
            f"\u2705 Done: {d}",
            f"\u274c Failed: {f}",
        ]
        return "\n".join(lines)

    def _handle_unknown(self, cmd: str) -> str:
        return f"Unknown command: {cmd}\nType /help to see available commands"
