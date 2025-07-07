# Local Database Setup Guide

This guide helps you set up a local PostgreSQL database that replicates your Neon database structure while maintaining compatibility with Replit.

## Prerequisites

- PostgreSQL@14 installed via Homebrew (already installed ✅)
- Node.js and npm
- Your existing project dependencies

## Quick Setup

### 1. Run the Setup Script

```bash
npm run db:setup-local
```

This will:
- Start PostgreSQL service if not running
- Create a local database and user
- Generate `.env.local` with local database configuration
- Set up the complete database schema with indexes

### 2. Configure Environment Variables

Edit `.env.local` and add your API keys:

```bash
# Local Development Database Configuration
DATABASE_URL=postgresql://wellness_user:wellness_local_pass@localhost:5432/wellness_ai_local

# Add your API keys
OPENAI_API_KEY=your_openai_key_here
GOOGLE_AI_API_KEY=your_google_key_here

# Local development flags
NODE_ENV=development
USE_LOCAL_DB=true
```

### 3. Start Development Server

```bash
npm run dev:local
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run db:setup-local` | Complete local database setup |
| `npm run dev:local` | Start development server with local database |
| `npm run db:push-local` | Push schema changes to local database |
| `npm run db:reset-local` | Reset and recreate local database |

## How It Works

### Database Switching Logic

The application automatically detects which database to use:

- **Local Development**: Uses PostgreSQL@14 when `USE_LOCAL_DB=true` or `DATABASE_URL_LOCAL` is set
- **Replit**: Uses Neon database with existing configuration
- **Production**: Uses Neon database (unchanged)

### File Structure

```
├── server/
│   ├── db.ts              # Original Neon configuration (unchanged)
│   └── db-local.ts        # New: Smart database switching
├── scripts/
│   └── setup-local-schema.ts  # Schema setup script
├── setup-local-db.sh      # Database initialization script
├── drizzle.config.ts      # Original Drizzle config (unchanged)
├── drizzle.config.local.ts # Local development config
├── .env                   # Replit configuration (unchanged)
└── .env.local            # Local development configuration
```

## Git Worktrees Compatibility

This setup works seamlessly with git worktrees because:

1. **Local Database**: Each worktree can use the same local PostgreSQL instance
2. **Environment Files**: `.env.local` is gitignored and can be copied to each worktree
3. **No Conflicts**: Replit configuration remains unchanged

### Using with Git Worktrees

```bash
# Create a new worktree
git worktree add ../feature-branch feature-branch

# Copy local configuration
cp .env.local ../feature-branch/

# Setup in the new worktree
cd ../feature-branch
npm install
# Ensure PostgreSQL service is running: brew services start postgresql
# If you made schema changes in this worktree, push them: npm run db:push-local
npm run dev:local
```

**Note:** The full `npm run db:setup-local` is a one-time setup per machine. For new worktrees, you primarily need `npm install` and to ensure the PostgreSQL service is active.

## Database Schema

The local database replicates your complete Neon schema including:

- ✅ All tables (users, chat_messages, health_data, etc.)
- ✅ All indexes for optimal performance
- ✅ All constraints and relationships
- ✅ JSONB fields and vector support preparation

## Troubleshooting

### PostgreSQL Not Starting

```bash
# Check if PostgreSQL is running
brew services list | grep postgresql

# Start PostgreSQL
brew services start postgresql@14

# Check connection
pg_isready -h localhost -p 5432
```

### Database Connection Issues

```bash
# Reset local database
npm run db:reset-local

# Check database exists
psql postgres -c "\l" | grep wellness_ai_local
```

### Schema Sync Issues

```bash
# Push latest schema changes
npm run db:push-local

# Or reset and recreate
npm run db:reset-local
```

## Switching Between Environments

### Development (Local)
```bash
npm run dev:local
```

### Development (Neon - for testing)
```bash
npm run dev
```

### Production (Replit)
No changes needed - uses existing Neon configuration

## Benefits

1. **No Quota Limits**: Unlimited local development
2. **Faster Development**: No network latency
3. **Offline Development**: Work without internet
4. **Replit Compatibility**: Zero changes to Replit setup
5. **Git Worktree Support**: Each branch can use the same local DB
6. **Easy Reset**: Quick database reset for testing

## Migration Path

When you're ready to deploy changes:

1. Test locally with `npm run dev:local`
2. Test with Neon using `npm run dev` 
3. Deploy to Replit (no configuration changes needed)

Your Replit environment continues to work exactly as before! 🎉