"""add visual_models and dbt_executions tables

Revision ID: c4a2e1f38b90
Revises: b078fbc26a17
Create Date: 2026-03-01 12:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'c4a2e1f38b90'
down_revision = 'b078fbc26a17'
branch_labels = None
depends_on = None


def upgrade():
    # ── visual_models ────────────────────────────────────────
    op.create_table(
        'visual_models',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('model_name', sa.String(100), nullable=False),
        sa.Column('model_path', sa.Text(), nullable=False),
        sa.Column('model_layer', sa.String(20), nullable=False),
        sa.Column('canvas_position', postgresql.JSONB(), nullable=True),
        sa.Column('visual_config', postgresql.JSONB(), nullable=False),
        sa.Column('generated_sql', sa.Text(), nullable=True),
        sa.Column('generated_yaml', sa.Text(), nullable=True),
        sa.Column('materialization', sa.String(50), nullable=True, server_default='view'),
        sa.Column('tags', postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column('description', sa.Text(), nullable=True, server_default=''),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('tenant_id', 'model_name', name='uq_visual_model_tenant_name'),
    )
    op.create_index('ix_visual_models_tenant_id', 'visual_models', ['tenant_id'])

    # ── dbt_executions ───────────────────────────────────────
    op.create_table(
        'dbt_executions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('command', sa.String(50), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('finished_at', sa.DateTime(), nullable=True),
        sa.Column('duration_seconds', sa.Float(), nullable=True),
        sa.Column('selector', sa.Text(), nullable=True),
        sa.Column('exclude', sa.Text(), nullable=True),
        sa.Column('full_refresh', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('target', sa.String(50), nullable=True),
        sa.Column('models_affected', postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column('models_succeeded', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('models_errored', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('models_skipped', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('log_output', sa.Text(), nullable=True, server_default=''),
        sa.Column('error_output', sa.Text(), nullable=True, server_default=''),
        sa.Column('run_results', postgresql.JSONB(), nullable=True),
        sa.Column('triggered_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_dbt_executions_tenant_id', 'dbt_executions', ['tenant_id'])
    op.create_index(
        'ix_dbt_executions_tenant_status',
        'dbt_executions',
        ['tenant_id', 'status'],
    )


def downgrade():
    op.drop_index('ix_dbt_executions_tenant_status', 'dbt_executions')
    op.drop_index('ix_dbt_executions_tenant_id', 'dbt_executions')
    op.drop_table('dbt_executions')

    op.drop_index('ix_visual_models_tenant_id', 'visual_models')
    op.drop_table('visual_models')
