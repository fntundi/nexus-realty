# Nexus Realty: Product Requirements Document

**Status:** Living document. Update it at the end of every build phase.
**Owner:** Product owner (agent / founder). **Prepared with:** project management and business analysis review.
**Last updated:** 2026-10-26

---

## 1. Vision and Mission

Nexus Realty is an intelligent platform that connects real estate builders, agents and lenders around one shared, transparent view of every deal. It also gives each party the tools to manage leads and transactions, with guidance specific to each market.

**Problem:** A single home purchase involves a buyer, an agent, a lender, often a builder, and sometimes a seller. Each party works in a separate tool, so status is unclear, documents are chased by email, and deals slip.

**Solution:** One hub per deal that every party can see (within their permissions), plus a CRM and automation layer for the professionals who pay for the product.

## 2. Business Context and Decisions Made

| Topic | Decision |
|---|---|
| Launch market | South Carolina. Likely first metros: Charleston, Greenville, Myrtle Beach. |
| Paying customers | Lenders, agents, builders/developers. |
| Free users | Buyers and sellers. |
| First user | The product owner (an agent). The first pilot is their own deals. |
| Brokerage partnership | Set aside for now. Revisit before outside parties are invited. |
| Seller portal | Deferred to Phase 2. |
| CRM migration | CSV file import. No direct third-party CRM API dependency. |

### Dead ends (do not retry)
- **Follow Up Boss API key integration:** rejected by the product owner. Use CSV import.
- **Embedding the app in an iframe:** flagged as a clickjacking risk. Embedding stays disabled.

## 3. Users and Roles

| Role | Pays? | Primary goals |
|---|---|---|
| Agent | Yes | Manage leads and deals, keep every party moving, close faster. |
| Lender | Yes | Receive complete borrower documents early, verify them, see deal timing. |
| Builder / Developer | Yes | Track community sales, buyers and project milestones. |
| Buyer | Free | Know where the deal stands and what is needed next. |
| Seller | Free (Phase 2) | See offers and progress on their sale. |
| Admin | n/a | Operate the platform, configure markets, rules and automations. |

## 4. Scope by Phase

### Phase 0: Stabilize the core (current)
- [x] Lead auto-assignment reads weights from the Market record. It no longer depends on the removed AssignmentRule entity. *(Fixed. A full assignment has not yet been tested with a real lead.)*
- [x] Security hardening of backend functions (see section 7).
- [ ] **Regression test** of automations after the security changes:
  - Stage-change tasks and notifications
  - Drag-and-drop deal board and its stage workflow
  - Drip campaigns
  - Reminders and daily alerts
  - Closing-date and high-value deal checks
- [ ] End-to-end test of lead assignment using a lead in a market with an active agent.

### Phase 1: Shared Deal Hub (in progress)
Target: three parties per deal (agent, one partner lender, one builder, plus the buyer).

| Epic | Description | Status |
|---|---|---|
| A. Shared deal timeline | One stage timeline per deal visible to all parties. | Built (basic). Needs deal data to validate. |
| B. Group message thread | One thread per deal for buyer, agent, lender. | Built (reuses existing messaging). |
| C. Document requests | A party requests a specific document from another (for example a lender requests a pay stub). Tracks requested, uploaded, verified. | Not started. |
| D. Delay alerts | Notify when a deal stage stalls beyond a threshold. | Not started. |
| E. Consent capture | Email/SMS consent recorded per contact. | Not started. |
| F. Builder participation | Builder linked to the deal and community; visible in the hub. | Not started. |

### Phase 2: Expansion
- Seller portal
- Additional builders, lenders and metros
- Payments / subscriptions for paying roles
- Market-specific guidance content

## 5. Functional Requirements

### 5.1 Lead management and routing
- Leads enter from property inquiry, registration, showing request, favorite, or external import.
- Auto-assignment scores agents using the market's configured weights: territory, workload, rotation, success rate, property-type performance, lead-source performance.
- Assignment method is recorded (auto, manual by builder, manual by admin).
- Unassigned leads remain visible to admins.

### 5.2 CRM
- Contacts, interactions, tasks, lead scoring (rules plus model), segments.
- **CSV bulk import** for migrating from external CRMs (replaces API integration).
- Team inbox and unified communication hub.

