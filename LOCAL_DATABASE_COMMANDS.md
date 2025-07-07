
# start the application
npm run dev:local
-> Also starts the db server automatically. 
-> ctrl+c stops local dev + database server automatically

# In new worktree
npm install
npm run dev:local
npm run db:push-local -> optional (if schema changes were made in that worktree and need to be applied)

# General info
## start the database
brew services start postgresql

## stop the database 
brew services stop postgresql