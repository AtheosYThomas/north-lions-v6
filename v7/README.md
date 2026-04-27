# North Lions v7 Monorepo

This repository is an npm workspaces monorepo for the North Lions platform.

## Workspace Layout

- `client`: Member-facing Vue 3 app.
- `admin`: Admin Vue 3 app.
- `functions`: Firebase Functions backend.
- `shared`: Shared cross-workspace types.

## Prerequisites

- Node.js 20+
- npm 10+
- Firebase CLI (for emulator and deploy workflows)

## Quick Start

1. Install dependencies:
   - `npm install`
2. Prepare environment variables:
   - Copy each `*.env.example` to `.env` in:
     - `client`
     - `admin`
     - `functions`
3. Start local development:
   - Client: `npm run dev:client`
   - Admin: `npm run dev:admin`
   - Functions emulator: `npm run dev:functions`

## Common Commands

- Build all workspaces: `npm run build:all`
- Typecheck all workspaces: `npm run typecheck`
- Run tests: `npm run test`
- Build single workspace:
  - `npm run build:client`
  - `npm run build:admin`
  - `npm run build:functions`

## Environment Variables

Use the template files below as the source of truth:

- `client/.env.example`
- `admin/.env.example`
- `functions/.env.example`

Do not commit real secrets. The parent repository ignore rules already include `.env` and `.env.local`.
