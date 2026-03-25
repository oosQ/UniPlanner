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

- Node.js 20+ (via WSL on Windows recommended)
- npm or pnpm

### Installation & Running the Web Application

1.  **Clone the repository**
    ```bash
    git clone <repository-url>
    cd UniPlanner
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Setup the database**
    ```bash
    # Generate Prisma client
    npx prisma generate
    
    # Create/sync the database
    npx prisma db push
    ```

4.  **Run the development server**
    ```bash
    npm run dev
    ```
    
    The application will start on [http://localhost:3000](http://localhost:3000)

5.  **Open your browser** and navigate to [http://localhost:3000](http://localhost:3000)

For production, configure a PostgreSQL database in your deployment platform.
