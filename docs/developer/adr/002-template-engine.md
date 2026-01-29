# ADR-002: Template-Filling Architecture

## Status

✅ **Accepted**

## Summary

NovaSight uses a **Template Engine Architecture** with Jinja2 templates and strict input validation. **No arbitrary code is ever generated.**

## Context

The core security requirement mandates that NovaSight **never generates arbitrary code** from user input or LLM responses. All executable artifacts must be produced by filling pre-approved, security-audited templates.

This constraint exists because:

1. **Security**: Arbitrary code generation creates injection vulnerabilities
2. **Auditability**: Pre-approved templates can be security-reviewed
3. **Consistency**: All generated artifacts follow approved patterns
4. **Governance**: Changes to execution logic require explicit template updates

## Decision

Implement a Template Engine Architecture using **Jinja2 templates** with:

- Strict input validation (Pydantic schemas)
- Parameterized variable injection
- No user content in templates
- Sandboxed template execution

## Architecture

```
User Input → Validation → Parameters → Template Engine → Safe Code
     │            │                          │
     │      Schema checks              Pre-approved
     │      Regex validation           templates only
     │      Allowlist validation
     ▼
   Rejected if invalid
```

## Template Categories

```
templates/
├── pyspark/           # Data ingestion templates
│   ├── base_ingestion.py.j2
│   ├── scd_type1.py.j2
│   └── scd_type2.py.j2
│
├── airflow/           # DAG templates
│   ├── dag_base.py.j2
│   ├── task_spark_submit.py.j2
│   └── task_dbt_run.py.j2
│
└── dbt/               # Transformation templates
    ├── model_base.sql.j2
    └── schema.yml.j2
```

## Input Validation Example

```python
class IngestionJobConfig(BaseModel):
    job_name: str = Field(regex=r'^[a-z][a-z0-9_]{2,63}$')
    source_table: str = Field(regex=r'^[a-zA-Z_][a-zA-Z0-9_]*$')
    target_table: str = Field(regex=r'^[a-z][a-z0-9_]{2,63}$')
    write_mode: Literal['overwrite', 'append', 'merge']
```

## Security Guarantees

| Threat | Mitigation |
|--------|------------|
| SQL Injection | Identifiers validated against regex |
| Code Injection | No `eval()` or `exec()`, templates are static |
| Path Traversal | Output paths constructed server-side |
| Template Injection | Jinja2 sandboxed, no user content |
| Privilege Escalation | Generated code runs with job credentials |

## Consequences

### Positive
- Security-auditable: All templates can be reviewed
- Predictable: Generated artifacts follow known patterns
- Governable: Template changes require approval

### Negative
- Flexibility constrained: Users cannot create arbitrary logic
- Template maintenance: New use cases require template development

### Mitigations
- Comprehensive template library covering 95% of use cases
- Enterprise tier: Custom template uploads (platform admin approved)

---

*Full details: [Architecture Decisions](../../requirements/Architecture_Decisions.md#adr-002-template-filling-architecture)*
