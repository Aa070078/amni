# packages/shared — API contract (zod schemas + types)

Single source of truth for the API contract consumed by `apps/web` and `apps/api`: envelope, pagination/filter/sort/search conventions, DTOs, error codes, request-id convention.

**Rules:** never redefine contract types in an app; changes propagate to both sides.
