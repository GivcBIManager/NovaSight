# Local Development Setup

This guide will help you set up NovaSight for local development on your machine.

## Prerequisites

### Required Software

| Software | Version | Purpose | Installation |
|----------|---------|---------|--------------|
| **Python** | 3.11+ | Backend development | [python.org](https://www.python.org/downloads/) |
| **Node.js** | 20+ | Frontend development | [nodejs.org](https://nodejs.org/) |
| **Docker** | 24+ | Infrastructure services | [docker.com](https://www.docker.com/get-started) |
| **Docker Compose** | 2.20+ | Service orchestration | Included with Docker Desktop |
| **Git** | 2.40+ | Version control | [git-scm.com](https://git-scm.com/) |

### Verify Installation

```bash
# Check versions
python --version    # Python 3.11+
node --version      # v20+
npm --version       # 10+
docker --version    # 24+
docker compose version
git --version
```

### Recommended Tools

| Tool | Purpose |
|------|---------|
| **VS Code** | IDE with excellent Python/TypeScript support |
| **DBeaver** | Database management (PostgreSQL, ClickHouse) |
| **Postman** | API testing |
| **TablePlus** | Alternative database client |

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/novasight/novasight.git
cd novasight
```

### 2. Start Infrastructure Services

```bash
# Start all required services
docker compose up -d

# Verify services are running
docker compose ps
```

This starts:

| Service | Port | Description |
|---------|------|-------------|
| PostgreSQL | 5432 | Metadata store |
| ClickHouse | 8123 (HTTP), 9000 (Native) | OLAP database |
| Redis | 6379 | Cache and sessions |
| Ollama | 11434 | Local LLM for NL-to-SQL |

### 3. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your settings (see Environment Variables section)

# Run database migrations
flask db upgrade

# Seed development data
flask seed dev

# Start the development server
flask run --reload
```

The backend API will be available at: `http://localhost:5000`

### 4. Frontend Setup

Open a new terminal:

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at: `http://localhost:5173`

### 5. Pull Ollama Model

```bash
# Pull the CodeLlama model for NL-to-SQL
docker compose exec ollama ollama pull codellama:13b

# Verify model is available
docker compose exec ollama ollama list
```

### 6. Verify Setup

1. **Frontend**: Open `http://localhost:5173`
2. **Backend API**: Open `http://localhost:5000/api/v1`
3. **API Documentation**: Open `http://localhost:5000/api/v1/docs`

Login with development credentials:
- **Email**: `admin@dev.novasight.io`
- **Password**: `DevPassword123!`

## Environment Variables

### Backend (.env)

Create a `.env` file in the `backend/` directory:

```bash
# Flask
FLASK_APP=run.py
FLASK_ENV=development
SECRET_KEY=your-secret-key-change-in-production

# Database
DATABASE_URL=postgresql://novasight:novasight@localhost:5432/novasight
CLICKHOUSE_URL=clickhouse://default:@localhost:8123/default

# Redis
REDIS_URL=redis://localhost:6379/0

# JWT
JWT_SECRET_KEY=your-jwt-secret-change-in-production
JWT_ACCESS_TOKEN_EXPIRES=3600
JWT_REFRESH_TOKEN_EXPIRES=604800

# Ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=codellama:13b

# Development
DEBUG=true
LOG_LEVEL=DEBUG
```

### Frontend (.env.local)

Create a `.env.local` file in the `frontend/` directory:

```bash
VITE_API_URL=http://localhost:5000/api/v1
VITE_WS_URL=ws://localhost:5000
VITE_ENVIRONMENT=development
```

## Development Workflow

### Running Tests

```bash
# Backend tests
cd backend
pytest                          # All tests
pytest tests/unit              # Unit tests only
pytest -k "test_auth"          # Pattern matching
pytest --cov=app               # With coverage
pytest -v --tb=short           # Verbose with short traceback

# Frontend tests
cd frontend
npm run test                   # All tests
npm run test:watch            # Watch mode
npm run test:coverage         # With coverage

# E2E tests
npm run e2e                   # Run Playwright tests
npm run e2e:ui                # With Playwright UI
```

### Code Quality

```bash
# Backend
cd backend
ruff check .                  # Linting
ruff check . --fix           # Auto-fix issues
black .                       # Formatting
mypy app                      # Type checking

# Frontend
cd frontend
npm run lint                  # ESLint
npm run lint:fix             # Auto-fix ESLint issues
npm run type-check           # TypeScript check
npm run format               # Prettier formatting
```

### Database Migrations

```bash
cd backend

# Create a new migration
flask db migrate -m "Add new table"

# Apply migrations
flask db upgrade

# Rollback one migration
flask db downgrade

# View migration history
flask db history

# View current revision
flask db current
```

### Running Background Tasks

```bash
# Start Celery worker (for background jobs)
cd backend
celery -A app.celery worker --loglevel=info

# Start Celery beat (for scheduled tasks)
celery -A app.celery beat --loglevel=info
```

## Project Structure

```
novasight/
├── backend/
│   ├── app/
│   │   ├── __init__.py         # Flask app factory
│   │   ├── config.py           # Configuration classes
│   │   ├── extensions.py       # Flask extensions
│   │   ├── api/                # API blueprints
│   │   │   ├── __init__.py
│   │   │   ├── auth.py         # Auth endpoints
│   │   │   ├── connections.py  # Data source endpoints
│   │   │   ├── dashboards.py   # Dashboard endpoints
│   │   │   └── queries.py      # Query endpoints
│   │   ├── models/             # SQLAlchemy models
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── tenant.py
│   │   │   └── dashboard.py
│   │   ├── services/           # Business logic
│   │   │   ├── auth_service.py
│   │   │   ├── connection_service.py
│   │   │   └── template_engine.py
│   │   ├── connectors/         # Database connectors
│   │   │   ├── base.py
│   │   │   ├── postgresql.py
│   │   │   └── mysql.py
│   │   ├── templates/          # Jinja2 code templates
│   │   └── utils/              # Utilities
│   ├── migrations/             # Alembic migrations
│   ├── tests/                  # Test suite
│   │   ├── unit/
│   │   ├── integration/
│   │   └── conftest.py
│   ├── requirements.txt        # Production dependencies
│   ├── requirements-dev.txt    # Development dependencies
│   └── run.py                  # Entry point
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx           # React entry point
│   │   ├── App.tsx            # Root component
│   │   ├── components/        # Reusable components
│   │   │   ├── ui/            # Shadcn UI components
│   │   │   └── shared/        # Shared components
│   │   ├── pages/             # Page components
│   │   │   ├── auth/
│   │   │   ├── dashboards/
│   │   │   └── settings/
│   │   ├── hooks/             # Custom hooks
│   │   ├── stores/            # Zustand stores
│   │   ├── api/               # API client
│   │   └── types/             # TypeScript types
│   ├── e2e/                   # Playwright tests
│   ├── public/                # Static assets
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── dbt/                       # dbt project
│   ├── models/
│   ├── macros/
│   └── dbt_project.yml
│
├── docker/                    # Docker configurations
│   ├── backend/
│   ├── frontend/
│   └── postgres/
│
├── k8s/                       # Kubernetes manifests
├── helm/                      # Helm charts
└── docs/                      # Documentation
```

## IDE Configuration

### VS Code

Recommended extensions:

```json
{
  "recommendations": [
    "ms-python.python",
    "ms-python.vscode-pylance",
    "charliermarsh.ruff",
    "ms-python.black-formatter",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-azuretools.vscode-docker"
  ]
}
```

Workspace settings (`.vscode/settings.json`):

```json
{
  "python.defaultInterpreterPath": "./backend/venv/bin/python",
  "python.analysis.typeCheckingMode": "basic",
  "[python]": {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "ms-python.black-formatter",
    "editor.codeActionsOnSave": {
      "source.organizeImports": "explicit"
    }
  },
  "[typescript]": {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port
# Windows:
netstat -ano | findstr :5000

# Linux/macOS:
lsof -i :5000

# Kill process
# Windows:
taskkill /PID <PID> /F

# Linux/macOS:
kill -9 <PID>
```

### Docker Services Not Starting

```bash
# Check logs
docker compose logs postgres
docker compose logs clickhouse

# Restart services
docker compose restart

# Full reset (removes volumes)
docker compose down -v
docker compose up -d
```

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker compose ps postgres

# Connect to PostgreSQL directly
docker compose exec postgres psql -U novasight -d novasight

# Check ClickHouse
docker compose exec clickhouse clickhouse-client
```

### Python Virtual Environment Issues

```bash
# Remove and recreate
cd backend
rm -rf venv
python -m venv venv
source venv/bin/activate  # or .\venv\Scripts\activate on Windows
pip install -r requirements.txt -r requirements-dev.txt
```

### Node Modules Issues

```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Ollama Model Not Found

```bash
# Pull the model
docker compose exec ollama ollama pull codellama:13b

# Check available models
docker compose exec ollama ollama list

# Restart Ollama
docker compose restart ollama
```

### Flask Migrations Not Running

```bash
cd backend

# Check if database exists
flask db current

# Initialize migrations (only if migrations/ doesn't exist)
flask db init

# Create migration
flask db migrate -m "Initial migration"

# Apply
flask db upgrade
```

## Next Steps

- Read the [Contributing Guide](contributing.md) to learn how to submit changes
- Review [Coding Standards](coding-standards.md) for style guidelines
- Check the [Testing Guide](testing-guide.md) for testing best practices
- Explore the [Architecture Overview](architecture.md) to understand the system

---

*Last updated: January 2026*
