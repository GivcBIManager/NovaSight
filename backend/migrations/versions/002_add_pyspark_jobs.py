"""Add PySpark job configuration table

Revision ID: 002_add_pyspark_jobs
Revises: 001_initial_schema
Create Date: 2026-01-28
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic
revision: str = '002_add_pyspark_jobs'
down_revision: Union[str, None] = '001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Add PySpark job configuration table.
    
    This migration creates the pyspark_job_configs table for storing
    user-defined PySpark data ingestion and transformation configurations.
    """
    
    # =========================================
    # PYSPARK_JOB_CONFIGS TABLE
    # =========================================
    op.create_table(
        'pyspark_job_configs',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('uuid_generate_v4()'), primary_key=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('job_name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        
        # Data source configuration
        sa.Column('connection_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('source_type', sa.String(50), nullable=False, server_default='table'),
        sa.Column('source_table', sa.String(255), nullable=True),
        sa.Column('source_query', sa.Text, nullable=True),
        
        # Column selection and keys
        sa.Column('selected_columns', postgresql.ARRAY(sa.String), server_default='{}', nullable=False),
        sa.Column('primary_keys', postgresql.ARRAY(sa.String), server_default='{}', nullable=False),
        
        # SCD and write configuration
        sa.Column('scd_type', sa.String(50), nullable=False, server_default='type_1'),
        sa.Column('write_mode', sa.String(50), nullable=False, server_default='append'),
        
        # CDC configuration
        sa.Column('cdc_column', sa.String(255), nullable=True),
        
        # Partitioning
        sa.Column('partition_columns', postgresql.ARRAY(sa.String), server_default='{}', nullable=False),
        
        # Target configuration
        sa.Column('target_database', sa.String(255), nullable=False),
        sa.Column('target_table', sa.String(255), nullable=False),
        sa.Column('target_schema', sa.String(255), nullable=True),
        
        # Spark configuration
        sa.Column('spark_config', postgresql.JSONB, server_default='{}', nullable=False),
        
        # Generated code tracking
        sa.Column('generated_code', sa.Text, nullable=True),
        sa.Column('code_hash', sa.String(64), nullable=True),
        sa.Column('last_generated_at', sa.DateTime(timezone=True), nullable=True),
        
        # Version tracking
        sa.Column('config_version', sa.Integer, server_default='1', nullable=False),
        
        # Status
        sa.Column('status', sa.String(50), nullable=False, server_default='draft'),
        
        # Audit fields
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_by', postgresql.UUID(as_uuid=True), nullable=True),
        
        # Foreign keys
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['connection_id'], ['data_connections.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['updated_by'], ['users.id'], ondelete='SET NULL'),
        
        # Constraints
        sa.UniqueConstraint('tenant_id', 'job_name', name='uq_tenant_job_name'),
        
        schema='public'
    )
    
    # Create indexes
    op.create_index('idx_pyspark_jobs_tenant', 'pyspark_job_configs', ['tenant_id'], schema='public')
    op.create_index('idx_pyspark_jobs_connection', 'pyspark_job_configs', ['connection_id'], schema='public')
    op.create_index('idx_pyspark_jobs_status', 'pyspark_job_configs', ['status'], schema='public')
    op.create_index('idx_pyspark_jobs_created_by', 'pyspark_job_configs', ['created_by'], schema='public')


def downgrade() -> None:
    """
    Remove PySpark job configuration table.
    """
    op.drop_table('pyspark_job_configs', schema='public')
