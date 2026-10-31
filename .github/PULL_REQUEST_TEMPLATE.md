## Description
Summary of the changes made and the motivation behind them.

## Verification Checklist
- [ ] `npm run typecheck` passes with 0 errors
- [ ] `npm run lint` passes
- [ ] `npx tsx scripts/verify-v6-all.ts` passes all 8/8 suites
- [ ] Added or updated test coverage in `tests/` or `tools/`
- [ ] No regression on 500-sample HaGRID real human benchmark
- [ ] No violation of the strict acyclic order: Stage 4 -> Stage 3B
- [ ] Invariants documented in `docs/ARCHITECTURE.md` or `docs/DECISIONS.md`
