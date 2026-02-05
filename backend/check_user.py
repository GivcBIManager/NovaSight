"""Check admin user status and password"""
from app.models.user import User
from app.models.tenant import Tenant
from app.extensions import db
from app import create_app
from app.services.password_service import password_service

app = create_app()
with app.app_context():
    users = User.query.filter(User.email == 'admin@novasight.dev').all()
    print(f"Found {len(users)} users with email admin@novasight.dev")
    
    for u in users:
        tenant = Tenant.query.get(u.tenant_id)
        print(f"\nUser: {u.email}")
        print(f"  User Status: {u.status}")
        print(f"  Tenant ID: {u.tenant_id}")
        print(f"  Tenant Slug: {tenant.slug if tenant else 'N/A'}")
        print(f"  Tenant Status: {tenant.status if tenant else 'N/A'}")
        
        # Test password
        test_pass = 'Admin123!'
        try:
            result = password_service.verify(test_pass, u.password_hash)
            print(f"  Password 'Admin123!' works: {result}")
        except Exception as e:
            print(f"  Password verification error: {e}")
