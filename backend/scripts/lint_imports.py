"""
Cross-Domain Import Linter
============================

Enforces the modular monolith boundary rule:

    **No domain may import from another domain's ``domain`` or
    ``application`` layer.**

Allowed cross-domain paths are:
  - ``app.domains.<other>.domain.interfaces``  (interface contracts)
  - ``app.platform.*``                         (shared platform code)
  - ``app.extensions``, ``app.errors``, etc.   (framework glue)

Usage::

    python -m scripts.lint_imports          # from backend/
    python scripts/lint_imports.py          # direct

Exit codes:
  0  — no violations
  1  — violations found (printed to stderr)
"""

from __future__ import annotations

import ast
import os
import re
import sys
from pathlib import Path
from typing import List, NamedTuple, Set

# ── Configuration ─────────────────────────────────────────────────

DOMAINS_ROOT = Path(__file__).resolve().parent.parent / "app" / "domains"

# Regex to extract domain name from an import path:
#   app.domains.<domain>.<layer>...
_DOMAIN_IMPORT_RE = re.compile(
    r"^app\.domains\.(?P<domain>[a-z_]+)\.(?P<layer>[a-z_]+)"
)

# Layers whose internals are off-limits to other domains
PRIVATE_LAYERS = {"domain", "application", "infrastructure"}

# The only sub-module inside a foreign domain layer that *is* allowed
ALLOWED_FOREIGN_SUBMODULES = {"interfaces"}

# Known cross-domain dependencies that are accepted (documented exceptions).
# Format: (source_domain, import_path_prefix)
# These will be reported as warnings (not violations) when --strict is used.
ACCEPTED_EXCEPTIONS = {
    # AI domain injects QueryBuilder + SemanticService via constructor DI
    ("ai", "app.domains.analytics.infrastructure.query_builder"),
    ("ai", "app.domains.transformation.application.semantic_service"),
    # Identity resolves Tenant via lazy import inside a method
    ("identity", "app.domains.tenants.domain.models"),
    # Transformation uses ClickHouse (shared infra — candidate for platform/)
    ("transformation", "app.domains.analytics.infrastructure.clickhouse_client"),
}

# Domains we scan
ALL_DOMAINS: Set[str] = set()


class Violation(NamedTuple):
    file: str
    line: int
    source_domain: str
    target_domain: str
    target_layer: str
    import_path: str
    accepted: bool  # True if in ACCEPTED_EXCEPTIONS


# ── AST visitor ───────────────────────────────────────────────────

def _extract_imports(source: str) -> List[tuple[int, str]]:
    """Return (lineno, dotted_path) for every import in *source*."""
    results: list[tuple[int, str]] = []
    try:
        tree = ast.parse(source)
    except SyntaxError:
        return results

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                results.append((node.lineno, alias.name))
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                results.append((node.lineno, node.module))
    return results


def _check_file(filepath: Path, source_domain: str) -> List[Violation]:
    """Check a single Python file for illegal cross-domain imports."""
    violations: list[Violation] = []
    try:
        source = filepath.read_text(encoding="utf-8")
    except Exception:
        return violations

    for lineno, import_path in _extract_imports(source):
        m = _DOMAIN_IMPORT_RE.match(import_path)
        if not m:
            continue

        target_domain = m.group("domain")
        target_layer = m.group("layer")

        # Same domain — always OK
        if target_domain == source_domain:
            continue

        # Foreign domain — only interfaces sub-module is allowed
        if target_layer in PRIVATE_LAYERS:
            # e.g. app.domains.datasources.domain.interfaces → OK
            remainder = import_path[m.end():]  # ".interfaces" or ".models" etc.
            submodule = remainder.lstrip(".").split(".")[0] if remainder.lstrip(".") else ""
            if submodule not in ALLOWED_FOREIGN_SUBMODULES:
                is_accepted = any(
                    source_domain == exc_domain and import_path.startswith(exc_prefix)
                    for exc_domain, exc_prefix in ACCEPTED_EXCEPTIONS
                )
                violations.append(
                    Violation(
                        file=str(filepath),
                        line=lineno,
                        source_domain=source_domain,
                        target_domain=target_domain,
                        target_layer=target_layer,
                        import_path=import_path,
                        accepted=is_accepted,
                    )
                )
    return violations


# ── Scanner ───────────────────────────────────────────────────────

def scan_all() -> List[Violation]:
    """Scan every domain for illegal cross-domain imports."""
    all_violations: list[Violation] = []

    if not DOMAINS_ROOT.is_dir():
        print(f"WARNING: domains root not found: {DOMAINS_ROOT}", file=sys.stderr)
        return all_violations

    for domain_dir in sorted(DOMAINS_ROOT.iterdir()):
        if not domain_dir.is_dir() or domain_dir.name.startswith("_"):
            continue
        ALL_DOMAINS.add(domain_dir.name)

        for py_file in domain_dir.rglob("*.py"):
            violations = _check_file(py_file, domain_dir.name)
            all_violations.extend(violations)

    return all_violations


# ── CLI entry point ───────────────────────────────────────────────

def main() -> int:
    violations = scan_all()

    real = [v for v in violations if not v.accepted]
    accepted = [v for v in violations if v.accepted]

    if accepted:
        print(f"ℹ {len(accepted)} accepted cross-domain dependency(ies):")
        for v in accepted:
            rel = os.path.relpath(v.file, DOMAINS_ROOT.parent.parent)
            print(f"  {rel}:{v.line}  {v.source_domain} → {v.target_domain}.{v.target_layer}")
        print()

    if not real:
        print(f"✓ No cross-domain import violations found (scanned {len(ALL_DOMAINS)} domains)")
        return 0

    print(
        f"✗ {len(real)} cross-domain import violation(s) found:\n",
        file=sys.stderr,
    )
    for v in real:
        rel = os.path.relpath(v.file, DOMAINS_ROOT.parent.parent)
        print(
            f"  {rel}:{v.line}  "
            f"{v.source_domain} → {v.target_domain}.{v.target_layer}  "
            f"({v.import_path})",
            file=sys.stderr,
        )

    print(
        f"\nFix: import from app.domains.<domain>.domain.interfaces instead, "
        f"or move shared code to app.platform/.",
        file=sys.stderr,
    )
    return 1


if __name__ == "__main__":
    sys.exit(main())
