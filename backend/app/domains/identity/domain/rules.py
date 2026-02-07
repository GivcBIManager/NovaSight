"""
NovaSight Identity Domain Rules
================================

Pure domain logic for permission resolution. No framework dependencies.

These rules encapsulate:
- Permission wildcard matching (*, category.*)
- Permission hierarchy checking
- Role inheritance resolution
- Resource permission level comparison
"""

from typing import Set, FrozenSet, Optional


# ────────────────────────────────────────────
# Permission Matching
# ────────────────────────────────────────────

def matches_permission(
    user_perms: Set[str],
    required: str,
) -> bool:
    """
    Check if a set of user permissions satisfies a required permission.

    Matching order (first match wins):
        1. Global wildcard ``"*"``
        2. Admin wildcard ``"admin.*"``
        3. Exact match
        4. Category wildcard ``category.*``
        5. Sub-category wildcard ``category.sub.*``

    Args:
        user_perms: Set of permission strings the user holds.
        required: The permission string to check (e.g. ``"dashboards.edit"``).

    Returns:
        True if the user's permissions satisfy the requirement.
    """
    # 1. Global wildcard
    if "*" in user_perms:
        return True

    # 2. Admin wildcard (legacy compat)
    if "admin.*" in user_perms and required.startswith("admin."):
        return True

    # 3. Exact match
    if required in user_perms:
        return True

    # 4. Category wildcard
    parts = required.split(".")
    if len(parts) >= 2:
        if f"{parts[0]}.*" in user_perms:
            return True

        # 5. Sub-category wildcard (e.g. admin.infrastructure.*)
        if len(parts) >= 3:
            sub_category = f"{parts[0]}.{parts[1]}"
            if f"{sub_category}.*" in user_perms:
                return True

    return False


def expand_wildcards(
    permissions: Set[str],
    all_known_permissions: FrozenSet[str],
) -> Set[str]:
    """
    Expand wildcard permissions into concrete permission sets.

    Useful for display / audit purposes.

    Args:
        permissions: Set that may contain wildcards.
        all_known_permissions: Universe of known permission strings.

    Returns:
        Set of concrete permission strings with wildcards resolved.
    """
    expanded: Set[str] = set()

    for perm in permissions:
        if perm == "*":
            expanded.update(all_known_permissions)
        elif perm.endswith(".*"):
            prefix = perm[:-2]  # remove .*
            for known in all_known_permissions:
                if known.startswith(f"{prefix}."):
                    expanded.add(known)
        else:
            expanded.add(perm)

    return expanded


# ────────────────────────────────────────────
# Resource Permission Levels
# ────────────────────────────────────────────

RESOURCE_PERMISSION_LEVELS = {
    "owner": 0,
    "admin": 1,
    "edit": 2,
    "view": 3,
}

# Maps common CRUD actions to the minimum resource permission level required
ACTION_TO_RESOURCE_LEVEL = {
    "delete": "owner",
    "admin": "admin",
    "share": "admin",
    "edit": "edit",
    "update": "edit",
    "view": "view",
    "read": "view",
}


def resource_level_sufficient(
    held_level: str,
    required_level: str,
) -> bool:
    """
    Check if a held resource permission level meets a required level.

    Lower number = higher privilege.

    Args:
        held_level: The level the user holds (owner, admin, edit, view).
        required_level: The level required for the action.

    Returns:
        True if held_level is sufficient.
    """
    held = RESOURCE_PERMISSION_LEVELS.get(held_level)
    required = RESOURCE_PERMISSION_LEVELS.get(required_level)

    if held is None or required is None:
        return False

    return held <= required


def action_to_resource_level(action: str) -> str:
    """
    Map a CRUD action string to a resource permission level.

    Falls back to ``"view"`` for unknown actions.
    """
    return ACTION_TO_RESOURCE_LEVEL.get(action, "view")


# ────────────────────────────────────────────
# Role Hierarchy
# ────────────────────────────────────────────

def collect_inherited_permissions(
    role_permissions_map: dict,
    role_id: str,
    hierarchy: dict,
    visited: Optional[Set[str]] = None,
) -> Set[str]:
    """
    Recursively collect permissions from a role and its ancestors.

    Args:
        role_permissions_map: ``{role_id: set_of_permissions}``
        role_id: The role to start from.
        hierarchy: ``{child_role_id: [parent_role_ids]}``
        visited: Guard against cycles.

    Returns:
        Union of all permissions in the inheritance chain.
    """
    if visited is None:
        visited = set()

    if role_id in visited:
        return set()
    visited.add(role_id)

    perms = set(role_permissions_map.get(role_id, set()))

    for parent_id in hierarchy.get(role_id, []):
        perms |= collect_inherited_permissions(
            role_permissions_map, parent_id, hierarchy, visited,
        )

    return perms


def compute_hierarchy_level(
    role_id: str,
    hierarchy: dict,
    visited: Optional[Set[str]] = None,
) -> int:
    """
    Compute the depth of a role in the hierarchy tree.

    Level 0 = root (no parents).
    """
    if visited is None:
        visited = set()

    if role_id in visited:
        return 0
    visited.add(role_id)

    parents = hierarchy.get(role_id, [])
    if not parents:
        return 0

    return 1 + max(
        compute_hierarchy_level(pid, hierarchy, visited) for pid in parents
    )
