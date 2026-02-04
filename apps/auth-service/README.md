# Auth Service - RBAC Authentication

## Overview

The Auth Service provides Role-Based Access Control (RBAC) authentication for the Welo Data Annotation Platform. It uses JWT tokens with mock JSON user storage, designed for easy migration to Okta.

## Features

- ✅ JWT-based authentication with access and refresh tokens
- ✅ 5 user roles: ADMIN, OPS_MANAGER, ANNOTATOR, REVIEWER, CUSTOMER
- ✅ Granular permission-based authorization
- ✅ Mock JSON user storage (Okta-ready architecture)
- ✅ Password management (change password)
- ✅ Profile management
- ✅ Session validation
- ✅ Role and permission guards for route protection

## Architecture

```
auth-service/
├── src/
│   ├── auth/
│   │   ├── dto/
│   │   │   └── auth.dto.ts          # DTOs for auth operations
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts    # JWT validation guard
│   │   │   ├── roles.guard.ts       # Role-based access guard
│   │   │   └── permissions.guard.ts # Permission-based access guard
│   │   ├── strategies/
│   │   │   └── jwt.strategy.ts      # Passport JWT strategy
│   │   ├── decorators/
│   │   │   ├── roles.decorator.ts   # @Roles() decorator
│   │   │   └── permissions.decorator.ts # @RequirePermissions() decorator
│   │   ├── auth.controller.ts       # REST API endpoints
│   │   ├── auth.service.ts          # Business logic
│   │   ├── auth.module.ts           # NestJS module
│   │   └── mock-users.json          # Mock user database
│   ├── app.module.ts
│   └── main.ts
```

## User Roles & Permissions

### ADMIN
- **Permissions**: `*` (all permissions)
- **Access**: Full system access

### OPS_MANAGER
- **Permissions**:
  - project.create, project.read, project.update, project.delete
  - batch.create, batch.read, batch.update
  - workflow.create, workflow.read, workflow.update
  - task.read, task.assign
  - user.read
- **Access**: Operations management, workflow design, batch uploads

### ANNOTATOR
- **Permissions**:
  - task.read, task.claim, task.submit
  - annotation.create, annotation.read, annotation.update
- **Access**: Task annotation only

### REVIEWER
- **Permissions**:
  - task.read
  - annotation.read, annotation.review, annotation.approve, annotation.reject
  - quality.read
- **Access**: Review and approve/reject annotations

### CUSTOMER
- **Permissions**:
  - project.read, batch.read
  - report.read
  - export.download
- **Access**: View projects, download reports and exports

## API Endpoints

### Public Endpoints (No Auth Required)

#### POST `/api/v1/auth/login`
Login with email and password.

**Request:**
```json
{
  "email": "admin@welo.com",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "expiresIn": 3600,
    "user": {
      "id": "user-admin-001",
      "email": "admin@welo.com",
      "name": "Admin User",
      "role": "ADMIN",
      "permissions": ["*"],
      "status": "ACTIVE",
      "createdAt": "2026-01-01T00:00:00Z"
    }
  },
  "message": "Login successful"
}
```

#### POST `/api/v1/auth/register`
Register a new user.

**Request:**
```json
{
  "email": "newuser@welo.com",
  "password": "password123",
  "name": "New User",
  "role": "ANNOTATOR"
}
```

**Response:** Same as login

#### POST `/api/v1/auth/refresh`
Refresh access token using refresh token.

**Request:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response:** Same as login (new tokens)

### Protected Endpoints (Auth Required)

#### POST `/api/v1/auth/logout`
Logout current user (invalidates refresh token).

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response:**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

#### GET `/api/v1/auth/me`
Get current user profile.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user-admin-001",
    "email": "admin@welo.com",
    "name": "Admin User",
    "role": "ADMIN",
    "permissions": ["*"],
    "status": "ACTIVE",
    "createdAt": "2026-01-01T00:00:00Z"
  }
}
```

#### GET `/api/v1/auth/session`
Validate current session.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "user": { /* user object */ }
  }
}
```

#### PATCH `/api/v1/auth/profile`
Update user profile.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Request:**
```json
{
  "name": "Updated Name",
  "email": "newemail@welo.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* updated user object */ },
  "message": "Profile updated successfully"
}
```

#### PATCH `/api/v1/auth/password`
Change password.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Request:**
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newPassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

## Test Accounts

Use these accounts for testing:

| Email | Password | Role | Description |
|-------|----------|------|-------------|
| admin@welo.com | admin123 | ADMIN | Full system access |
| ops@welo.com | ops123 | OPS_MANAGER | Project/workflow management |
| annotator@welo.com | annotator123 | ANNOTATOR | Task annotation |
| reviewer@welo.com | reviewer123 | REVIEWER | Annotation review |
| customer@welo.com | customer123 | CUSTOMER | View projects/reports |

## Usage Examples

### Protecting Routes with Guards

#### Role-Based Protection

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { Roles } from './auth/decorators/roles.decorator';
import { UserRole } from './auth/dto/auth.dto';

