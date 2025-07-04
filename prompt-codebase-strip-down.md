the codebase is too bloated and complex, with dormant code waiting for production, unused code, duplications, etc..
We must strip down the codebase. All code must be lean, simple, fast, safe, easily testable, no duplicated code or error handling, all code must be integrated, made for production, no unused code. No file can have a size bigger than 300 lines, if it does the file must be refactored in smaller files. No typescript fallbacks for now. With all backend changes we must take into account the complete interactions with the database and frontend. The existing go services functions and must not be broken, one has an issue and must be fixed. 

Additionally, read the current issues at tasks/current-issues and the current user flow in all pages tasks/all-user-flows, which needs to be leaner as well, especially in settings and health dashboard.
A preliminary report was done but needs your validation at codebase-bloat-complexity-analysis-report.md.
Another preliminary report for the idea to migrate everything to Goland was done at typescript-to-go-migration-report.md but needs your hindsights and validation.

ultra think, ultra navigate the codebase, give your hindsights and create the plan