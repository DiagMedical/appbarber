# AppBarber Implementation Brief

## Objective

Improve the product so it feels like a reliable operational system for barbershops, not just a set of screens. The next iteration should make the app easier to trust, faster to use, and clearer in the decisions it asks the user to make.

This brief is written so any agent can pick it up and continue without guessing.

## Status

Implemented and validated.

The current app already includes the operational polish described below. Keep this file as a handoff reference and use it only when the team wants to continue iterating on the same direction.

## Next session sequence

Use this order in the next implementation pass:

1. Replace hardcoded `shop_id` values with the authenticated shop context. This base is now implemented on the main operational screens, including clients.
2. Tighten Supabase RLS policies so data is isolated by shop and user.
3. Audit every date/time creation, filtering, and display path to keep UTC-3 consistent. The main booking, dashboard, appointments, reports, and availability paths are now explicit about UTC-3.
4. Convert remaining manual form flows to `React Hook Form + Zod` where it improves clarity.
5. Validate webhook, cron, and WhatsApp notification behavior after backend changes.

Do not skip steps or reorder them. The first three items are the foundation for the rest.

## What to improve

### 1) Dashboard should show what needs attention now

Current state:
- The dashboard already shows summary cards and a weekly schedule.
- It looks good, but it still reads mostly as a view layer.

Target state:
- Highlight operational priorities first.
- Surface items that need action now, not only totals.
- Make the dashboard answer these questions quickly:
  - What is happening today?
  - What needs confirmation?
  - What is about to start?
  - Which barber is most loaded?

Recommended additions:
- Appointments in the next 2 hours
- Pending confirmations
- Cancelled appointments today
- Load by barber
- Small alert/insight cards for operational attention

### 2) Booking should feel guided and trustworthy

Current state:
- The booking flow already has 3 steps.
- Slots are shown by real availability.

Target state:
- The flow should feel calm, guided, and precise.
- The user should always know what has been selected and what is left.

Recommended additions:
- Sticky booking summary during the whole flow
- Stronger phone validation and input feedback
- Clearer empty state when no slots are available
- Better loading and error states
- Explicit duration and timezone context

### 3) Appointments should have a detail view

Current state:
- Appointments exist in lists and schedule views.

Target state:
- Each appointment should open a detail surface that supports action.

Recommended additions:
- Client info
- Barber and service info
- Status history or status summary
- Fast actions: confirm, reschedule, cancel, complete
- Notes and contact context

### 4) Administrative lists should be faster to manage

Current state:
- Core CRUD pages exist for barbers, services, clients, and appointments.

Target state:
- Lists should be easier to scan and manage repeatedly.

Recommended additions:
- Search and filtering
- More consistent empty states
- Consistent loading states
- Easier editing flow for common fields
- Clearer feedback after save/delete actions

### 5) The product should speak one visual language

Current state:
- The app already has a strong indigo identity.

Target state:
- Every surface should feel like part of the same system.

Recommended additions:
- Standardize status colors and labels
- Standardize time display patterns
- Standardize action button hierarchy
- Keep layout density consistent across pages

## CLAUDE.md direction

`CLAUDE.md` should not duplicate `AGENTS.md`.

Its job should be to act as a short operating manual for agents working in this repo.

Recommended structure:
- Short product context
- Hard rules
- UI and UX expectations
- Code conventions
- Risk areas
- Validation checklist before finishing work

Recommended content for `CLAUDE.md`:
- Do not modify shadcn/ui source components directly
- Keep dark mode as the default
- All displayed times must remain in UTC-3
- Prefer the repo's existing patterns over new abstractions
- Keep booking, timezone, and Supabase changes especially careful
- Verify major UI changes with the app's existing style

## Definition of done

The work is done when:
- The dashboard feels operational, not decorative.
- Booking feels guided and low-friction.
- Appointment details can be inspected and acted on quickly.
- List pages are easier to scan and manage.
- `CLAUDE.md` is shorter, sharper, and not redundant with `AGENTS.md`.
- The updated state has been recorded in the project markdown files.
- The next-session sequence is explicit enough for a fresh agent to follow without extra context.

## Constraints

- Keep TypeScript strict.
- Do not change shadcn/ui source files directly.
- Preserve the existing indigo visual identity.
- Keep all user-facing time display in UTC-3.
- Stay aligned with the current Supabase + WhatsApp architecture.

## Likely files to touch

- `src/pages/Dashboard.tsx`
- `src/pages/Booking.tsx`
- `src/pages/Appointments.tsx`
- `src/pages/Barbers.tsx`
- `src/pages/Services.tsx`
- `src/pages/Clients.tsx`
- `CLAUDE.md`

## Notes for the next agent

- Prefer small, visible gains before larger refactors.
- Keep the app feeling premium, but avoid adding visual noise.
- If a change improves clarity only on paper, it probably is not worth the complexity.
