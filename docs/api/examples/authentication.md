# Authentication Examples

This guide demonstrates how to authenticate with the NovaSight API.

## Login

Obtain JWT tokens by logging in with your credentials.

### Request

```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'
```

### Response

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe",
    "tenant_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "roles": ["analyst", "viewer"]
  }
}
```

## Using the Token

Include the access token in the `Authorization` header for all subsequent requests:

```bash
curl http://localhost:5000/api/v1/connections \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## Token Refresh

Access tokens expire after 15 minutes. Use the refresh token to get a new access token:

```bash
curl -X POST http://localhost:5000/api/v1/auth/refresh \
  -H "Authorization: Bearer <refresh-token>"
```

### Response

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer"
}
```

## Register a New User

Create a new user account (requires the tenant to exist).

```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "SecurePassword123!",
    "name": "Jane Smith",
    "tenant_slug": "acme-corp"
  }'
```

### Password Requirements

- Minimum 12 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (!@#$%^&*...)

## Logout

Invalidate the current token:

```bash
curl -X POST http://localhost:5000/api/v1/auth/logout \
  -H "Authorization: Bearer <access-token>"
```

## Get Current User

Retrieve the authenticated user's profile:

```bash
curl http://localhost:5000/api/v1/auth/me \
  -H "Authorization: Bearer <access-token>"
```

### Response

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "tenant_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "roles": ["analyst", "viewer"]
}
```

## Change Password

Requires a fresh token (obtained from recent login, not refresh):

```bash
curl -X POST http://localhost:5000/api/v1/auth/change-password \
  -H "Authorization: Bearer <fresh-access-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "current_password": "OldPassword123!",
    "new_password": "NewSecurePassword456!"
  }'
```

## Python SDK Example

```python
import httpx

class NovaSightClient:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.access_token = None
        self.refresh_token = None
    
    def login(self, email: str, password: str) -> dict:
        response = httpx.post(
            f"{self.base_url}/api/v1/auth/login",
            json={"email": email, "password": password}
        )
        response.raise_for_status()
        data = response.json()
        
        self.access_token = data["access_token"]
        self.refresh_token = data["refresh_token"]
        
        return data["user"]
    
    def refresh(self) -> None:
        response = httpx.post(
            f"{self.base_url}/api/v1/auth/refresh",
            headers={"Authorization": f"Bearer {self.refresh_token}"}
        )
        response.raise_for_status()
        self.access_token = response.json()["access_token"]
    
    @property
    def headers(self) -> dict:
        return {"Authorization": f"Bearer {self.access_token}"}
    
    def get(self, path: str) -> dict:
        response = httpx.get(
            f"{self.base_url}{path}",
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()


# Usage
client = NovaSightClient("http://localhost:5000")
user = client.login("user@example.com", "password")
print(f"Logged in as {user['name']}")

connections = client.get("/api/v1/connections")
print(f"Found {len(connections)} connections")
```

## JavaScript Example

```javascript
class NovaSightClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.accessToken = null;
    this.refreshToken = null;
  }

  async login(email, password) {
    const response = await fetch(`${this.baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) throw new Error('Login failed');
    
    const data = await response.json();
    this.accessToken = data.access_token;
    this.refreshToken = data.refresh_token;
    
    return data.user;
  }

  async refresh() {
    const response = await fetch(`${this.baseUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.refreshToken}` }
    });

    if (!response.ok) throw new Error('Refresh failed');
    
    const data = await response.json();
    this.accessToken = data.access_token;
  }

  async get(path) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: { 'Authorization': `Bearer ${this.accessToken}` }
    });

    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return response.json();
  }
}

// Usage
const client = new NovaSightClient('http://localhost:5000');
const user = await client.login('user@example.com', 'password');
console.log(`Logged in as ${user.name}`);

const connections = await client.get('/api/v1/connections');
console.log(`Found ${connections.length} connections`);
```
