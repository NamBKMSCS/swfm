# Development Guide

Welcome to the SWFM project! This guide will help you set up your development environment and get started.

## Prerequisites

- **Node.js**: v22.10.0 or higher
- **Docker**: Required for running Supabase locally
- **pnpm**: Package manager

## Getting Started

Follow these steps to set up the project locally:

### 1. Clone the Repository

```bash
git clone https://github.com/LGTM-but-NY/swfm.git
cd swfm
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Start Supabase

Start the local Supabase instance. This will spin up the database, authentication, and other services in Docker containers.

```bash
pnpm supabase start
```

> **Note**: Ensure Docker is running before executing this command.

### 4. Configure Environment Variables

After Supabase starts successfully, it will output the API URL and keys. You need to configure your local environment variables.

1.  Copy the example environment file:
    ```bash
    cp .env.example .env.local
    ```

2.  Update `.env.local` with the values from the `supabase start` output:
    - `NEXT_PUBLIC_SUPABASE_URL`: Your API URL
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your anon key
    - `SUPABASE_SERVICE_ROLE_KEY`: Your service_role key (if needed for server-side admin tasks)

### 5. Run the Development Server

Start the Next.js development server:

```bash
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## User Roles & First Sign-Up

The application has role-based access control (RBAC).

- **Admin**: Full access to all features, including User Management and Data Management.
- **Expert**: Access to Expert Tools (Advanced Modeling, Tuning, Evaluation) and the Dashboard.
- **Guest**: Limited access (Dashboard only).

### Important Note on First Sign-Up

**The first user to sign up in the system is automatically assigned the `admin` role.**

Subsequent users will be assigned the `guest` role by default and must be promoted by an Admin via the User Management page.

## Database Management

If you make changes to the database schema (e.g., adding tables via Supabase Studio at `http://localhost:54323`), you must regenerate the TypeScript types:

```bash
pnpm db:gen-types
```

This ensures that your application code stays in sync with your database schema.
