# SWFM

## Requisites

- Node.js v22.10.0
- Docker
 
## Development Process

1. Clone this repository

```bash
git clone https://github.com/LGTM-but-NY/swfm.git
```

2. Install dependencies

```bash
pnpm install
```

3. Run supabase services

```bash
pnpm supabase start
```

4. Copy the `.env.example` file to `.env` and fill in the values
 
```bash
cp .env.example .env
```

5. Run the development server

```bash
pnpm run dev
```

### Database Schema Updates

If you make changes to the Supabase database schema (e.g., adding tables, columns, or enums), you must regenerate the TypeScript types to ensure type safety in the application.

Run the following command:

```bash
pnpm db:gen-types
```

This command will:
1.  Generate TypeScript definitions from your local Supabase instance.
2.  Enhance them using `better-supabase-types` for improved developer experience.
3.  Update `lib/supabase/schema.ts`.