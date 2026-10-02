# CardSwap Community Guidelines

User-facing community rules and moderator runbook for safety enforcement.

## User-Facing Guidelines

These rules are published at `/legal/community-guidelines` (sourced from `src/locales/vi/legal.json`).

### Prohibited Content

Users must not:
1. **Counterfeit cards**: Listings must feature real, authentic Pokémon TCG cards only
2. **Fake or misleading listings**: Photos must accurately represent the card (condition, damage, authenticity)
3. **Harassment or abuse**: No hate speech, threats, doxxing, or personal attacks
4. **Spam**: No unsolicited promotional content, repeated messages, or commercial spam
5. **Scams**: No attempts to defraud, extort, or exploit other collectors
6. **Prohibited items**: (See separate Prohibited Items list below)
7. **Personal information**: No sharing of addresses, phone numbers, or payment details in public
8. **Adult content**: No NSFW images or explicit material
9. **Illegal goods**: No stolen or contraband items
10. **Self-harm or violence**: No content promoting self-harm or violence

### Prohibited Items

The following are not allowed on CardSwap:
- Counterfeit or fake cards
- Heavily damaged or water-damaged cards (unless accurately disclosed)
- Tampered or altered cards
- Non-English/Japanese cards (v1 supports EN + JA only)
- Services or non-physical items
- Grading services (cards must be ungraded or include grading certificate)

### Consequences of Violation

**First offense**: Warning (user receives message in-app)
**Second offense**: Listing hidden (admin review required to restore)
**Third offense**: Account suspension (30 days; can appeal)
**Egregious violations** (scam, counterfeit): Permanent ban

Users can appeal suspensions via contact form on legal page.

---

## Moderator Runbook

Admin queue at `/admin` (requires `role = 'ADMIN'` in profiles table).

### Role Assignment

Only platform owner can assign moderators. Via SQL:
```sql
UPDATE profiles SET role = 'ADMIN' WHERE username = 'moderator_username';
```

### Views in Admin Queue

#### 1. Open Reports
- **Location**: `/admin` (default view)
- **Shows**: Reports with status = 'OPEN', sorted by created_at DESC
- **Fields**:
  - Report reason (e.g., FAKE_CARD, HARASSMENT, SCAM_SUSPICION)
  - Details (user-provided description, max 1000 chars)
  - Reporter username
  - Target (user or listing)
  - Created date

**Actions**:
- Click report → view target user profile or listing
- **Resolve Report**: Choose status + add resolution note
  - `RESOLVED`: Upheld; admin took action (hide listing, suspend user)
  - `DISMISSED`: Invalid report; no action taken
  - Note (optional): Reason for decision (logged)

#### 2. Hidden Listings
- **Shows**: Listings with moderation_status != VISIBLE
- **Statuses**:
  - `HIDDEN_PENDING_REVIEW`: Auto-hidden by 3+ reporter threshold; awaiting admin review
  - `REMOVED`: Admin deleted listing (permanent)
- **Actions**:
  - Review listing photos + description
  - `Approve`: Set status back to VISIBLE (restore listing)
  - `Remove`: Set status to REMOVED (permanent deletion from search)

#### 3. Suspended Users
- **Shows**: Users with status = SUSPENDED
- **Fields**:
  - Username, display name
  - Suspension date (updated_at)
- **Actions**:
  - Click user → view profile + listing history
  - `Restore`: Set status back to ACTIVE (lift suspension)
  - `Extend suspension**: Update note + update timestamps (re-suspend)

#### 4. Moderation Log
- **Shows**: All moderation_actions, most recent first
- **Fields**:
  - Admin who took action
  - Action type (resolve_report, hide_listing, suspend_user)
  - Target (user or listing)
  - Note + timestamp
- **Read-only**: For audit trail only

### Common Workflows

#### Workflow A: Report Fake Listing
1. User files report: "This card doesn't match the photo"
2. Moderator receives notification (real-time in v1.1)
3. Open Reports view → click report
4. Review listing photos + card metadata
5. Determine: Listing violates prohibited items (misrepresentation)
6. **Action**: 
   - Resolve report → status RESOLVED
   - Hide listing (set moderation_status = HIDDEN_PENDING_REVIEW)
   - Send message to seller: "Listing hidden. Please update photos or we'll remove it."
   - Log action: action = "hide_listing", reason = "Misrepresentation (fake condition)"

#### Workflow B: Report Harassment
1. User files report: "Seller sent me threatening messages"
2. Open Reports view → click report
3. Click target user → view conversation thread
4. Read messages; confirm harassment
5. **Action**:
   - Resolve report → status RESOLVED
   - Suspend user: Set account_status = SUSPENDED
   - Log action: action = "suspend_user", reason = "Harassment"
   - Send message to reported user (in-app): "Account suspended for violating community guidelines. Contact support to appeal."

#### Workflow C: Appeal Suspension
1. Suspended user contacts support email
2. Support team reviews case + recommends action
3. Moderator sets account_status = ACTIVE
4. Log action: action = "appeal_approved", reason = "User apologized; will monitor"

### Response Targets (v1.1)

Response time targets (not enforced in v1):
- **Critical** (scam, harassment, counterfeit): < 4 hours
- **High** (misleading listing): < 24 hours
- **Medium** (minor rule violation): < 48 hours
- **Low** (appeal, question): < 1 week

### Rate Limiting on Reports

Users are rate-limited:
- **20 reports per calendar day** per user
- Enforced by `reports_before_insert` trigger
- Error: "Rate limited. Please try again tomorrow."

**Abuse pattern detection** (v1.1):
- If same user files > 10 reports, all against one target → flag for review (likely vendetta)

### Auto-Hide Trigger

Implemented in `reports_auto_hide()` trigger:
```sql
CREATE TRIGGER reports_auto_hide AFTER INSERT ON reports
  FOR EACH ROW EXECUTE FUNCTION reports_auto_hide();