@Controller('projects')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectsController {
  
  @Get()
  @Roles(UserRole.ADMIN, UserRole.OPS_MANAGER)
  async listProjects() {
    // Only ADMIN and OPS_MANAGER can access
    return this.projectsService.list();
  }
  
  @Post()
  @Roles(UserRole.ADMIN, UserRole.OPS_MANAGER)
  async createProject() {
    // Only ADMIN and OPS_MANAGER can create
    return this.projectsService.create();
  }
}
```

#### Permission-Based Protection

```typescript
import { Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { PermissionsGuard } from './auth/guards/permissions.guard';
import { RequirePermissions } from './auth/decorators/permissions.decorator';

@Controller('tasks')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TasksController {
  
  @Post()
  @RequirePermissions('task.create', 'project.read')
  async createTask() {
    // User must have both 'task.create' AND 'project.read' permissions
    return this.tasksService.create();
  }
  
  @Post('submit')
  @RequirePermissions('task.submit')
  async submitTask() {
    // User must have 'task.submit' permission
    return this.tasksService.submit();
  }
}
```

#### Getting Current User

```typescript
import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Controller('profile')
export class ProfileController {
  
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req) {
    // req.user contains: { userId, email, role, permissions }
    return {
      userId: req.user.userId,
      email: req.user.email,
      role: req.user.role,
      permissions: req.user.permissions,
    };
  }
}
```

## Environment Variables

Create a `.env` file in the root of `welo-platform`:

```env
# Auth Service
JWT_SECRET=welo-secret-key-change-in-production
JWT_EXPIRATION=1h
REFRESH_TOKEN_EXPIRATION=7d

# Database (if using TypeORM)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=welo_platform
```

## Running the Service

### Development Mode

```bash
# From welo-platform root
npm run start:dev auth-service
```

Service will be available at: `http://localhost:3002`

### Production Mode

```bash
npm run build auth-service
npm run start:prod auth-service
```

## Testing

### Manual Testing with curl

#### 1. Login
```bash
curl -X POST http://localhost:3002/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@welo.com",
    "password": "admin123"
  }'
```

#### 2. Get Current User
```bash
curl -X GET http://localhost:3002/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### 3. Refresh Token
```bash
curl -X POST http://localhost:3002/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

### Testing with Postman

1. **Import Collection**: Create a Postman collection with all endpoints
2. **Set Environment Variable**: Store `accessToken` after login
3. **Use in Headers**: Add `Authorization: Bearer {{accessToken}}`

## Token Management

### Access Token
- **Expiration**: 1 hour
- **Type**: JWT
- **Payload**: userId, email, role, permissions
- **Usage**: Include in Authorization header for all protected requests

### Refresh Token
- **Expiration**: 7 days
- **Type**: JWT
- **Payload**: userId only
- **Usage**: Use to get new access token when expired

### Token Refresh Flow

```
1. Client makes request with expired access token
2. Backend returns 401 Unauthorized
3. Client calls /auth/refresh with refresh token
4. Backend validates refresh token
5. Backend generates new access + refresh tokens
6. Client stores new tokens
7. Client retries original request with new access token
```

## Migration to Okta

### Preparation Checklist

- [ ] Create Okta developer account
- [ ] Configure application in Okta dashboard
- [ ] Define groups in Okta (map to roles)
- [ ] Configure group claims
- [ ] Test Okta integration in dev environment
- [ ] Update environment variables
- [ ] Replace mock auth with Okta SDK
- [ ] Implement user sync from Okta
- [ ] Test all role/permission mappings
- [ ] Update documentation

### Okta Integration Steps

1. **Install Okta SDK:**
```bash
npm install @okta/okta-auth-js @okta/okta-sdk-nodejs
```

2. **Update auth.service.ts:**
```typescript
import { OktaAuth } from '@okta/okta-auth-js';

async login(dto: LoginDto) {
  const oktaAuth = new OktaAuth({
    issuer: process.env.OKTA_ISSUER,
    clientId: process.env.OKTA_CLIENT_ID,
    redirectUri: process.env.OKTA_REDIRECT_URI,
  });
  
  const transaction = await oktaAuth.signInWithCredentials({
    username: dto.email,
    password: dto.password,
  });
  
  // Generate internal JWT with role/permissions
  // ...
}
```

3. **Map Okta Groups to Roles:**
```typescript
const roleMapping = {
  'Welo-Admins': UserRole.ADMIN,
  'Welo-Ops': UserRole.OPS_MANAGER,
  'Welo-Annotators': UserRole.ANNOTATOR,
  'Welo-Reviewers': UserRole.REVIEWER,
  'Welo-Customers': UserRole.CUSTOMER,
};
```

## Security Best Practices

### Current Implementation (Mock)
- ✅ JWT tokens with expiration
- ✅ Role-based access control
- ✅ Permission-based access control
- ⚠️ Passwords in plain text (mock only)
- ⚠️ No rate limiting
- ⚠️ No audit logging

### Production Recommendations
- ✅ Use bcrypt for password hashing
- ✅ Implement rate limiting (e.g., @nestjs/throttler)
- ✅ Add audit logging for all auth events
- ✅ Use HTTPS only
- ✅ Store tokens in HttpOnly cookies (not localStorage)
- ✅ Implement CSRF protection
- ✅ Add MFA support via Okta
- ✅ Regular security audits
- ✅ Monitor for suspicious activity

## Troubleshooting

### 401 Unauthorized
- Check if token is expired (use /auth/refresh)
- Verify JWT_SECRET matches between services
- Ensure Authorization header format: `Bearer {token}`

### 403 Forbidden
- User doesn't have required role/permission
- Check user.permissions array
- Verify @Roles() or @RequirePermissions() decorator

### Token Refresh Not Working
- Check if refresh token is expired (7 days)
- Verify refresh token was stored after login
- Check if user logged out (refresh token invalidated)

### User Not Found
- Check mock-users.json file exists
- Verify email/password match exactly
- Check user status is "ACTIVE"

## Support

For issues or questions:
- Check RBAC_AUTH_IMPLEMENTATION.md for detailed documentation
- Review API endpoints in Swagger: http://localhost:3002/api
- Check logs: `npm run start:dev auth-service`

## License

Proprietary - Welo Platform
