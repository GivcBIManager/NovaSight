# Architecture Decision Records (ADR)

This directory contains summaries of the Architecture Decision Records for NovaSight. For the complete, detailed ADRs, see [Architecture Decisions](../../requirements/Architecture_Decisions.md).

## What is an ADR?

An Architecture Decision Record (ADR) captures an important architectural decision made along with its context and consequences. ADRs help:

- Document the reasoning behind decisions
- Communicate decisions to team members
- Provide context for future maintainers
- Track the evolution of the architecture

## ADR Index

| ADR | Title | Status | Summary |
|-----|-------|--------|---------|
| [ADR-001](001-metadata-store.md) | Metadata Store Selection | ✅ Accepted | PostgreSQL for tenant metadata |
| [ADR-002](002-template-engine.md) | Template-Filling Architecture | ✅ Accepted | Jinja2 templates for code generation |
| [ADR-003](003-multi-tenancy.md) | Multi-Tenant Isolation | ✅ Accepted | Schema-per-tenant isolation |
| [ADR-004](004-ai-integration.md) | AI Integration Architecture | ✅ Accepted | Ollama with constrained SQL generation |
| [ADR-005](005-template-catalog.md) | Template Catalog | ✅ Accepted | Pre-approved template library |

## ADR Template

When proposing a new ADR, use this template:

```markdown
# ADR-XXX: [Title]

## Status

[Proposed | Accepted | Deprecated | Superseded by ADR-YYY]

## Context

What is the issue that we're seeing that is motivating this decision or change?

## Decision

What is the change that we're proposing and/or doing?

## Consequences

What becomes easier or more difficult to do because of this change?

### Positive
- Benefit 1
- Benefit 2

### Negative
- Drawback 1
- Drawback 2

### Mitigations
- How we address the drawbacks
```

## Decision Process

1. **Proposal**: Create a new ADR document with status "Proposed"
2. **Review**: Technical lead reviews and discusses with the team
3. **Decision**: Accept, modify, or reject the proposal
4. **Implementation**: Update status and implement the decision
5. **Evolution**: Update or supersede as the system evolves

## Key Architectural Principles

These principles guide all architectural decisions:

1. **Security First**: The Template Engine Rule (ADR-002) ensures no arbitrary code generation
2. **Tenant Isolation**: Complete data separation between tenants (ADR-003)
3. **Scalability**: Designed for horizontal scaling from day one
4. **Observability**: Built-in monitoring, logging, and tracing
5. **Simplicity**: Prefer simple, well-understood solutions

## Quick Reference

### Template Engine Rule (ADR-002)

> **Critical**: NovaSight NEVER generates arbitrary code from user input or LLM responses. All executable artifacts must be produced by filling pre-approved, security-audited templates.

```
User Input → Validation → Parameters → Template Engine → Safe Code
                                              ↑
                                     Pre-approved Templates
```

### Multi-Tenancy Model (ADR-003)

| Component | Isolation Strategy |
|-----------|-------------------|
| PostgreSQL | Schema-per-tenant |
| ClickHouse | Database-per-tenant |
| Redis | Key prefix per tenant |
| Airflow | Namespace per tenant |

---

*See the [full Architecture Decisions document](../../requirements/Architecture_Decisions.md) for detailed records.*
