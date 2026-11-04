# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React + Vite + TypeScript, Tailwind CSS, React Router, Axios, React Hook Form + Zod, Lucide React (per `gym_management_frontend_handoff_v1.pdf`), plus TanStack Query for server state. Lives in `/frontend` in this repo. Backend: FastAPI + SQLAlchemy + PostgreSQL in `/backend`.

## Users

One user type: the gym owner, the only account (`/api/auth/login`, owner-only). They use it about equally at the front-desk computer during busy hours and on their phone on the gym floor or away from the gym. Desktop and phone layouts get the same priority.

## Product Purpose

Internal operations tool for one gym, Dynamic Gym. It replaces paper or spreadsheet tracking of members, membership plans, subscriptions and payments, and reminds the owner when memberships are about to expire. Success means the owner can register a walk-in, sell a plan, record payment, and see who is expiring or unpaid quickly, without paperwork or doing math by hand.

## Positioning

Built for one gym. It is not a multi-tenant product, so the identity is Dynamic Gym's own rather than a generic SaaS brand.

## Operating Context

- Typical moments: a walk-in signs up at reception; a member renews at the desk; the owner checks expiring memberships between sessions on their phone.
- Payment methods in use: cash, UPI, bank transfer, card, other. Currency is INR (₹), using Indian digit grouping (₹1,00,000). Confirmed by the owner on 2026-10-30.
- Expiry reminders are generated automatically by the backend at 7 days, 3 days and on the expiry day. The UI shows them in-app with an unread count. Email and WhatsApp are out of scope.

## Capabilities and Constraints

- V1 scope: auth, members (register, list, search, filter, detail, update, activate), plans (CRUD, activate; durations 1/3/6/12 months), subscriptions (create, list, detail, renew, cancel; statuses pending/active/expired/cancelled), payments (record with optional allocations to subscriptions, list, detail; statuses recorded/reversed/refunded), notifications (list, unread count, mark read).
- Contract rule: build against real backend schemas. Never show KPIs or aggregates the API cannot correctly back.
- Backend changes are allowed (owner approval, 2026-10-30). Known gaps to close: no CORS middleware; list endpoints return bare arrays with no total; subscription and payment responses carry only `member_id`/`plan_id` UUIDs, not names; no balance-due field.
- The backend generates the member code; display it, never create it in the frontend.
- Out of scope for V1: analytics and revenue reporting, attendance, staff, expenses, email/WhatsApp notifications.

## Brand Commitments

- Name: Dynamic Gym.
- The gym's existing theme is **black and red**. This is binding: the identity must work within it.
- No fixed logo or exact palette values exist. A wordmark and precise color values can be designed within the black-and-red commitment.

## Evidence on Hand

- `gym_management_frontend_handoff_v1.pdf`: endpoint inventory, request/response examples, UX requirements.
- `/backend/app/schemas/*`: authoritative field definitions.
- No real member data, photos, testimonials or brand assets exist. Do not invent any.

## Product Principles

1. Design around the owner's jobs (sign up a walk-in, collect a renewal, check whether someone paid), not around backend modules.
2. Every number shown must come from real data; leave a gap rather than show a fake metric.
3. Money and membership status must be unambiguous. Consequential actions (cancel, deactivate, record payment) get a confirmation step and a clear outcome.
4. Equally good on the front-desk screen and on a phone on the gym floor.

## Accessibility & Inclusion

Per the handoff: status badges carry text labels and never rely on color alone; accessible form labels; full keyboard navigation; visible focus indicators.
