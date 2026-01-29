# ADR-004: AI Integration Architecture

## Status

✅ **Accepted**

## Summary

Implement a **Constrained AI Query Generation** architecture using Ollama (local LLMs) with dynamic system prompts and server-side query execution.

## Context

NovaSight integrates AI capabilities for natural language data exploration. The AI must:

- Respect Row-Level Security (RLS) policies
- Not leak cross-tenant data
- Generate only SELECT queries (read-only)
- Provide transparency on generated SQL

## Decision

Use **Ollama** with local LLMs (CodeLlama or similar) with:

- Dynamic system prompts built from semantic layer metadata
- Server-side SQL validation
- RLS injection before execution
- Query limits and timeouts

## Architecture

```
User: "What were our top products last month?"
                    │
                    ▼
┌───────────────────────────────────────┐
│ 1. CONTEXT BUILDER                    │
│    • Available tables (RLS-filtered)  │
│    • Column descriptions              │
│    • Business context                 │
│    • Strict: SELECT only              │
└───────────────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│ 2. OLLAMA LLM                         │
│    Model: codellama:13b               │
│    Generates SQL from context         │
└───────────────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│ 3. SQL VALIDATOR                      │
│    • Parse with sqlparse              │
│    • Reject if not SELECT             │
│    • Check for forbidden functions    │
│    • Apply complexity limits          │
└───────────────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│ 4. RLS INJECTION                      │
│    Wrap query with security filters   │
└───────────────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│ 5. QUERY EXECUTION                    │
│    • Tenant database scope            │
│    • Read-only connection             │
│    • 30-second timeout                │
│    • 10,000 row limit                 │
└───────────────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│ 6. RESPONSE                           │
│    • Generated SQL (transparency)     │
│    • Query results                    │
│    • Natural language summary         │
│    • Suggested follow-ups             │
└───────────────────────────────────────┘
```

## Security Controls

| Control | Implementation |
|---------|----------------|
| Query Type | Only SELECT statements allowed |
| RLS | Server-side injection, cannot be bypassed |
| Table Access | System prompt only includes authorized tables |
| Query Limits | 30s timeout, 10K row limit |
| Audit | All AI queries logged |
| Rate Limiting | Per-user, per-tenant limits |

## SQL Validation Example

```python
def validate_sql(sql: str, allowed_tables: List[str]) -> bool:
    parsed = sqlparse.parse(sql)[0]
    
    # Must be SELECT
    if parsed.get_type() != 'SELECT':
        raise InvalidQueryError("Only SELECT queries allowed")
    
    # Check for forbidden functions
    forbidden = ['SLEEP', 'BENCHMARK', 'LOAD_FILE']
    for token in parsed.flatten():
        if token.ttype is Keyword and token.value.upper() in forbidden:
            raise InvalidQueryError(f"Forbidden function: {token.value}")
    
    return True
```

## RLS Injection Example

```python
def inject_rls(sql: str, rls_conditions: str) -> str:
    return f"""
    SELECT * FROM (
        {sql}
    ) AS user_query
    WHERE {rls_conditions}
    LIMIT 10000
    """
```

## Consequences

### Positive
- Users can query data in natural language
- RLS enforced at server level
- Complete audit trail of AI queries
- Transparent: users see generated SQL

### Negative
- LLM can generate incorrect SQL
- Additional latency for AI processing
- Resource usage for local LLM

### Mitigations
- SQL validation catches invalid queries
- Streaming responses for perceived performance
- GPU support for faster inference

---

*Full details: [Architecture Decisions](../../requirements/Architecture_Decisions.md#adr-004-ai-integration-architecture)*
