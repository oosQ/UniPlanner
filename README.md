# UniPlanner

A modern replacement for the University of Bahrain course catalog website.

## Project Overview

UniPlanner is a full-stack web application designed to help UOB students plan their schedules, view course details, and manage their major plans.

### Tech Stack

- **Frontend:** Next.js (App Router), TypeScript, TailwindCSS, shadcn/ui
- **Backend:** Next.js API Routes
- **Database:** SQLite (Dev) / PostgreSQL (Prod) + Prisma ORM
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
3.  Generate the database client:
    ```bash
    npm run db:generate
    ```
4.  Run the development server:
    ```bash
    npm run dev
    # or
    pnpm dev
    ```
5.  Open [http://localhost:3000](http://localhost:3000) with your browser.
