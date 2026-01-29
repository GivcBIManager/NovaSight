# Developer Documentation

Welcome to the NovaSight developer documentation. This guide is for developers who want to contribute to NovaSight or understand its internal architecture.

## 📚 Documentation Overview

| Document | Description |
|----------|-------------|
| [Architecture Overview](architecture.md) | System architecture, components, and design decisions |
| [Local Development Setup](setup.md) | Getting your local environment running |
| [Contributing Guide](contributing.md) | How to contribute code, submit PRs, and follow our processes |
| [Coding Standards](coding-standards.md) | Code style, conventions, and best practices |
| [Testing Guide](testing-guide.md) | Writing and running tests |
| [ADR Index](adr/README.md) | Architecture Decision Records |
| [Deployment Guide](deployment/README.md) | Kubernetes, Helm, and production deployment |

## 🏗️ Quick Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend                                 │
│                    React + TypeScript                           │
│                    (Vite, Shadcn/UI)                           │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTPS
┌─────────────────────────┴───────────────────────────────────────┐
│                    API Gateway / Load Balancer                   │
│                        (NGINX / K8s Ingress)                    │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────────┐
│                      Backend Services                            │
│                    Flask + Python 3.11                          │
└─────────┬─────────────┬─────────────┬───────────────────────────┘
          │             │             │
┌─────────┴───┐ ┌───────┴───┐ ┌───────┴───────┐
│  PostgreSQL │ │ ClickHouse│ │     Redis     │
│  (Metadata) │ │  (OLAP)   │ │   (Cache)     │
└─────────────┘ └───────────┘ └───────────────┘
```

## 🚀 Getting Started

### Prerequisites

- **Python 3.11+** - Backend development
- **Node.js 20+** - Frontend development
- **Docker & Docker Compose** - Infrastructure services
- **Git** - Version control

### Quick Start

```bash
# Clone the repository
git clone https://github.com/novasight/novasight.git
cd novasight

# Start infrastructure services
docker compose -f docker-compose.yml up -d

# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt -r requirements-dev.txt
flask db upgrade
flask run --reload

# Frontend setup (new terminal)
cd frontend
npm install
npm run dev
```

👉 See [Local Development Setup](setup.md) for detailed instructions.

## 🔑 Key Concepts

### Template Engine Architecture (ADR-002)

**Critical**: NovaSight does NOT generate arbitrary code. All executable artifacts (DAGs, PySpark jobs, dbt models) are generated from pre-approved Jinja2 templates.

```
User Request → LLM → Parameters → Template Engine → Validated Code
                ↑                         ↓
            Parameters Only        Pre-approved Templates
```

This ensures:
- **Security**: No code injection vulnerabilities
- **Auditability**: All templates are security-reviewed
- **Consistency**: Predictable, governable outputs

### Multi-Tenancy Model

| Layer | Isolation Strategy |
|-------|-------------------|
| PostgreSQL | Schema-per-tenant |
| ClickHouse | Database-per-tenant |
| Redis | Key prefix per tenant |
| Airflow | Namespace per tenant |

## 📁 Project Structure

```
novasight/
├── backend/                 # Flask application
│   ├── app/
│   │   ├── api/            # API endpoints (Blueprints)
│   │   ├── models/         # SQLAlchemy models
│   │   ├── services/       # Business logic
│   │   ├── connectors/     # Data source connectors
│   │   ├── templates/      # Jinja2 code templates
│   │   └── utils/          # Utilities
│   ├── migrations/         # Alembic migrations
│   └── tests/              # Test suite
│
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom hooks
│   │   ├── stores/         # Zustand stores
│   │   └── api/            # API client
│   └── e2e/                # Playwright tests
│
├── dbt/                    # dbt project
│   └── models/             # dbt models
│
├── k8s/                    # Kubernetes manifests
├── helm/                   # Helm charts
├── monitoring/             # Prometheus, Grafana
├── logging/                # Loki, Promtail
└── docs/                   # Documentation
```

## 🔗 Quick Links

- [API Documentation](../api/index.md)
- [Testing Guide](../TESTING_GUIDE.md)
- [Architecture Decision Records](../requirements/Architecture_Decisions.md)
- [Troubleshooting](../troubleshooting/common-issues.md)

## 💬 Getting Help

- **GitHub Issues**: [Report bugs or request features](https://github.com/novasight/novasight/issues)
- **Discussions**: [Ask questions](https://github.com/novasight/novasight/discussions)
- **Discord**: [Join our community](https://discord.gg/novasight)
- **Email**: developers@novasight.io

---

*NovaSight Developer Documentation v1.0*
