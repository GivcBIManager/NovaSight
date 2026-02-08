# NovaSight Data Sources Domain
# Manages database connections, schema discovery, and connectors.
#
# Structure:
#   domain/         - Models, value objects, enums (no framework deps)
#   application/    - Use-case services (ConnectionService)
#   api/            - HTTP route handlers
#   infrastructure/ - Connectors, connection pools, type mapping
#   schemas/        - Pydantic request/response schemas