```

Logic:
- When report inserted, count distinct reporters for same listing
- If count >= 3 and listing.moderation_status = VISIBLE:
  - Set listing.moderation_status = HIDDEN_PENDING_REVIEW
  - Seller receives notification (real-time v1.1; email fallback)

**Admin review required** to restore or remove listing permanently.

### Escalation to Legal / Law Enforcement

For severe violations:
- **Counterfeit goods**: Screenshots + seller info → provide to Vietnamese police (offline process)
- **Scam/fraud**: Collect all messages + transaction evidence → provide to fraud team
- **Child safety**: Contact Supabase abuse team (they escalate to NCMEC/local authorities)

**Not handled in app**: CardSwap does not arbitrate transactions or resolve payment disputes (no payments in v1).

### Bulk Actions (Future, v1.1)

**Suspend all listings by user**:
- Moderator selects user → "Suspend all listings"
- Queries: `UPDATE card_listings SET is_active = false WHERE seller_id = X`
- Logs: One moderation_action per listing

**Mass import blocklist**:
- If hosting platform shares counterfeit seller list:
- Admin uploads CSV (username, reason)
- Script: `UPDATE profiles SET status = SUSPENDED WHERE username IN (csv)`
- Logs: One action per user

---

## Admin Security

### Access Control
- `/admin` route guarded by `RequireAdmin` component
- Component calls `is_admin()` RPC (security-definer)
- RPC checks: `profiles.role = 'ADMIN'` AND `auth.uid()` matches current user
- Redirect to `/dashboard` if not admin

### Audit Logging
Every action writes to `moderation_actions` table:
- Immutable (no updates/deletes)
- Includes admin ID, action type, target, timestamp, note
- Indexed on (created_at DESC) for admin log view

### Rate Limits on Admin
- No rate limits (admins trusted)
- But all actions logged → traceable

### Admin Account Protection
- Use strong unique password (or Google account for v1)
- Enable 2FA on auth.users account (Supabase settings)
- Never share admin credentials

---

## Reporting & Communication

### User Reports
- **File report**: Click card/profile → "Report" button
- **Types**: Report reason (FAKE_CARD, HARASSMENT, SCAM_SUSPICION, etc.)
- **Form fields**: Reason + optional details (max 1000 chars)
- **Confirmation**: "Report submitted. We'll review within 24 hours."

### Seller Notifications
When listing is hidden:
- **In-app notification** (v1): Badge on dashboard, message in settings
- **Email** (v1.1): "Your listing 'Charizard' has been hidden for review."
- **Appeal link**: Button to contact support + provide new photos

### Community Safety Notice
Displayed on landing + marketplace:
```
CardSwap is a community marketplace. We rely on you to report 
violations. If you see counterfeit cards, harassment, or scams, 
please report it. All reports are reviewed by our team.

Learn more: [Community Guidelines]
```

---

## Moderation Philosophy

**Principles**:
1. **Community first**: Enforce rules fairly; protect honest collectors
2. **Proportional**: Warnings for minor issues; suspensions only for egregious violations
3. **Transparent**: Publish annual moderation report (v1.1)
   - Total reports filed
   - % resolved / dismissed
   - Common reasons
   - Appeal success rate
4. **Appeal-friendly**: Users can always appeal; document decisions
5. **Privacy-conscious**: Don't share mod decisions publicly; handle privately

---

**Last updated**: 2026-10-02 · **Version**: v1 (launch)
