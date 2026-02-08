"""
NovaSight Orchestration Domain — Validators
=============================================

Business-rule validation for DAG configurations.

Canonical location: ``app.domains.orchestration.domain.validators``
"""

from typing import Dict, Any, List, Optional

from app.domains.orchestration.domain.models import DagConfig, TaskConfig, ScheduleType
import logging

logger = logging.getLogger(__name__)


class DagValidator:
    """Validates DAG configurations before deployment."""

    def validate(self, dag_config: DagConfig) -> Dict[str, Any]:
        """
        Validate a DAG configuration.

        Args:
            dag_config: DAG configuration to validate

        Returns:
            Validation result with ``valid``, ``errors``, ``warnings``
        """
        errors: List[Dict[str, str]] = []
        warnings: List[Dict[str, str]] = []

        # Validate DAG ID
        if not dag_config.dag_id:
            errors.append({"field": "dag_id", "message": "DAG ID is required"})
        elif not dag_config.dag_id[0].isalpha():
            errors.append({"field": "dag_id", "message": "DAG ID must start with a letter"})

        # Validate schedule
        if dag_config.schedule_type == ScheduleType.CRON:
            if not dag_config.schedule_cron:
                errors.append({
                    "field": "schedule_cron",
                    "message": "CRON expression required for cron schedule type",
                })
            else:
                cron_error = self._validate_cron(dag_config.schedule_cron)
                if cron_error:
                    errors.append({"field": "schedule_cron", "message": cron_error})

        # Validate tasks
        if not dag_config.tasks:
            errors.append({"field": "tasks", "message": "At least one task is required"})
        else:
            task_errors = self._validate_tasks(dag_config.tasks)
            errors.extend(task_errors)

        # Check for circular dependencies
        cycle = self._detect_cycles(dag_config.tasks)
        if cycle:
            errors.append({
                "field": "tasks",
                "message": f"Circular dependency detected: {' -> '.join(cycle)}",
            })

        # Validate notifications
        if dag_config.email_on_failure and not dag_config.notification_emails:
            warnings.append({
                "field": "notification_emails",
                "message": "Email on failure is enabled but no notification emails configured",
            })

        # Validate start date
        if not dag_config.start_date:
            warnings.append({
                "field": "start_date",
                "message": "Start date not set, DAG may not run as expected",
            })

        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
        }

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _validate_cron(self, cron_expr: str) -> Optional[str]:
        """Validate CRON expression format."""
        parts = cron_expr.strip().split()
        if len(parts) != 5:
            return "CRON expression must have 5 parts (minute hour day month weekday)"

        valid_chars = set("0123456789*,-/")
        for part in parts:
            if not all(c in valid_chars for c in part):
                return f"Invalid character in CRON expression: {part}"

        return None

    def _validate_tasks(self, tasks: List[TaskConfig]) -> List[Dict[str, str]]:
        """Validate task configurations."""
        errors: List[Dict[str, str]] = []
        task_ids: set = set()

        for task in tasks:
            # Duplicate task IDs
            if task.task_id in task_ids:
                errors.append({
                    "field": f"tasks.{task.task_id}",
                    "message": f"Duplicate task ID: {task.task_id}",
                })
            task_ids.add(task.task_id)

            # Task ID format
            if not task.task_id:
                errors.append({"field": "tasks", "message": "Task ID is required"})
            elif not task.task_id[0].isalpha():
                errors.append({
                    "field": f"tasks.{task.task_id}",
                    "message": "Task ID must start with a letter",
                })

            # Timeout bounds
            if task.timeout_minutes < 1 or task.timeout_minutes > 1440:
                errors.append({
                    "field": f"tasks.{task.task_id}.timeout_minutes",
                    "message": "Timeout must be between 1 and 1440 minutes",
                })

            # Retries bounds
            if task.retries < 0 or task.retries > 5:
                errors.append({
                    "field": f"tasks.{task.task_id}.retries",
                    "message": "Retries must be between 0 and 5",
                })

        # Dependencies must reference existing tasks
        for task in tasks:
            for dep in task.depends_on:
                if dep not in task_ids:
                    errors.append({
                        "field": f"tasks.{task.task_id}.depends_on",
                        "message": f"Dependency '{dep}' not found",
                    })

        return errors

    def _detect_cycles(self, tasks: List[TaskConfig]) -> Optional[List[str]]:
        """Detect circular dependencies in task graph using DFS."""
        from collections import defaultdict

        graph = defaultdict(list)
        task_ids = {t.task_id for t in tasks}

        for task in tasks:
            for dep in task.depends_on:
                if dep in task_ids:
                    graph[dep].append(task.task_id)

        visited: set = set()
        rec_stack: set = set()
        path: list = []

        def dfs(node: str) -> Optional[List[str]]:
            visited.add(node)
            rec_stack.add(node)
            path.append(node)

            for neighbor in graph[node]:
                if neighbor not in visited:
                    result = dfs(neighbor)
                    if result:
                        return result
                elif neighbor in rec_stack:
                    cycle_start = path.index(neighbor)
                    return path[cycle_start:] + [neighbor]

            rec_stack.remove(node)
            path.pop()
            return None

        for task in tasks:
            if task.task_id not in visited:
                cycle = dfs(task.task_id)
                if cycle:
                    return cycle

        return None
