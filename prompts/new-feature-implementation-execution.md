Mission : 
The user wants you to implement a plan. 
You will follow that plan and save your fixed issues in a changelog/[feature-name]/[feature]-fixed-issues-report.md file.

You must:
- Respect all stability constraints (see below)
- Avoid breaking existing behavior
- if persistent error, consider implementation options, alternatives, and long-term impact

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
- You must pause and re-assess the entire task using the new obstacle as context
- Then propose a new optimal path that still respects I1

Optional Cross-Tech Exploration:
If you need to re-assess, you are encouraged to:
- Evaluate whether another language (e.g. Go, Python/FastAPI, Rust) or framework could better serve this feature
- Justify trade-offs in performance, complexity, integration effort
- Only recommend it if it passes I1/I2 and includes a **safe integration or sandbox plan**

Required Output:
1. clean, modular, refactored, maintainable code
2. Ensure there are no unused pieces of code, all implemented code must be integrated.
3. Ensure there are no conflicts between pieces of code.
4. Write minimal unit tests for the main functionalities

Replit-specific constraints:
- Do NOT break Vite config, WebSocket, or HMR behavior
- `vite.config.ts` and `server.hmr` are fragile and easily misconfigured
- Even previously working commits have failed to restore a broken state — the system is delicate
- Avoid touching build systems, persistent sockets, or compression unless necessary
- Respect Replit's tooling system

Avoid:
- Over-aggressive deduplication or HTTP/2 changes
- Modifying HMR setup or WebSocket handling
- Introducing new workflows or bypassing Replit's own tooling
- Do NOT alter anything related to the memory system which currently optimal, you can user element of that system for other features but do not alter that system.

Stability is sacred. Never assume it's safe. **Prove it.**