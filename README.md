# DevPulse API

Internal Tech Issue & Feature Tracker — a collaborative platform for software teams to report bugs, suggest features, and coordinate resolutions.

Built with **Node.js + TypeScript + Express + PostgreSQL (raw SQL, no ORM, no JOINs)**.

## Tech Stack

| Technology | Usage |
| --- | --- |
| Node.js | Runtime |
| TypeScript | Type safety |
| Express.js | Modular router architecture |
| PostgreSQL (`pg`) | Relational database with raw `pool.query()` |
| bcryptjs | Password hashing (salt rounds = 10) |
| jsonwebtoken | JWT generation & verification |

## Project Structure

```
src/
├── app.ts                      # Express app, routes, middleware
├── server.ts                   # Server bootstrap
├── config/                     # Environment configuration
├── db/                         # PostgreSQL pool + table initialization
├── middleware/
│   ├── auth.ts                 # JWT + role verification
│   ├── globalErrorHandler.ts   # Central error handler
│   └── notFound.ts             # 404 handler
├── modules/
│   ├── auth/                   # signup, login
│   └── issues/                 # issue CRUD
├── types/                      # Shared types & Express request typing
└── utils/                      # AppError, catchAsync, sendResponse, validators
```

## Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Create .env from .env.example and set your values
cp .env.example .env

# 3. Run in development
pnpm dev

# 4. Production build
pnpm build
pnpm start
```

`.env`:

```env
PORT=5000
DATABASE_URL=postgresql://user:password@host:5432/devpulse
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=1d
```

Tables are created automatically on server start (`users`, `issues`).

## Roles

| Role | Permissions |
| --- | --- |
| `contributor` | Sign up / log in, create issues, view issues, update own issue (only while status is `open`) |
| `maintainer` | Everything a contributor can do, plus update any issue, change status, delete issues |

## API Endpoints

Base URL: `http://localhost:5000`

| Method | Endpoint | Access |
| --- | --- | --- |
| POST | `/api/auth/signup` | Public |
| POST | `/api/auth/login` | Public |
| POST | `/api/issues` | Authenticated |
| GET | `/api/issues?sort=&type=&status=` | Public |
| GET | `/api/issues/:id` | Public |
| PATCH | `/api/issues/:id` | Authenticated (role rules apply) |
| DELETE | `/api/issues/:id` | Maintainer only |

Send the token in the header (both formats are accepted):

```
Authorization: <token>
Authorization: Bearer <token>
```

### 1. Signup

```http
POST /api/auth/signup
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john.doe@devpulse.com",
  "password": "securePassword123",
  "role": "contributor"
}
```

`role` is optional and defaults to `contributor`. Allowed values: `contributor`, `maintainer`.

**201 Created**

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john.doe@devpulse.com",
    "role": "contributor",
    "created_at": "2026-01-20T09:00:00.000Z",
    "updated_at": "2026-01-20T09:00:00.000Z"
  }
}
```

### 2. Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john.doe@devpulse.com",
  "password": "securePassword123"
}
```

**200 OK**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john.doe@devpulse.com",
      "role": "contributor",
      "created_at": "2026-01-20T09:00:00.000Z",
      "updated_at": "2026-01-20T09:00:00.000Z"
    }
  }
}
```

The JWT payload contains `id`, `name`, and `role`.

### 3. Create Issue

```http
POST /api/issues
Authorization: <token>
Content-Type: application/json

