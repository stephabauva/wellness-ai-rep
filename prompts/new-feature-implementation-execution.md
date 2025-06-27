Mission : 
Implement a feature in the **safest and most maintainable** manner.

If issues arise you will document them in changelog/<feature-name>/<feature>-issues-and-fixes.md file.

This implementation must:
- Respect all stability constraints (see below)
- Avoid breaking existing behavior

Critical Constraints:

I1 — Feature Isolation:
It is strictly forbidden for any new feature to alter code linked to other features **if it risks modifying or breaking their behavior**, unless you do the following :  
  If alteration is required, you **must**:
  - Assess the **full impact** on all dependent features
  - Anticipate cascade effects
  - Propose **safe mitigation plans** before proceeding

I2 — Adaptive Re-evaluation:
If you encounter any obstacle forcing you to change your approach:
- You are forbidden from "trying something else" blindly
- You must pause and re-assess the entire task using the new constraint
- Then propose a new optimal path that still respects I1

Optional Cross-Tech Exploration:
You are encouraged to:
- Evaluate whether another language (e.g. Go, Python/FastAPI, Rust) or framework could better serve this feature
- Justify trade-offs in performance, complexity, integration effort
- Only recommend it if it passes I1/I2 and includes a **safe integration or sandbox plan**

Required Output:
1. Feature scope and technical context
2. Dependency and risk assessment
3. Option comparison (include alternatives across languages if relevant)
4. Recommended plan
5. Code examples (clean, modular, and documented)
6. Test plan and safety checks
7. Confirmation that app stability (HMR, DB, WebSockets) is preserved
8. Ensure there are no unused pieces of code, all implemented code must be integrated.
9. Ensure there are no conflicts between pieces of code.

Replit-specific constraints:
- Do NOT break Vite config, WebSocket, or HMR behavior
- `vite.config.ts` and `server.hmr` are fragile and easily misconfigured
- Even previously working commits have failed to restore a broken state — the system is delicate
- Avoid touching build systems, persistent sockets, or compression unless necessary

Avoid:
- Over-aggressive deduplication or HTTP/2 changes
- Modifying HMR setup or WebSocket handling
- Introducing new workflows or bypassing Replit's own tooling
- data samples / mock data

All changes must be:
- Local, safe, and reversible
- Fully explained
- Respecting Replit’s tooling model
- Follow typescript best code practice, regularly do a 'npm run check' and fix type errors.

Stability is sacred. Never assume it's safe. **Prove it.**