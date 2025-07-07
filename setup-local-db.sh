#!/bin/bash

# Local PostgreSQL Database Setup Script
# This script sets up a local PostgreSQL database that mirrors your Neon setup

set -e

echo "🚀 Setting up local PostgreSQL database..."

# Configuration
DB_NAME="wellness_ai_local"
DB_USER="wellness_user"
DB_PASSWORD="wellness_local_pass"
LOCAL_PORT="5432"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if PostgreSQL is running
if ! pg_isready -h localhost -p $LOCAL_PORT > /dev/null 2>&1; then
    echo -e "${YELLOW}Starting PostgreSQL service...${NC}"
    brew services start postgresql@14
    sleep 3
    
    if ! pg_isready -h localhost -p $LOCAL_PORT > /dev/null 2>&1; then
        echo -e "${RED}❌ Failed to start PostgreSQL. Please check your installation.${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ PostgreSQL is running${NC}"

# Create database user if it doesn't exist
echo "Creating database user..."
psql postgres -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || echo "User already exists"

# Create database if it doesn't exist
echo "Creating database..."
psql postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || echo "Database already exists"

# Grant privileges
echo "Granting privileges..."
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
psql postgres -c "ALTER USER $DB_USER CREATEDB;"

# Create .env.local file
echo "Creating .env.local file..."
cat > .env.local << EOF
# Local Development Database Configuration
# This file is used for local development only
# Replit will continue to use its own Neon database

DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:$LOCAL_PORT/$DB_NAME

# Copy other environment variables from your production setup
# Add your API keys and other configurations here
OPENAI_API_KEY=your_openai_key_here
GOOGLE_AI_API_KEY=your_google_key_here

# Local development flags
NODE_ENV=development
USE_LOCAL_DB=true
EOF

echo -e "${GREEN}✅ .env.local created${NC}"

# Update .gitignore to include .env.local
if ! grep -q ".env.local" .gitignore 2>/dev/null; then
    echo ".env.local" >> .gitignore
    echo -e "${GREEN}✅ Added .env.local to .gitignore${NC}"
fi

echo -e "${YELLOW}📋 Next steps:${NC}"
echo "1. Copy your API keys to .env.local"
echo "2. Run: npm run db:setup-local"
echo "3. Run: npm run dev:local"
echo ""
echo -e "${GREEN}🎉 Local database setup complete!${NC}"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo "Connection: postgresql://$DB_USER:$DB_PASSWORD@localhost:$LOCAL_PORT/$DB_NAME"