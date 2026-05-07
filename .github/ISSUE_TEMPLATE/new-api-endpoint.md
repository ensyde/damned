---
name: New API Endpoint
about: Add a new REST endpoint to the Express API
title: "api: "
labels: ["api", "enhancement"]
assignees: []
---

## Endpoint Specification

| Field | Value |
|-------|-------|
| **Method** | <!-- GET / POST / PUT / PATCH / DELETE --> |
| **Path** | <!-- e.g. /api/forum/threads/:id/pin --> |
| **Auth required** | <!-- Yes / No / Optional --> |
| **Required permission** | <!-- e.g. forum.pin_thread or leave blank --> |

## Request

**Body / Params / Query:**
```json
{
  
}
```

## Response (success)

```json
{
  "success": true,
  "data": {
    
  }
}
```

## Error Cases

| Status | Condition |
|--------|-----------|
| 400 | Invalid input |
| 401 | Not authenticated |
| 403 | Insufficient permission |
| 404 | Resource not found |

## Database Changes

<!-- Describe any new Prisma models, fields, or relations needed.
     If none, write "No schema changes required." -->

## Relevant Files

<!-- Help Copilot find the right starting points -->
- Route file: `apps/api/src/routes/<resource>.ts`
- Service (if applicable): `apps/api/src/services/<service>.ts`
- Prisma schema: `packages/db/prisma/schema.prisma`
- Shared types: `packages/shared/src/`

## Acceptance Criteria

- [ ] Endpoint responds with the shape described above
- [ ] Input validation uses `express-validator`
- [ ] Authenticated routes use `AuthRequest` middleware
- [ ] Response shape follows `{ success, data }` / `{ success, message }` convention
- [ ] Rate limiting applied if endpoint is sensitive
- [ ] Integration test added (with test DB + Redis)
- [ ] `npm run test` passes
- [ ] `npm run lint && npm run typecheck` passes
