# UniPlanner

A modern replacement for the University of Bahrain course catalog website.

## Project Overview

UniPlanner is a full-stack web application designed to help UOB students plan their schedules, view course details, and manage their major plans.

### Tech Stack

- **Frontend:** Next.js (App Router), TypeScript, TailwindCSS, shadcn/ui, TanStack Query
- **Backend:** Next.js API Routes (via App Router) / NestJS (TBD)
- **Database:** PostgreSQL + Prisma ORM
- **Deployment:** Vercel

## Getting Started

### Prerequisites

- Node.js (via WSL on Windows recommended)
- pnpm or npm

### Installation

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    # or
    pnpm install
    ```
3.  Run the development server:
    ```bash
    npm run dev
    # or
    pnpm dev
    ```
4.  Open [http://localhost:3000](http://localhost:3000) with your browser.

## Milestones

- [x] Milestone 0: Repo setup + architecture
- [ ] Milestone 1: Course catalog UI (mock data)
- [ ] Milestone 2: Database + Prisma schema + API
- [ ] Milestone 3: Ingestion script
- [ ] Milestone 4: Instructor pages
- [ ] Milestone 5: Schedule builder v1
- [ ] Milestone 6: Export (PDF + ICS)
- [ ] Milestone 7: Upload major plan + extraction
- [ ] Milestone 8: Recommendation engine + AI assistant
