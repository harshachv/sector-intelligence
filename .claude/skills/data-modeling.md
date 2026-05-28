# Data Modeling Skill

Use this skill when creating or modifying sector data.

Rules:
- Keep all mock sector data in `src/data/sectors.ts`.
- Every sector must support metrics for 1D, 1W, 1M, and 1Y.
- Use explicit TypeScript types from `src/types/index.ts`.
- Ranking should sort by selected timeframe growth descending.
- Growth, probability, crash risk, regime, risk scale, and consensus must be derived consistently.
- Avoid duplicating data across components.
