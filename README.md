# PetMate

PetMate is a multi-role pet care platform where pet owners, boarding hosts, and admins collaborate in one system.  
The application includes pet profiles, boarding discovery and booking, in-app chat, favorites/wishlist features, a pet product store, reporting/blocking, and role-based dashboards.

## Stack Logos

<p align="left">
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg" alt="TypeScript" width="42" height="42" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg" alt="Node.js" width="42" height="42" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/angularjs/angularjs-original.svg" alt="Angular" width="42" height="42" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nestjs/nestjs-original.svg" alt="NestJS" width="42" height="42" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/prisma/prisma-original.svg" alt="Prisma" width="42" height="42" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg" alt="PostgreSQL" width="42" height="42" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/socketio/socketio-original.svg" alt="Socket.IO" width="42" height="42" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tailwindcss/tailwindcss-original.svg" alt="TailwindCSS" width="42" height="42" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cypressio/cypressio-original.svg" alt="Cypress" width="42" height="42" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/jest/jest-plain.svg" alt="Jest" width="42" height="42" />
</p>

## Tech Stack

### Core Platform

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-5FA04E?logo=nodedotjs&logoColor=white)
![Angular](https://img.shields.io/badge/Angular-0F0F11?logo=angular&logoColor=DD0031)
![NestJS](https://img.shields.io/badge/NestJS-111111?logo=nestjs&logoColor=E0234E)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?logo=postgresql&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?logo=socketdotio&logoColor=white)

### UI, Testing, and Tooling

![TailwindCSS](https://img.shields.io/badge/TailwindCSS-06B6D4?logo=tailwindcss&logoColor=white)
![Cypress](https://img.shields.io/badge/Cypress-69D3A7?logo=cypress&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-6E9F18?logo=vitest&logoColor=white)
![Jest](https://img.shields.io/badge/Jest-C21325?logo=jest&logoColor=white)
![ESLint](https://img.shields.io/badge/ESLint-4B32C3?logo=eslint&logoColor=white)
![Prettier](https://img.shields.io/badge/Prettier-1A2B34?logo=prettier&logoColor=F7BA3E)
![Render](https://img.shields.io/badge/Render-46E3B7?logo=render&logoColor=111111)

## Platform Roles

- **Guest**: browses landing, public store, and boarding pages.
- **Owner**: manages pets, bookings, favorites, wishlist, orders, profile/settings, and chat.
- **Host**: manages boarding profile, availability/bookings, profile/settings, chat, and orders/wishlist.
- **Admin**: moderates users/content, handles reports/complaints, manages boarding and store operations, tracks system stats.

## Product Workflows

### 1) Guest Journey

1. Open landing page (`/`).
2. Explore public pages (`/store`, `/boarding`).
3. Register or login (`/auth/register`, `/auth/login`).
4. Complete email verification and password recovery when needed.

### 2) Authentication and Account Recovery

1. Register using `/auth/register`.
2. Verify email through `/auth/verify-email`.
3. Login at `/auth/login`.
4. If password is forgotten, use `/auth/forgot-password` -> `/auth/reset-password`.
5. Role guard redirects users into role-specific app shells.

### 3) Owner Core Workflow

1. Access owner app shell (`/app`).
2. Create/update pet profiles (`/app/pets`, `/app/pets/new`, `/app/pets/:id/edit`).
3. Discover boarding options and submit booking requests (`/app/boarding`, `/app/bookings`).
4. Browse store, place orders, and review order history (`/app/store`, `/app/store/orders`).
5. Save interesting entities into favorites and wishlist (`/app/favorites`, `/app/wishlist`).
6. Communicate with hosts/admins via chat (`/app/chat`).
7. Maintain personal settings and profile (`/app/profile`, `/app/settings`).

### 4) Host Core Workflow

1. Access host app shell (`/app/host`).
2. Manage dashboard and incoming bookings (`/app/host/dashboard`, `/app/host/bookings`).
3. Maintain host profile and settings (`/app/host/profile`, `/app/host/settings`).
4. Coordinate via chat (`/app/host/chat`).
5. Interact with shared commerce/favorites views (`/app/host/store`, `/app/host/store/orders`, `/app/host/wishlist`).

### 5) Admin Moderation Workflow

1. Access admin shell (`/app/admin`) with `AdminGuard`.
2. Review platform metrics (`/app/admin/dashboard`, `/app/admin/system-stats`).
3. Manage users and moderation actions (`/app/admin/users`, reports/complaints routes).
4. Supervise boarding and store operations (`/app/admin/boarding`, `/app/admin/store`).
5. Resolve reports and complaints (`/app/admin/reports`, `/app/admin/complaints`).
6. Handle internal communication (`/app/admin/chat`).

### 6) Safety & Trust Workflow

1. Users can block/report problematic users.
2. Admin receives report queues for review and status updates.
3. Moderation outcomes affect visibility, access, and account state.

### 7) Realtime Communication Workflow

1. Authenticated users open role-specific chat pages.
2. Socket-based transport syncs messages in near real time.
3. Chat history and unread/activity states are persisted via backend chat module.

## Backend Domains (NestJS Modules)

- `auth`: login, registration, tokens, email verification, password reset.
- `users`: user profile, account data, role-linked behavior.
- `pets`: owner pet lifecycle management.
- `boarding`: host profiles, availability, bookings, reviews.
- `store`: products, cart/order operations, stock-sensitive actions.
- `chat`: API and socket-based communication.
- `favorites`: favorites across pets/products/boarding profiles.
- `block-report` + `reports`: reporting and moderation flows.
- `admin`: privileged management and operational endpoints.
- `cloudinary`: upload/media workflows.
- `email`: notification and transactional mail features.

## Architecture Overview

- **Frontend**: Angular app with route-level lazy loading and role guards (`OwnerGuard`, `HostGuard`, `AdminGuard`).
- **Backend**: NestJS modular monolith with Prisma ORM and PostgreSQL.
- **Database**: PostgreSQL schema covers users, pets, boarding, bookings, reviews, products, orders, favorites, reports, blocks, and tokens.
- **Realtime**: Socket.IO for chat and active communication flows.
- **Deployment**: Backend service configured for Render (`render.yaml`).

## Getting Started

### Prerequisites

- Node.js 20+ recommended
- npm 10+ recommended
- PostgreSQL database

### 1) Install Dependencies

```bash
npm install
npm install --prefix backend
npm install --prefix frontend
```

### 2) Configure Environment

Create `backend/.env` and set required values:

- `DATABASE_URL`
- `DATABASE_DIRECT_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `CORS_ORIGINS`
- `FRONTEND_URL`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

### 3) Prisma Setup

```bash
npm run prisma:generate:safe
npm run prisma:migrate --prefix backend
```

### 4) Run in Development

```bash
# backend
npm run start:dev:backend

# frontend
npm run start:dev:frontend
```

Or run the backend shortcut:

```bash
npm run start:dev
```

## Useful Commands

### Root

```bash
npm run start:dev
npm run start:dev:backend
npm run start:dev:frontend
npm run prisma:generate:safe
```

### Backend

```bash
npm run build --prefix backend
npm run start:dev --prefix backend
npm run test --prefix backend
npm run test:e2e --prefix backend
npm run test:cov --prefix backend
npm run prisma:migrate --prefix backend
npm run prisma:studio --prefix backend
```

### Frontend

```bash
npm run start --prefix frontend
npm run build --prefix frontend
npm run test --prefix frontend
```

## Project Structure

```text
petmate/
├─ backend/
│  ├─ prisma/
│  │  └─ schema.prisma
│  ├─ scripts/
│  ├─ src/
│  │  ├─ admin/
│  │  ├─ auth/
│  │  ├─ block-report/
│  │  ├─ boarding/
│  │  ├─ chat/
│  │  ├─ cloudinary/
│  │  ├─ common/
│  │  ├─ email/
│  │  ├─ favorites/
│  │  ├─ pets/
│  │  ├─ prisma/
│  │  ├─ reports/
│  │  ├─ store/
│  │  ├─ users/
│  │  ├─ app.module.ts
│  │  └─ main.ts
│  ├─ test/
│  └─ README.md
├─ frontend/
│  ├─ cypress/
│  ├─ public/
│  ├─ src/
│  │  ├─ app/
│  │  │  ├─ core/
│  │  │  ├─ host/
│  │  │  ├─ owner/
│  │  │  ├─ pages/
│  │  │  ├─ shared/
│  │  │  └─ app.routes.ts
│  │  ├─ index.html
│  │  └─ styles.css
│  └─ README.md
├─ docs/
├─ render.yaml
└─ package.json
```

## Roadmap Ideas

- Add sequence diagrams for booking and moderation pipelines.
- Add API endpoint tables for each backend domain.
- Add persona-based acceptance test checklist for Owner/Host/Admin.
- Add architecture decision records (ADRs) in `docs/`.