### 5.3 Transactions and deal board
- Stages: pre-qualification, showing, offer, under contract, closing, closed.
- Agent dashboard shows active deals as a mobile-friendly drag-and-drop Kanban board.
- Moving a card updates the stage and triggers the stage workflow (tasks, notifications, emails, checklists).
- Commission fields: percentage, amount, status (pending, earned, paid).

### 5.4 Shared Deal Hub (`/DealHub`)
- Each user sees only deals they belong to (as buyer, lender or agent). Admins see all.
- Shows stage timeline, role-filtered documents with verification status, and the group message thread.
- Documents respect per-role visibility settings.

### 5.5 Documents
- Upload, versioning, AI categorization and AI verification.
- Lender verification status (pending, verified, warn, rejected).
- E-signature through DocuSign (send and status check).
- Role-based visibility for agent, buyer, lender, builder.

### 5.6 Automation
- Email sequences, drip campaigns (score, inactivity, status triggers), nurture workflows.
- Reminders, closing reminders, onboarding reminders, client status updates.
- Alerts for high-value deals and agent performance changes.
- Property alerts from saved searches.

### 5.7 Buyer and lender experience
- Buyer portal: search, favorites, saved searches, showings, messaging, documents.
- Lender portal: pre-approval, document verification, AI borrower Q&A, loan eligibility check.
- Builder tools: development projects and milestones.

### 5.8 Market data and insights
- Market data fetching and caching, AI agent insights, reports, virtual staging, property recommendations.

## 6. Compliance Requirements (gate before inviting outside parties)
1. **RESPA:** Lender referral arrangements in South Carolina must be reviewed by a compliance officer or attorney before any referral flow is live.
2. **Email/SMS consent:** Consent must be captured and honored (unsubscribe, stop on reply) before marketing automation reaches outside contacts.
3. **Data handling:** Borrower documents are sensitive. Access must remain role-restricted and audit-logged.
4. **Brokerage review:** Revisit when the brokerage partnership resumes.

## 7. Security and Access Requirements (implemented; must be preserved)
- Owner-based row-level security on all entities to prevent cross-user data leakage. Vendor entity has its own RLS.
- Centralized authorization helpers (`loadAuthorizedDocument`, `loadAuthorizedTransaction`) in shared security code protect every document and transaction endpoint against IDOR.
- Admin-only: bulk and operational functions (drip execution, performance checks, scheduled checks).
- Internal service-to-service automation calls use a server-side shared secret. Stage-change handling accepts the shared secret or an agent/admin role.
- Email sequences and document verification require authentication.
- Email tracking input is validated and capped to prevent data flooding.
- Borrower Q&A and loan eligibility apply strict input validation and access control.
- Audit logging via a shared logger utility.
- Iframe embedding disabled.

**Rule for future work:** any new endpoint that touches a transaction, document or contact must use the central authorization helpers and be tested with a non-admin user.

## 8. Non-Functional Requirements
- **Responsive:** every agent-facing page works on mobile.
- **Performance:** lists load a page at a time; counts and filters run on the server.
- **Reliability:** automations must fail safely and log errors, never silently skip.
- **Privacy:** minimum data exposure per role.
- **Maintainability:** small focused components; no duplicated logic across backend functions.

## 9. Success Metrics
- Time from lead creation to agent contact
- Share of leads assigned automatically
- Days per stage and total days to close
- Share of requested documents received within 48 hours
- Weekly active deals per agent, lender and builder
- Pilot: number of real closed deals run end to end in the hub
- Paid conversion among lenders, agents and builders (Phase 2)

## 10. Risks and Open Questions

| Risk / question | Mitigation / next step |
|---|---|
| Security changes may have broken automations | Phase 0 regression test before adding features. |
| Hub only shows the happy path with no real data | Create test deals in Test mode and walk the full flow. |
| RESPA / consent exposure | Compliance review before inviting outside parties. |
| Need one builder and one lender to prove the loop | Identify a South Carolina builder and a partner lender. |
| Pricing for lenders, agents, builders undefined | Decide before Phase 2. |
| Brokerage partnership terms | Revisit later. |

## 11. Immediate Next Steps
1. Create sample deals in Test mode and review the Deal Hub with real data.
2. Run the Phase 0 regression test.
3. Build document requests (Epic C).
4. Add delay alerts (D) and consent capture (E).
5. Recruit pilot builder and lender; complete compliance review.

## 12. Change Log
| Date | Change |
|---|---|
| 2026-10-26 | Initial document. Covers decisions to date, security hardening, Deal Hub v1. |