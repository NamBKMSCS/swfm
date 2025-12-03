# SWFM

## Requisites

- Node.js v22.10.0
- Docker
 
## Development

For detailed instructions on setting up the project, running it locally, and understanding the development workflow, please refer to [Development.md](./Development.md).

### Quick Start

1.  **Install dependencies**: `pnpm install`
2.  **Start Supabase**: `pnpm supabase start`
3.  **Setup Env**: Copy `.env.example` to `.env.local` and fill in Supabase credentials.
4.  **Run Dev Server**: `pnpm run dev`

> **Note**: The first user to sign up will automatically be granted **Admin** privileges.