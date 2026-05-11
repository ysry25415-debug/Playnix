# Eldorado Snippet Extraction Notes

Source analyzed: `D:\D1\eldorado.js.txt` (production JS bundle).

## What was extractable

- Angular/custom selectors:
  - `eld-dashboard-header`
  - `eld-currency-offer-listing-page`
  - `eld-checkout-header`
  - `eld-usp-process`
  - `eld-usp-trust`
- Repeated UI atoms:
  - `eld-icon`
  - `eld-button-link`
  - `eld-chip`
  - `eld-skeleton`
  - `eld-game-banner`

## How it was applied in BEN10

- Created organized style layer inspired by Eldorado layout structure:
  - `styles/eldorado/tokens.css`
  - `styles/eldorado/header.css`
  - `styles/eldorado/hero.css`
  - `styles/eldorado/index.css`
- Wired global import in:
  - `src/app/layout.tsx`
- Applied scope classes:
  - Header: `eld-header`
  - Homepage hero: `eld-hero`
