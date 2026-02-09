"""
NovaSight CLI Commands
======================

Flask CLI commands for development and administration tasks.
"""

import click
import json
import yaml
from flask.cli import with_appcontext, AppGroup

# Create command groups
docs_cli = AppGroup('docs', help='API documentation commands')


@docs_cli.command('export-openapi')
@click.option('--format', 'output_format', type=click.Choice(['json', 'yaml']), default='yaml',
              help='Output format (json or yaml)')
@click.option('--output', '-o', default='docs/api/openapi.yaml',
              help='Output file path')
@click.option('--pretty', is_flag=True, default=True,
              help='Pretty print output')
@with_appcontext
def export_openapi(output_format, output, pretty):
    """
    Export OpenAPI specification to file.
    
    Generates the OpenAPI 3.0 specification from the Flask-RESTX API
    and saves it to the specified file.
    
    Examples:
        flask docs export-openapi
        flask docs export-openapi --format json -o api.json
    """
    from app.api.swagger import api
    import os
    
    # Get the OpenAPI spec
    spec = api.__schema__
    
    # Ensure output directory exists
    os.makedirs(os.path.dirname(output) or '.', exist_ok=True)
    
    # Format output
    if output_format == 'json':
        if pretty:
            content = json.dumps(spec, indent=2, default=str)
        else:
            content = json.dumps(spec, default=str)
    else:
        content = yaml.dump(spec, default_flow_style=False, allow_unicode=True, sort_keys=False)
    
    # Write to file
    with open(output, 'w', encoding='utf-8') as f:
        f.write(content)
    
    click.echo(click.style(f'✓ OpenAPI spec exported to {output}', fg='green'))
    click.echo(f'  Format: {output_format.upper()}')
    click.echo(f'  Endpoints: {len(spec.get("paths", {}))}')


@docs_cli.command('validate-openapi')
@click.option('--spec', '-s', default='docs/api/openapi.yaml',
              help='OpenAPI spec file to validate')
