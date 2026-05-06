---
name: Bug Report
about: Report a bug in the Damned platform
title: "bug: "
labels: ["bug", "triage"]
assignees: []
---

## Summary

<!-- A clear, one-sentence description of what is broken -->

## Steps to Reproduce

1. 
2. 
3. 

## Expected Behaviour

<!-- What should happen -->

## Actual Behaviour

<!-- What actually happens — include error messages, stack traces, or screenshots -->

## Environment

- **Affected area**: <!-- e.g. API / Web / Database migration -->
- **Browser / Node version** (if relevant):
- **Relevant URL / route**: <!-- e.g. POST /api/auth/login  or  /forum/[slug] -->

## Relevant Files

<!-- Help Copilot find the right code. List the files most likely involved. -->
- `apps/api/src/routes/` 
- `apps/web/src/app/`
- `packages/db/prisma/schema.prisma`

## Acceptance Criteria

- [ ] The described behaviour no longer occurs
- [ ] Existing tests still pass (`npm run test`)
- [ ] A regression test is added that would have caught this bug