{
  "title": "Database connection timeout under load",
  "description": "Pool exhausts after 50+ concurrent queries, causing 500 errors",
  "type": "bug"
}
```

`title` max 150 characters, `description` min 20 characters, `type` is `bug` or `feature_request`.
`reporter_id` comes from the token, never from the request body.

**201 Created**

```json
{
  "success": true,
  "message": "Issue created successfully",
  "data": {
    "id": 1,
    "title": "Database connection timeout under load",
    "description": "Pool exhausts after 50+ concurrent queries, causing 500 errors",
    "type": "bug",
    "status": "open",
    "reporter_id": 1,
    "created_at": "2026-01-20T10:30:00.000Z",
    "updated_at": "2026-01-20T10:30:00.000Z"
  }
}
```

### 4. Get All Issues

```http
GET /api/issues?sort=newest&type=bug&status=open
```

| Query | Values | Default |
| --- | --- | --- |
| `sort` | `newest`, `oldest` | `newest` |
| `type` | `bug`, `feature_request` | – |
| `status` | `open`, `in_progress`, `resolved` | – |

**200 OK**

```json
{
  "success": true,
  "message": "Issues retrived successfully",
  "data": [
    {
      "id": 1,
      "title": "Database connection timeout under load",
      "description": "Pool exhausts after 50+ concurrent queries, causing 500 errors",
      "type": "bug",
      "status": "open",
      "reporter": {
        "id": 1,
        "name": "John Doe",
        "role": "contributor"
      },
      "created_at": "2026-01-20T10:30:00.000Z",
      "updated_at": "2026-01-20T10:30:00.000Z"
    }
  ]
}
```

Reporter details are fetched with a separate query (`WHERE id = ANY(...)`) — no SQL JOINs.

### 5. Get Single Issue

```http
GET /api/issues/1
```

**200 OK** — same shape as a single item above.

### 6. Update Issue

```http
PATCH /api/issues/1
Authorization: <token>
Content-Type: application/json

{
  "title": "Updated: Database pool exhaustion fix needed",
  "description": "Updated description with reproduction steps...",
  "type": "bug"
}
```

Rules:

- `maintainer` can update any issue and may also send `status`.
- `contributor` can update only their own issue and only while its status is `open`.
- Contributor attempts to edit a non-open issue return **409 Conflict**.
- Contributor attempts to change `status` return **403 Forbidden**.

**200 OK**

```json
{
  "success": true,
  "message": "Issue updated successfully",
  "data": {
    "id": 1,
    "title": "Updated: Database pool exhaustion fix needed",
    "description": "Updated description with reproduction steps...",
    "type": "bug",
    "status": "open",
    "reporter_id": 1,
    "created_at": "2026-01-20T10:30:00.000Z",
    "updated_at": "2026-01-20T14:45:00.000Z"
  }
}
```

### 7. Delete Issue

```http
DELETE /api/issues/1
Authorization: <maintainer token>
```

**200 OK**

```json
{
  "success": true,
  "message": "Issue deleted successfully"
}
```

## Error Responses

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": ["description must be at least 20 characters"]
}
```

| Code | When |
| --- | --- |
| 400 | Validation error, invalid filter, duplicate email |
| 401 | Missing / invalid / expired token, wrong credentials |
| 403 | Valid token but insufficient role or ownership |
| 404 | Issue not found |
| 409 | Business conflict (contributor editing a non-open issue) |
| 500 | Unexpected server error |

## Database Schema

**users**

| Column | Type | Notes |
| --- | --- | --- |
| id | SERIAL | Primary key |
| name | VARCHAR(255) | Required |
| email | VARCHAR(255) | Required, unique |
| password | VARCHAR(255) | bcrypt hash, never returned |
| role | VARCHAR(20) | `contributor` / `maintainer`, default `contributor` |
| created_at | TIMESTAMP | Default `NOW()` |
| updated_at | TIMESTAMP | Updated on every update |

**issues**

| Column | Type | Notes |
| --- | --- | --- |
| id | SERIAL | Primary key |
| title | VARCHAR(150) | Required |
| description | TEXT | Required, min 20 chars |
| type | VARCHAR(20) | `bug` / `feature_request` |
| status | VARCHAR(20) | `open` / `in_progress` / `resolved`, default `open` |
| reporter_id | INT | Taken from the JWT |
| created_at | TIMESTAMP | Default `NOW()` |
| updated_at | TIMESTAMP | Updated on every update |
