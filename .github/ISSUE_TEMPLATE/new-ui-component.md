---
name: New UI Component / Page
about: Add a new component or page to the Next.js frontend
title: "ui: "
labels: ["frontend", "enhancement"]
assignees: []
---

## Summary

<!-- Describe the component or page to build -->

## Route / Location

<!-- Where does this live in apps/web/src? -->
- **App Router path**: `apps/web/src/app/` <!-- e.g. forum/[slug]/page.tsx -->
- **Component path** (if reusable): `apps/web/src/components/` <!-- e.g. components/Forum/ThreadCard.tsx -->

## API Endpoints Consumed

<!-- List the API endpoints this component calls -->
- `GET /api/` 

## Props / Data Shape

```typescript
// Expected data / props interface
interface Props {
  
}
```

## Design Notes

<!-- Describe layout, Tailwind classes, colour tokens, interactive states, etc.
     Reference tailwind.config.js tokens: primary, accent, surface, bg, text -->

## Behaviour

<!-- Describe user interactions, loading states, error states, empty states -->

- Loading: 
- Error: 
- Empty: 
- Success: 

## Relevant Files

<!-- Help Copilot find similar existing components to follow as patterns -->
- `apps/web/src/app/`
- `apps/web/src/components/`
- `apps/web/src/lib/`

## Acceptance Criteria

- [ ] Component renders correctly with real API data
- [ ] Uses Server Component by default; `"use client"` only if hooks/browser APIs required
- [ ] Tailwind CSS only — no inline styles
- [ ] Responsive (mobile + desktop)
- [ ] Loading, error, and empty states handled
- [ ] `npm run lint && npm run typecheck` passes
