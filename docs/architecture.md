# Playnix Architecture

## Product Direction

Playnix is being built as a multi-sided gaming marketplace with these core product areas:

- Buyer marketplace
- Seller onboarding and verification
- Offer and inventory management
- Orders and live chat
- Disputes and warranties
- Wallet, payments, and payouts
- Moderation and admin operations

## Frontend Structure

```text
src/
  app/
    page.tsx
    marketplace/page.tsx
    sell/page.tsx
    support/page.tsx
  components/
    home/
    layout/
    shared/
  lib/
    homepage-data.ts
```

## Backend Modules We Will Need

1. `auth`
2. `seller`
3. `catalog`
4. `orders`
5. `protection`
6. `wallet`
7. `payments`
8. `admin`

## Database Recommendation

Use `PostgreSQL` as the main database from day one.

Use `Redis` later for:

- order chat presence
- rate limits
- queue coordination
- cached ranking data

## Core Tables

- `users`
- `profiles`
- `roles`
- `seller_profiles`
- `seller_verifications`
- `seller_category_permissions`
- `games`
- `categories`
- `offers`
- `offer_media`
- `orders`
- `order_items`
- `order_messages`
- `order_events`
- `disputes`
- `dispute_evidence`
- `wallet_accounts`
- `wallet_transactions`
- `payout_accounts`
- `payout_requests`
- `reviews`
- `warranty_claims`
- `support_tickets`

## Infrastructure We Will Need From You

1. A PostgreSQL database
2. A payment provider decision
3. A storage provider for screenshots and evidence
4. A realtime/chat provider or self-hosted alternative
5. A KYC provider if seller verification will be automated