@with_appcontext
def validate_openapi(spec):
    """
    Validate an OpenAPI specification file.
    
    Checks the spec for common issues and inconsistencies.
    """
    import os
    
    if not os.path.exists(spec):
        click.echo(click.style(f'✗ File not found: {spec}', fg='red'))
        return
    
    with open(spec, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Parse based on extension
    if spec.endswith('.json'):
        data = json.loads(content)
    else:
        data = yaml.safe_load(content)
    
    errors = []
    warnings = []
    
    # Check required fields
    if 'openapi' not in data:
        errors.append('Missing "openapi" version field')
    if 'info' not in data:
        errors.append('Missing "info" section')
    if 'paths' not in data:
        errors.append('Missing "paths" section')
    
    # Check info section
    info = data.get('info', {})
    if not info.get('title'):
        errors.append('Missing API title in info section')
    if not info.get('version'):
        errors.append('Missing API version in info section')
    if not info.get('description'):
        warnings.append('Missing API description in info section')
    
    # Check paths
    paths = data.get('paths', {})
    for path, methods in paths.items():
        for method, operation in methods.items():
            if method.upper() in ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']:
                if not operation.get('summary') and not operation.get('description'):
                    warnings.append(f'{method.upper()} {path}: Missing summary/description')
                if not operation.get('responses'):
                    errors.append(f'{method.upper()} {path}: Missing responses')
    
    # Report results
    if errors:
        click.echo(click.style('\nErrors:', fg='red', bold=True))
        for error in errors:
            click.echo(click.style(f'  ✗ {error}', fg='red'))
    
    if warnings:
        click.echo(click.style('\nWarnings:', fg='yellow', bold=True))
        for warning in warnings:
            click.echo(click.style(f'  ⚠ {warning}', fg='yellow'))
    
    if not errors and not warnings:
        click.echo(click.style('✓ OpenAPI spec is valid!', fg='green'))
    elif not errors:
        click.echo(click.style(f'\n✓ Valid with {len(warnings)} warning(s)', fg='yellow'))
    else:
        click.echo(click.style(f'\n✗ Found {len(errors)} error(s) and {len(warnings)} warning(s)', fg='red'))


@docs_cli.command('generate-redoc')
@click.option('--spec', '-s', default='docs/api/openapi.yaml',
              help='OpenAPI spec file path')
@click.option('--output', '-o', default='docs/api/index.html',
              help='Output HTML file path')
@click.option('--title', '-t', default='NovaSight API Documentation',
              help='Page title')
@with_appcontext
def generate_redoc(spec, output, title):
    """
    Generate static Redoc HTML documentation.
    
    Creates a standalone HTML file with embedded Redoc documentation.
    """
    import os
    
    html_template = f'''<!DOCTYPE html>
<html>
<head>
    <title>{title}</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
    <style>
        body {{
            margin: 0;
            padding: 0;
        }}
    </style>
</head>
<body>
    <redoc spec-url='{spec}'></redoc>
    <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
</body>
</html>
'''
    
    # Ensure output directory exists
    os.makedirs(os.path.dirname(output) or '.', exist_ok=True)
    
    with open(output, 'w', encoding='utf-8') as f:
        f.write(html_template)
    
    click.echo(click.style(f'✓ Redoc documentation generated: {output}', fg='green'))


@docs_cli.command('serve')
@click.option('--port', '-p', default=8080, help='Port to serve on')
@with_appcontext
def serve_docs(port):
    """
    Serve API documentation locally.
    
    Starts a local HTTP server to preview the documentation.
    """
    import http.server
    import socketserver
    import os
    
    docs_dir = 'docs/api'
    
    if not os.path.exists(docs_dir):
        click.echo(click.style(f'✗ Documentation directory not found: {docs_dir}', fg='red'))
        click.echo('Run "flask docs export-openapi" and "flask docs generate-redoc" first.')
        return
    
    os.chdir(docs_dir)
    
    handler = http.server.SimpleHTTPRequestHandler
    
    with socketserver.TCPServer(("", port), handler) as httpd:
        click.echo(click.style(f'✓ Serving docs at http://localhost:{port}', fg='green'))
        click.echo('Press Ctrl+C to stop.')
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            click.echo('\nServer stopped.')


# Infrastructure CLI commands
infra_cli = AppGroup('infra', help='Infrastructure configuration commands')


@infra_cli.command('init-defaults')
@with_appcontext
def init_infrastructure_defaults():
    """
    Initialize default infrastructure configurations.
    
    Creates default configurations for ClickHouse, Spark, and Airflow
    if they don't already exist. These defaults are used for
    development and testing.
    
    Examples:
        flask infra init-defaults
    """
    from app.services.infrastructure_config_service import InfrastructureConfigService
    
    click.echo('Initializing infrastructure defaults...')
    
    service = InfrastructureConfigService()
    service.initialize_defaults()
    
    click.echo(click.style('✓ Infrastructure defaults initialized', fg='green'))
    click.echo('  - ClickHouse (localhost:8123)')
    click.echo('  - Spark (localhost:7077)')
    click.echo('  - Airflow (localhost:8080)')


@infra_cli.command('test')
@click.option('--service', '-s', type=click.Choice(['clickhouse', 'spark', 'airflow', 'all']),
              default='all', help='Service to test')
@with_appcontext
def test_infrastructure_connections(service):
    """
    Test infrastructure service connections.
    
    Tests connectivity to configured infrastructure services.
    
    Examples:
        flask infra test
        flask infra test -s clickhouse
    """
    from app.services.infrastructure_config_service import InfrastructureConfigService
    
    services = ['clickhouse', 'spark', 'airflow'] if service == 'all' else [service]
    
    infra_service = InfrastructureConfigService()
    
    for svc in services:
        click.echo(f'Testing {svc}... ', nl=False)
        try:
            result = infra_service.test_connection(
                service_type=svc,
                host=None,  # Will use default
                port=None,  # Will use default
                settings=None,
            )
            if result['success']:
                click.echo(click.style('✓ Connected', fg='green'))
                if result.get('server_version'):
                    click.echo(f'  Version: {result["server_version"]}')
                if result.get('latency_ms'):
                    click.echo(f'  Latency: {result["latency_ms"]:.0f}ms')
            else:
                click.echo(click.style(f'✗ Failed: {result["message"]}', fg='red'))
        except Exception as e:
            click.echo(click.style(f'✗ Error: {str(e)}', fg='red'))


@infra_cli.command('list')
@with_appcontext
def list_infrastructure_configs():
    """
    List all infrastructure configurations.
    
    Shows all configured infrastructure services including
    global defaults and tenant-specific configurations.
    
    Examples:
        flask infra list
    """
    from app.services.infrastructure_config_service import InfrastructureConfigService
    
    service = InfrastructureConfigService()
    result = service.list_configs(page=1, per_page=100)
    
    if not result['items']:
        click.echo('No infrastructure configurations found.')
        click.echo('Run "flask infra init-defaults" to create defaults.')
        return
    
    click.echo(f'Found {result["total"]} infrastructure configuration(s):\n')
    
    for config in result['items']:
        status = click.style('●', fg='green') if config['is_active'] else click.style('○', fg='yellow')
        default = ' [default]' if config['is_system_default'] else ''
        click.echo(f'{status} {config["service_type"].upper()}: {config["name"]}{default}')
        click.echo(f'    Host: {config["host"]}:{config["port"]}')
        if config['last_test_at']:
            test_status = '✓' if config['last_test_success'] else '✗'
            click.echo(f'    Last test: {test_status} ({config["last_test_at"]})')
        click.echo()


# ── Tenant management commands ───────────────────────────────────────────
tenant_cli = AppGroup('tenant', help='Tenant management commands')


@tenant_cli.command('provision-ch')
@click.argument('slug')
@with_appcontext
def provision_ch(slug):
    """(Re-)provision ClickHouse database for an existing tenant.

    SLUG is the tenant slug (e.g. "acme").
    Useful when the tenant record exists but the CH database was never created.
    """
    from app.domains.tenants.application.tenant_service import TenantService
    from app.domains.tenants.infrastructure.provisioning import ProvisioningService

    svc = TenantService()
    tenant = svc.get_tenant_by_slug(slug)
    if tenant is None:
        click.echo(f'✗ Tenant with slug "{slug}" not found.', err=True)
        raise SystemExit(1)

    click.echo(f'Provisioning ClickHouse database for tenant: {tenant.slug} ...')
    provisioning = ProvisioningService()
    try:
        provisioning.create_ch_database(tenant)
        click.echo(f'✓ ClickHouse database created for tenant: {tenant.slug}')
    except Exception as exc:
        click.echo(f'✗ Failed: {exc}', err=True)
        raise SystemExit(1)


@tenant_cli.command('provision-ch-all')
@with_appcontext
def provision_ch_all():
    """(Re-)provision ClickHouse databases for ALL existing tenants.

    Safe to run repeatedly — all DDL uses IF NOT EXISTS.
    """
    from app.domains.tenants.domain.models import Tenant
    from app.domains.tenants.infrastructure.provisioning import ProvisioningService

    tenants = Tenant.query.all()
    if not tenants:
        click.echo('No tenants found.')
        return

    provisioning = ProvisioningService()
    ok, fail = 0, 0
    for tenant in tenants:
        try:
            provisioning.create_ch_database(tenant)
            click.echo(f'  ✓ {tenant.slug}')
            ok += 1
        except Exception as exc:
            click.echo(f'  ✗ {tenant.slug}: {exc}', err=True)
            fail += 1

    click.echo(f'\nDone. {ok} succeeded, {fail} failed.')


def register_commands(app):
    """Register CLI commands with the Flask app."""
    app.cli.add_command(docs_cli)
    app.cli.add_command(infra_cli)
    app.cli.add_command(tenant_cli)

    # Database seeding commands
    from app.seed import seed_cli
    app.cli.add_command(seed_cli)
