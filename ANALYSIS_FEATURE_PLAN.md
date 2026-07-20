# AI Analysis Feature — Redesign Plan

## 1. Current state (audited)

**Call path.** Four separate trigger sites call `analyzeContactProfile()` in
[`backend/aiService.js`](backend/aiService.js): the webhook handler (fires when a
contact's message count hits 3 or 5, or on first analysis past 2 messages —
[`server.js:335`](backend/server.js#L335)), `POST /api/whatsapp/sync` (once per
contact, only if `ai_summary` is still empty), the manual
`POST /api/ai/analyze/:phone_number` endpoint, and `backend/cron/dailyAnalysis.js`
(nightly at 20:00 for any contact touched in the last 24h).

Every trigger sends the **full transcript** (last 15-20 messages) to a single Grok
call that returns one JSON blob: `summary` (string), `tags` (string[]), `probability`
(int), `intent` (one enum value), `fields` (object), `timeline_update` (string|null).

**Write path.** `applyAiAnalysis()` in [`server.js:24-77`](backend/server.js#L24-L77)
is the canonical writer: it merges `aiData.fields` into the existing `contacts.fields`
array by label, then **overwrites** `ai_summary`, `ai_tags`, `enrollment_probability`,
and `intent` on the `contacts` row, and appends a `system`-sender row to
`interaction_logs` if `timeline_update` was present. `dailyAnalysis.js` does **not**
call `applyAiAnalysis()` — it inlines its own `.update()` that sets only
`ai_summary` / `ai_tags` / `enrollment_probability` / `intent`, dropping `fields`
entirely and skipping the timeline log insert.

**Schema.** `contacts` ([`supabase-schema.sql:28-43`](backend/supabase-schema.sql#L28-L43))
holds `intent` (enum: `contact_intent`), `ai_summary` (text), `ai_tags` (jsonb array),
`fields` (jsonb array of `{label, value}`), `enrollment_probability` (int). None of
the 9 files in `backend/migrations/` add anything to this — no signals table, no
history table, no concern concept, no per-message provenance. `Escalated` is just an
ordinary value of `contact_intent` with no automated workflow behind it anywhere in
the frontend (checked `kanban-board.tsx`, `expanded-chat.tsx`,
`contact-details-modal.tsx` — it's purely a manual dropdown option / filter / color).

### Confirming your five points

1. **Confirmed.** One LLM call → one summary + one tag array + one intent enum + one
   probability, fully overwriting the row every run.
2. **Confirmed.** No "concern"/objection concept exists in the schema or in any
   migration.
3. **Confirmed.** "Interests" are informally whatever Grok puts in `ai_tags` — an
   unstructured, unversioned string array with no confidence or source.
4. **Confirmed.** Nothing preserves prior `ai_summary` / `ai_tags` / `intent` /
   `enrollment_probability` values across runs. There is no way to trend "did their
   enrollment probability go up this week."
5. **Confirmed — real bug, not cosmetic.** `dailyAnalysis.js`'s inline `.update()`
   never writes `fields`, so any `Current High School` / `Target Course` /
   `Intended Intake` extraction Grok produces during a nightly cron run is silently
   discarded, and the `timeline_update` system-log entry that the other three trigger
   paths write is skipped too. The root problem is that "apply analysis result to a
   contact" is implemented twice and the copies have drifted. Worth fixing as part of
   this redesign by having exactly one write path.

---

## 2. Proposed model

### 2.1 `contact_signals` — new append-only table

One row per atomic thing the AI (or, later, a human) observed, instead of one row
per contact holding "the current truth."

| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `contact_id` | uuid fk → contacts | |
| `signal_type` | enum `signal_type` (`intent`, `interest`, `concern`) | the category |
| `label` | text | e.g. `"Courses"`, `"Scholarship"`, `"Housing cost"` — free text for `interest`/`concern`, constrained to the existing `contact_intent` enum values for `intent` signals |
| `confidence` | int (0-100) | model's confidence this signal is real |
| `sentiment` | text/enum, nullable | optional, mainly meaningful for `concern` rows (e.g. `mild`, `blocking`) — nullable because not every signal type needs it |
| `source_message_id` | uuid fk → interaction_logs, nullable | which message the AI derived this from; nullable to allow for future non-message-derived signals (manual entry, sync-time inference) |
| `created_at` | timestamptz | when the signal was recorded (not necessarily when the message was sent) |

Append-only: a re-analysis run inserts new rows, it never updates or deletes old
ones. History becomes "query `contact_signals` ordered by `created_at`," which is
free once the table exists — no separate audit/history table needed.

### 2.2 `contacts.intent` — kept, redefined as "primary intent"

The column stays exactly as it is today (same enum, same type) so nothing consuming
it today breaks: the Kanban board's color/grouping logic, the manual override
dropdown in `contact-details-modal.tsx`, and any filter built on `contacts.intent`.

Going forward it is documented as a **denormalized pointer** — "the label of the
highest-confidence `intent`-type row in `contact_signals` for this contact," kept in
sync by whatever process writes new signals. The manual dropdown in
`contact-details-modal.tsx` continues to write straight to `contacts.intent`
directly (an explicit human override), which naturally takes precedence until the
next AI run recomputes it — same behavior as today, just formalized.

### 2.3 Two denormalized cache columns on `contacts`

- `top_interests jsonb` (small array, e.g. top 3-5 `{label, confidence}`)
- `top_concerns jsonb` (same shape)

Recomputed (not appended) every time new signals are written, from the current
top-N rows in `contact_signals` per type. Purpose is purely so that list views —
Inbox, Kanban cards, `vw_inbox_conversations` — can render a badge without a join or
aggregate query against `contact_signals`. This mirrors how `ai_tags` is consumed
today in `frontend/src/app/api/inbox/route.ts` and `prospect-profile.tsx`, so those
call sites get a very similar-shaped field to swap in.

`ai_tags` and `ai_summary` are not removed by this plan (see open questions below) —
`ai_summary` remains the one free-text field a human reads first; `ai_tags` becomes
redundant with `top_interests` and is a removal/backfill candidate.

### 2.4 Delta analysis

Add a pointer on `contacts` recording how far analysis has gotten, e.g.
`last_analyzed_message_id` (fk → interaction_logs) or `last_analyzed_at`
(timestamptz). Each analysis run:

1. Fetches only `interaction_logs` rows newer than that pointer (instead of the last
   15-20 messages every time).
2. Sends Grok a smaller prompt containing just the new messages, plus a short
   summary of existing state (current `ai_summary`, current top interests/concerns/
   intent) so the model has continuity without re-reading the whole transcript.
3. On success, inserts new `contact_signals` rows, recomputes the two cache columns
   and `intent`, updates `ai_summary`, and advances the pointer.
4. If there are zero new messages since the pointer, skip the Grok call entirely —
   this alone fixes the cron job doing pointless full-transcript re-analysis of
   contacts that haven't said anything new in 24h.

This also gives a natural place to collapse the duplicated write logic
(`applyAiAnalysis` vs. `dailyAnalysis.js`'s inline update) into one shared function,
closing the bug in point 5 above as a side effect of the redesign rather than a
separate fix.

---

## 3. Open questions / risks

- **Historical `ai_tags` data.** Existing contacts have accumulated freeform tags
  with no confidence, timestamp, or source message. Do we (a) leave them in place
  and let `top_interests` start fresh going forward, (b) run a one-time backfill
  that converts each existing tag into an `interest`-type `contact_signals` row with
  a synthetic low confidence and `source_message_id = null`, or (c) just drop them?
  Affects whether "top interests" looks empty for existing contacts right after
  migration.
- **Concern severity vs. `Escalated` intent.** Right now `Escalated` is a plain,
  manually-set enum value with zero automation behind it anywhere in the codebase.
  Should a high-confidence/high-severity `concern` signal be allowed to
  auto-promote `contacts.intent` to `Escalated`, or is that a separate feature
  decision (auto-escalation) that shouldn't be silently bundled into this schema
  change? Recommend treating it as out of scope for this plan and flagging it as a
  distinct follow-up.
- **Confidence threshold for the denormalized cache.** What counts as "top" for
  `top_interests`/`top_concerns` — a fixed top-N, a confidence floor, or a
  recency-weighted combination (so a concern raised 3 months ago doesn't outrank one
  raised yesterday just because it was said with slightly higher confidence)?
- **Un-analyzed message backlog.** Contacts with more history than the current
  15-message cap were previously getting fresh full-context analysis. Delta
  analysis means a message from months ago that was never captured under the old
  window is now permanently outside the model's view unless a backfill run treats
  "no last_analyzed pointer" as "analyze everything once."
- **Signal decay/contradiction.** Append-only means a `concern` from a resolved
  issue (e.g. "worried about fees" then later "fees are sorted, thanks") never
  disappears from history, only gets diluted in the top-N recompute. Is that
  acceptable, or do we need the model to be able to emit a "retraction" of a prior
  signal?
- **`fields` overlap.** `contacts.fields` (school/course/intake) is a separate
  freeform mechanism from `contact_signals` and is untouched by this plan — worth
  confirming that's intentional (fields = factual profile data, signals = inferred
  behavioral data) rather than something that should also be modeled as a signal
  type.

---

## 4. Rollback

If Grok's extended JSON contract (`intents`/`interests`/`concerns`) turns out to need
adjustment after real usage — bad label granularity, confidence values that don't mean
anything useful, whatever — the new signal writes can be disabled without touching the
columns the rest of the app already depends on. The cut point is `applyAiAnalysis()` in
`backend/aiAnalysisRunner.js`: guard the `contact_signals` insert (lines ~98-100) and the
`top_interests`/`top_concerns` fields in the `contacts` update (lines ~130-131) behind an
env flag, e.g. `if (process.env.CONTACT_SIGNALS_ENABLED !== 'false') { ... }`, defaulting
to enabled. With it off, `analyzeContactProfile()` can keep returning the extended shape
harmlessly (the unused arrays are just ignored) while `ai_summary`, `ai_tags`,
`enrollment_probability`, `intent`, and `fields` keep being written exactly as they are
today — none of those five ever depended on the new table or columns, so disabling signal
writes is a one-file, no-migration change, and turning it back on later doesn't require
backfilling anything since `contact_signals` is append-only and simply resumes accumulating
from whenever it's re-enabled.

## Status

Implemented: migrations 009 (`contact_signals` + denormalized caches) and 010
(`vw_contact_top_signals`, `top_signals()` RPC, `vw_inbox_conversations` extension),
delta-analysis in `aiService.js`/`aiAnalysisRunner.js`, and the read/display layer
(`/api/contacts/:phone_number/signals`, `/api/analytics/signals/top`, the Concerns card in
`prospect-profile.tsx`, and the admin "Top Concerns This Week" widget).
