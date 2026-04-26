# Architecture

## Monorepo Layout

- `apps/frontend`: Next.js app router frontend with Tailwind and shadcn-style UI primitives.
- `apps/backend`: NestJS API with Prisma, JWT authentication, partner hierarchy, and statistics endpoints.
- `packages/shared`: Shared enums and DTO-friendly interfaces used by both apps.
- `docker`: Production-oriented Dockerfiles for future NAS deployment.

## Domain Model

- `User`: Admin and partner accounts with `PENDING`, `ACTIVE`, and `BLOCKED` states.
- `InviteCode`: Optional first-access flow records tied to users.
- `Category`: Managed list of participation categories.
- `Participation`: Event records tied to users and categories.

## Access Rules

- Admins can create any user and reset passwords.
- Partners can create direct child partners only.
- Users can view themselves plus all descendants beneath them.
- Blocked users cannot log in or perform protected actions.

## Statistics

Monthly category statistics aggregate participation counts and quantities, grouped by UTC month and category.
