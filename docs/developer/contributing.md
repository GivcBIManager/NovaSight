# Contributing to NovaSight

Thank you for your interest in contributing to NovaSight! This guide will help you get started with contributing code, documentation, or bug reports.

## Code of Conduct

Please read and follow our [Code of Conduct](https://github.com/novasight/novasight/blob/main/CODE_OF_CONDUCT.md). We expect all contributors to be respectful and inclusive.

## Ways to Contribute

### 🐛 Report Bugs

Found a bug? Help us fix it by [opening an issue](https://github.com/novasight/novasight/issues/new?template=bug_report.md).

Include:
- A clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Environment details (OS, browser, versions)

### 💡 Suggest Features

Have an idea? [Open a feature request](https://github.com/novasight/novasight/issues/new?template=feature_request.md).

Include:
- Problem you're trying to solve
- Proposed solution
- Alternative approaches considered
- Use case examples

### 📖 Improve Documentation

Documentation improvements are always welcome:
- Fix typos or clarify explanations
- Add examples or tutorials
- Translate documentation

### 💻 Contribute Code

Ready to write code? Follow the process below.

## Development Process

### 1. Find an Issue

- Browse [open issues](https://github.com/novasight/novasight/issues)
- Look for issues labeled `good first issue` or `help wanted`
- Comment on the issue to indicate you're working on it
- Ask questions if anything is unclear

### 2. Fork and Clone

```bash
# Fork the repository on GitHub, then:
git clone https://github.com/YOUR_USERNAME/novasight.git
cd novasight

# Add upstream remote
git remote add upstream https://github.com/novasight/novasight.git
```

### 3. Set Up Local Environment

Follow the [Local Development Setup](setup.md) guide.

### 4. Create a Branch

```bash
# Sync with upstream
git fetch upstream
git checkout main
git merge upstream/main

# Create feature branch
git checkout -b feature/your-feature-name
# or for bug fixes:
git checkout -b fix/your-bug-fix
```

**Branch Naming Conventions:**

| Prefix | Use Case |
|--------|----------|
| `feature/` | New features |
| `fix/` | Bug fixes |
| `docs/` | Documentation only |
| `refactor/` | Code refactoring |
| `test/` | Test improvements |
| `chore/` | Maintenance tasks |

### 5. Make Changes

- Follow the [Coding Standards](coding-standards.md)
- Write tests for new functionality
- Update documentation as needed
- Keep commits focused and atomic

### 6. Test Your Changes

```bash
# Run all backend tests
cd backend
pytest

# Run linting and type checks
ruff check .
mypy app

# Run frontend tests
cd frontend
npm run test
npm run lint
npm run type-check
```

### 7. Commit Your Changes

We use [Conventional Commits](https://www.conventionalcommits.org/):

```bash
git commit -m "feat(dashboard): add drag-and-drop widget reordering"
git commit -m "fix(auth): handle expired refresh tokens correctly"
git commit -m "docs(api): add query endpoint examples"
git commit -m "test(connection): add integration tests for PostgreSQL"
```

**Commit Prefixes:**

| Prefix | Description |
|--------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no code change |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Performance improvement |
| `test` | Adding or updating tests |
| `chore` | Maintenance tasks |
| `ci` | CI/CD changes |

**Scope (optional):** Component or area affected, e.g., `auth`, `dashboard`, `api`, `ui`.

### 8. Push and Create Pull Request

```bash
# Push to your fork
git push origin feature/your-feature-name
```

Then open a Pull Request on GitHub against the `develop` branch.

## Pull Request Guidelines

### PR Title

Use the same Conventional Commits format:
```
feat(dashboard): add drag-and-drop widget reordering
```

### PR Description

Fill out the PR template:

```markdown
## Description
Brief description of changes.

## Related Issue
Fixes #123

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Checklist
- [ ] My code follows the project's coding standards
- [ ] I have written tests for my changes
- [ ] All tests pass locally
- [ ] I have updated documentation as needed
- [ ] I have added myself to CONTRIBUTORS.md (first-time contributors)
```

### PR Review Process

1. **Automated Checks**: CI runs tests, linting, and type checking
2. **Code Review**: At least one maintainer reviews the code
3. **Feedback**: Address any requested changes
4. **Approval**: Once approved, a maintainer will merge

## Architecture Guidelines

### Template Engine Rules (ADR-002)

**Never** generate code directly. Always use templates:

```python
# ❌ Bad - Direct code generation
def generate_sql(table_name: str) -> str:
    return f"SELECT * FROM {table_name}"

# ✅ Good - Template-based generation
def generate_sql(table_name: str) -> str:
    return template_engine.render(
        'select_all.sql.j2',
        {'table_name': table_name}
    )
```

### Multi-Tenancy

Always scope data access by tenant:

```python
# ❌ Bad - No tenant scoping
def get_dashboards() -> List[Dashboard]:
    return Dashboard.query.all()

# ✅ Good - Tenant-scoped access
def get_dashboards(tenant_id: str) -> List[Dashboard]:
    return Dashboard.query.filter_by(tenant_id=tenant_id).all()
```

### API Design

Follow RESTful conventions:

```python
# ❌ Bad
@api.route('/getDashboard/<id>', methods=['GET'])
@api.route('/createDashboard', methods=['POST'])

# ✅ Good
@api.route('/dashboards/<id>', methods=['GET'])
@api.route('/dashboards', methods=['POST'])
```

### Error Handling

Use consistent error responses:

```python
# ❌ Bad
return {'error': 'Not found'}, 404

# ✅ Good
from app.errors import NotFoundError
raise NotFoundError(f"Dashboard {id} not found")
```

## Testing Requirements

### Required Tests

| Change Type | Required Tests |
|-------------|---------------|
| New API endpoint | Unit + Integration tests |
| New service method | Unit tests |
| Bug fix | Regression test |
| UI component | Component tests |
| E2E flow | Playwright test |

### Test Coverage

- Maintain minimum 80% code coverage
- New code should have 90%+ coverage
- Critical paths (auth, payments) require 100% coverage

### Example Test Structure

```python
# tests/unit/services/test_dashboard_service.py

import pytest
from app.services.dashboard_service import DashboardService

class TestDashboardService:
    """Unit tests for DashboardService."""
    
    @pytest.fixture
    def service(self, db_session):
        return DashboardService(db_session)
    
    def test_create_dashboard_success(self, service, tenant):
        """Should create a dashboard with valid input."""
        result = service.create(
            tenant_id=tenant.id,
            title="Test Dashboard",
            layout={}
        )
        
        assert result.id is not None
        assert result.title == "Test Dashboard"
    
    def test_create_dashboard_invalid_title(self, service, tenant):
        """Should raise ValidationError for empty title."""
        with pytest.raises(ValidationError):
            service.create(tenant_id=tenant.id, title="", layout={})
```

## Security Considerations

### Never Commit

- Secrets or API keys
- Database credentials
- Private certificates
- `.env` files with real values

### Input Validation

Always validate and sanitize user input:

```python
from pydantic import BaseModel, Field

class CreateDashboardRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(max_length=1000, default=None)
```

### SQL Safety

Never use string concatenation for SQL:

```python
# ❌ Bad
query = f"SELECT * FROM users WHERE id = '{user_id}'"

# ✅ Good
query = "SELECT * FROM users WHERE id = :id"
result = db.execute(query, {'id': user_id})
```

## Getting Help

- **GitHub Issues**: [Report bugs or ask questions](https://github.com/novasight/novasight/issues)
- **Discussions**: [Community discussions](https://github.com/novasight/novasight/discussions)
- **Discord**: [Join our community](https://discord.gg/novasight)
- **Email**: developers@novasight.io

## Recognition

Contributors are recognized in:
- `CONTRIBUTORS.md` file
- Release notes for significant contributions
- GitHub contributor statistics

Thank you for contributing to NovaSight! 🎉

---

*Last updated: January 2026*
