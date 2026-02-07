"""
NovaSight Role Service
======================

Canonical location: ``app.domains.identity.application.role_service``

Service layer for Role CRUD operations.
Extracted from ``api/v1/roles.py`` to separate concerns — the API layer
should not contain direct SQLAlchemy queries.
"""

import uuid
from typing import List, Optional, Dict, Any

from app.extensions import db
from app.domains.identity.domain.models import Role

import logging

logger = logging.getLogger(__name__)


class RoleService:
    """Service for managing roles within a tenant."""

    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id

    # ── Queries ───────────────────────────────────────

    def list_roles(self) -> List[Role]:
        """List all roles available in the tenant (tenant-specific + global)."""
        return (
            Role.query.filter(
                (Role.tenant_id == self.tenant_id) | (Role.tenant_id.is_(None))
            )
            .order_by(Role.is_system.desc(), Role.name)
            .all()
        )

    def get_role(self, role_id: str) -> Optional[Role]:
        """Get role by ID within tenant scope."""
        return Role.query.filter(
            Role.id == role_id,
            (Role.tenant_id == self.tenant_id) | (Role.tenant_id.is_(None)),
        ).first()

    # ── Mutations ─────────────────────────────────────

    def create_role(
        self,
        name: str,
        display_name: str,
        description: Optional[str] = None,
        permissions: Optional[List[str]] = None,
        is_default: bool = False,
    ) -> Role:
        """
        Create a new custom role.

        Raises:
            ValueError: If role name already exists in tenant.
        """
        existing = Role.query.filter(
            Role.tenant_id == self.tenant_id,
            Role.name == name,
        ).first()
        if existing:
            raise ValueError(f"Role '{name}' already exists")

        if is_default:
            Role.query.filter(
                Role.tenant_id == self.tenant_id,
                Role.is_default == True,  # noqa: E712
            ).update({"is_default": False})

        role = Role(
            id=uuid.uuid4(),
            tenant_id=self.tenant_id,
            name=name,
            display_name=display_name,
            description=description,
            permissions={p: True for p in (permissions or [])},
            is_system=False,
            is_default=is_default,
        )
        db.session.add(role)
        db.session.commit()

        logger.info(f"Role '{name}' created in tenant {self.tenant_id}")
        return role

    def update_role(
        self,
        role_id: str,
        **kwargs,
    ) -> Role:
        """
        Update a custom role.

        Raises:
            ValueError: If role not found or is a system role.
        """
        role = Role.query.filter(
            Role.id == role_id,
            Role.tenant_id == self.tenant_id,
        ).first()
        if not role:
            raise LookupError("Role not found")

        if role.is_system:
            raise ValueError("System roles cannot be modified")

        if "display_name" in kwargs:
            role.display_name = kwargs["display_name"]
        if "description" in kwargs:
            role.description = kwargs["description"]
        if "permissions" in kwargs:
            role.permissions = {p: True for p in kwargs["permissions"]}
        if "is_default" in kwargs:
            if kwargs["is_default"]:
                Role.query.filter(
                    Role.tenant_id == self.tenant_id,
                    Role.id != role.id,
                    Role.is_default == True,  # noqa: E712
                ).update({"is_default": False})
            role.is_default = kwargs["is_default"]

        db.session.commit()
        logger.info(f"Role '{role.name}' updated in tenant {self.tenant_id}")
        return role

    def delete_role(self, role_id: str) -> None:
        """
        Delete a custom role.

        Raises:
            LookupError: If role not found.
            ValueError: If role is system or has assigned users.
        """
        role = Role.query.filter(
            Role.id == role_id,
            Role.tenant_id == self.tenant_id,
        ).first()
        if not role:
            raise LookupError("Role not found")

        if role.is_system:
            raise ValueError("System roles cannot be deleted")

        if role.users:
            raise ValueError(
                f"Cannot delete role with {len(role.users)} assigned user(s). "
                "Reassign users before deleting."
            )

        db.session.delete(role)
        db.session.commit()
        logger.info(f"Role '{role.name}' deleted from tenant {self.tenant_id}")

    # ── Initialization ────────────────────────────────

    def initialize_defaults(
        self,
        templates: Dict[str, Dict[str, Any]],
    ) -> List[Role]:
        """
        Initialize default roles from templates.

        Returns:
            List of newly created roles.
        """
        created: List[Role] = []

        for role_name, config in templates.items():
            existing = Role.query.filter(
                Role.tenant_id == self.tenant_id,
                Role.name == role_name,
            ).first()
            if existing:
                continue

            role = Role(
                id=uuid.uuid4(),
                tenant_id=self.tenant_id,
                name=role_name,
                display_name=config["display_name"],
                description=config["description"],
                permissions={p: True for p in config["permissions"]},
                is_system=False,
                is_default=(role_name == "viewer"),
            )
            db.session.add(role)
            created.append(role)

        db.session.commit()
        logger.info(
            f"Initialized {len(created)} default roles for tenant {self.tenant_id}"
        )
        return created
