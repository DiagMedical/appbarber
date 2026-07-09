# AppBarber - Claude Guide (Operating Manual for AI Agents)

> 🚨 **IMPORTANT**: READ THIS BEFORE TAKING ANY ACTION.
> Any AI agent accessing this codebase MUST follow this guide. Do not reverse, rewrite, or roll back features from completed sessions.

## Current State (Session 10 Complete)

All code for Phase 1 & 2 is fully written, validated with `npm run build`, and committed locally. 
- **Database changes** are in `supabase/migrations/20260709*`.
- **Backend changes** are in `supabase/functions/notify-appointment/` and `reengage/`.
- **Frontend changes** are locally committed and include the new RHF+Zod `ShopSettings.tsx` page, sidebar integration, secure `cancel_token` support in `ManageBooking.tsx`, and telephone fields for barbers.

---

## 🚨 NEXT STEPS FOR ANY AGENT (DO NOT SKIP OR REORDER)

You must proceed strictly in this order:

### STEP 1: Verify Production/Deploy Tasks (Manual Tasks)
Ask the user if they have run the following steps. **Do not write new code until these are confirmed/done:**
1. **Git Push**: Send local commits to trigger Vercel deploy:
   ```bash
   git push origin main
   ```
2. **Supabase SQL Editor**: Run the SQL blocks in the `ROADMAP.md` Fase 0 (SQL-A, SQL-B, SQL-C) in the Supabase Dashboard.
3. **Edge Functions Deploy**: Verified as deployed via CLI:
   - `notify-appointment` is deployed.
   - `reengage` is deployed.

### STEP 2: QA & Validation (Real Testing)
Before writing any code for Phase 3, perform a QA validation:
- Test creating a booking on the public site and confirm:
  1. The client receives a WhatsApp message with the secure `cancel_token` link.
  2. The barber receives the new booking notification.
  3. Clicking the cancellation link successfully cancels the appointment without issues.

### STEP 3: Proceed with Phase 3 (New Features)
Only after Steps 1 & 2 are validated, proceed with Phase 3 in this order:
1. **[FEAT-4] Multi-service in Admin**: Update `src/pages/Appointments.tsx` and `src/pages/Booking.tsx` to support selecting multiple services (calculate cumulative duration, sum prices, query available slots by total duration, and save references).
2. **[FEAT-5] price_at_booking**: Track historical pricing in reports.
3. **[FEAT-6] Rescheduling in ManageBooking**: Allow self-service rescheduling.

---

## Hard Rules & Conventions

1. **No direct shadcn/ui edits**: Do not modify files in `src/components/ui/` directly. 
2. **Form Standards**: Always use React Hook Form + Zod.
3. **Timezone**: All dates/times must be stored and manipulated in UTC-3 (`America/Sao_Paulo` / offset `-03:00`).
4. **Build verification**: Always run `npm run build` after any change to ensure zero TypeScript/linter errors.
5. **Types**: Strict TypeScript. Do not use `any`.

---

## Relationship to other files
- `ROADMAP.md`: Living checklist showing granular tasks. Keep it updated using `[x]`.
- `AGENTS.md`: Technical history and session logs.
