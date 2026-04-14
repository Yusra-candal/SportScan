# Spor Karne - Sports Student Digital Report Card

## Overview

A Turkish-language web application for PE teachers to manage student athletic performance. Teachers can add students with personal info (name, class, birth date, height, weight) and evaluate their performance across three sports: volleyball (voleybol), basketball (basketbol), and football (futbol). Each student gets a digital report card with performance metrics and rankings.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Charts**: Recharts (radar charts for student performance)

## Key Features

- **Dashboard**: Overview with total students, metrics, sport breakdowns, top performers, recent activity, class stats
- **Student Management**: CRUD for students with search and class filtering
- **Report Card**: Individual student report card with sport averages, overall average, radar charts
- **Performance Evaluation**: Rate students on speed, endurance, strength, agility, technique, teamwork (1-10 scale)
- **Rankings**: Sport-specific rankings for voleybol, basketbol, futbol

## Data Model

- **students**: id, name, className, birthDate, height, weight, createdAt
- **performance_metrics**: id, studentId, sport, speed, endurance, strength, agility, technique, teamwork, overallScore, notes, evaluationDate, createdAt

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Project Structure

- `artifacts/spor-karne/` — React + Vite frontend (Turkish UI)
- `artifacts/api-server/` — Express 5 API server
- `lib/api-spec/` — OpenAPI spec (source of truth)
- `lib/api-client-react/` — Generated React Query hooks
- `lib/api-zod/` — Generated Zod validation schemas
- `lib/db/` — Drizzle ORM schema and database client

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
