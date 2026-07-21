# UniCrew Use Case Specifications

These specifications describe the use cases in `unicrew-use-case-diagram.drawio` as the system actually behaves, based on the current codebase (Next.js frontend, Express backend, Supabase Postgres). Actor assignments have been corrected against the code where they diverged from the diagram (see notes on UC-06, UC-12, UC-13, UC-14, and UC-23).

**Update:** This document was originally verified against commit `60cce15`. Several follow-up commits (`d8d9f54`, `0122152`, `751c3b1`, `0076f79`) have since implemented real backing for **Change Password** (UC-03) and **Schedule Consultation/Appointment** (UC-09) and completed CRUD for **Manage Teams** (UC-17) — those sections below are left as historical record of the earlier gap but no longer reflect current behavior; treat their "Not Implemented"/"Partially Implemented" tags as outdated. **Manage System Settings** (previously UC-21) was never implemented beyond a UI mock, and has now been removed from both the codebase and the diagram rather than built out — its section has been deleted from this document.

---

## UC-01: Login

| Field | Detail |
|---|---|
| **ID** | UC-01 |
| **Actors** | Student Ambassador, Counselor, System Admin |
| **Description** | An internal user signs in with an email and password to reach their dashboard. |
| **Preconditions** | The user already has an `internal_users` account created by an admin. |
| **Trigger** | The user opens the app and lands on the login page, or is redirected there after their session expires. |
| **Main Flow** | 1. The user enters email and password on `/login`.<br>2. The client calls `supabase.auth.signInWithPassword`.<br>3. Supabase validates the credentials and returns a session.<br>4. The app looks up the matching `internal_users` row for the account's role.<br>5. The user is redirected to the dashboard for their role. |
| **Alternate Flows** | None. |
| **Exception Flows** | 1. Wrong email or password: Supabase returns an auth error and the form shows it inline.<br>2. Account has no matching `internal_users` row: the user is signed out and shown an access-denied message. |
| **Postconditions** | A valid session exists and the sidebar reflects the user's role. |
| **Related Use Cases** | Included by: UC-06 (View Team Inbox), UC-02 (Sign Out re-auth flow). |
| **Notes / Evidence** | `frontend/src/app/login/page.tsx:37`. |

---

## UC-02: Sign Out

| Field | Detail |
|---|---|
| **ID** | UC-02 |
| **Actors** | Student Ambassador, Counselor, System Admin |
| **Description** | The user ends their session from anywhere in the dashboard. |
| **Preconditions** | The user is logged in. |
| **Trigger** | The user clicks "Sign Out" in the sidebar. |
| **Main Flow** | 1. The user clicks the sign-out control.<br>2. The app calls the Supabase sign-out method.<br>3. The local session is cleared.<br>4. The user is redirected to `/login`. |
| **Alternate Flows** | None. |
| **Exception Flows** | Network failure during sign-out: the client still clears local session state and redirects. |
| **Postconditions** | The session is invalidated; protected routes require login again. |
| **Related Use Cases** | Includes UC-01 (returns to Login). |
| **Notes / Evidence** | `frontend/src/contexts/auth-context.tsx:126-131`; button at `frontend/src/components/app-sidebar.tsx:258-268`. **Modeling note:** `signOut()` just calls `supabase.auth.signOut()` and redirects — it doesn't execute the Login flow. An «include» arrow pointing from Sign Out to Login (as drawn in the diagram) reverses the usual convention; Login is better modeled as a precondition for the next session, not a step Sign Out performs. |

---

## UC-03: Change Password (Not Implemented)

| Field | Detail |
|---|---|
| **ID** | UC-03 |
| **Actors** | Student Ambassador, Counselor, System Admin |
| **Description** | As drawn, a logged-in user would update their own password from a profile or account screen. |
| **Preconditions** | N/A |
| **Trigger** | N/A |
| **Main Flow** | N/A |
| **Alternate Flows** | N/A |
| **Exception Flows** | N/A |
| **Postconditions** | N/A |
| **Related Use Cases** | None found. |
| **Notes / Evidence** | No self-service password change route exists in the repo. The login page only shows static "contact IT support" text (`frontend/src/app/login/page.tsx:149-159`). An admin can set a temporary password when creating a user (`frontend/src/app/api/admin/users/route.ts:101-124`), but that is part of UC-16 (Manage Ambassadors), not this use case. Recommend removing this use case from the diagram or marking it as a future feature. |

---

## UC-04: Clock In/Out for Shift

| Field | Detail |
|---|---|
| **ID** | UC-04 |
| **Actors** | Student Ambassador |
| **Description** | An ambassador records the start and end of their working shift. |
| **Preconditions** | The user is logged in with the ambassador role. |
| **Trigger** | The ambassador opens the shift widget and clicks Clock In or Clock Out. |
| **Main Flow** | 1. The ambassador clicks Clock In.<br>2. The client sends a POST to the shift endpoint.<br>3. The backend writes a row to `ambassador_shifts` with a start timestamp.<br>4. Later, the ambassador clicks Clock Out.<br>5. The backend updates the same row with an end timestamp. |
| **Alternate Flows** | None. |
| **Exception Flows** | Clocking out with no open shift: the API rejects the request. |
| **Postconditions** | The shift record reflects the worked duration. |
| **Related Use Cases** | None. |
| **Notes / Evidence** | `frontend/src/app/api/ambassador/shift/route.ts`; sidebar visibility gated by `role === "ambassador"` in `app-sidebar.tsx:208`. |

---

## UC-05: View Inbox Chats (My Chats)

| Field | Detail |
|---|---|
| **ID** | UC-05 |
| **Actors** | Student Ambassador, Counselor, System Admin |
| **Description** | The user views the list of WhatsApp conversations assigned to them and opens one to read the message history. |
| **Preconditions** | The user is logged in. |
| **Trigger** | The user navigates to the Inbox page. |
| **Main Flow** | 1. The user opens `/inbox`.<br>2. The client requests the chat list, scoped to `assigned_to = self` for ambassadors.<br>3. The list renders with contact name, last message, and timestamp.<br>4. The user selects a conversation.<br>5. The full message history loads in the chat panel. |
| **Alternate Flows** | Counselor or Admin switches to Team Inbox mode (UC-06) to see chats beyond their own. |
| **Exception Flows** | No chats assigned: an empty state is shown. |
| **Postconditions** | The selected conversation's history is visible and marked as read. |
| **Related Use Cases** | Extended by UC-07 (View Prospect AI Analysis). |
| **Notes / Evidence** | `frontend/src/app/api/inbox/route.ts:76-88`. |

---

## UC-06: View Team Inbox (Supervisor Mode)

| Field | Detail |
|---|---|
| **ID** | UC-06 |
| **Actors** | Counselor, System Admin |
| **Description** | A supervisor switches the inbox view from their own chats to every chat across their team. |
| **Preconditions** | The user is logged in as counselor or admin. |
| **Trigger** | The user toggles "Team Overview" on the Inbox page. |
| **Main Flow** | 1. The user clicks the My Chats / Team Overview toggle.<br>2. The client re-requests the chat list without the self-only filter.<br>3. All team conversations render, with an indicator of which ambassador owns each one. |
| **Alternate Flows** | User toggles back to My Chats (UC-05). |
| **Exception Flows** | None found. |
| **Postconditions** | The inbox shows team-wide chats until toggled back. |
| **Related Use Cases** | Alternate view of UC-05. |
| **Notes / Evidence** | Toggle gated by `role === "counselor" || role === "admin"` in `frontend/src/app/(dashboard)/inbox/page.tsx:81,293,313`. **Correction from diagram:** the diagram attaches this use case to Counselor only; System Admin also has access in code and should be connected to it. |

---

## UC-07: View Prospect AI Analysis

| Field | Detail |
|---|---|
| **ID** | UC-07 |
| **Actors** | Student Ambassador, Counselor, System Admin |
| **Description** | The user reviews an AI-generated summary of a prospect's intent, sentiment, and profile details while viewing a chat. |
| **Preconditions** | A conversation is open in the Inbox. |
| **Trigger** | The prospect profile panel loads alongside the chat. |
| **Main Flow** | 1. The user opens a conversation.<br>2. The client calls the analysis endpoint for that phone number.<br>3. The backend's contact analyzer returns intent, sentiment, and summary fields.<br>4. The profile panel displays the analysis next to the chat. |
| **Alternate Flows** | Counselor or Admin can edit the profile fields directly; an ambassador's panel is read-only. |
| **Exception Flows** | Analysis unavailable: the panel shows the raw contact record without AI fields. |
| **Postconditions** | The user has visibility into the prospect's inferred intent while replying. |
| **Related Use Cases** | Extends UC-05 (View Inbox Chats). |
| **Notes / Evidence** | `frontend/src/app/api/ai/analyze/[phone_number]/route.ts`; read-only gating in `inbox/page.tsx:347`. |

---

## UC-08: View Peer Directory

| Field | Detail |
|---|---|
| **ID** | UC-08 |
| **Actors** | Student Ambassador, Counselor |
| **Description** | The user browses a directory of ambassadors, including performance stats and ratings. |
| **Preconditions** | The user is logged in as ambassador or counselor. |
| **Trigger** | The user opens the Peer Directory page. |
| **Main Flow** | 1. The user navigates to the directory.<br>2. The client fetches the ambassador list with aggregated ratings.<br>3. The directory renders each ambassador's profile card and stats panel. |
| **Alternate Flows** | None. |
| **Exception Flows** | None found. |
| **Postconditions** | None persisted; read-only view. |
| **Related Use Cases** | Reads data written by UC-20 (Capture Post-Enrollment Rating). |
| **Notes / Evidence** | Sidebar entries at `app-sidebar.tsx:39,47`; `frontend/src/components/peers/PerformanceStatsPanel.tsx:128-129`. No explicit backend role check was found on the underlying data route. |

---

## UC-09: Schedule Consultation / Appointment (Not Implemented, UI mock only)

| Field | Detail |
|---|---|
| **ID** | UC-09 |
| **Actors** | Student Ambassador, Counselor |
| **Description** | As drawn, a user would book a consultation slot with a prospect and have it persist on a shared calendar. |
| **Preconditions** | N/A |
| **Trigger** | N/A |
| **Main Flow** | N/A |
| **Alternate Flows** | N/A |
| **Exception Flows** | N/A |
| **Postconditions** | N/A |
| **Related Use Cases** | None. |
| **Notes / Evidence** | `frontend/src/app/(dashboard)/calendar/page.tsx` renders a full calendar UI, but its event state is `useState<CalEvent[]>(initialEvents)` (line 170) with no `fetch` calls anywhere in the file. Nothing is read from or written to the database. This is a working prototype screen, not a functioning use case yet. |

---

## UC-10: Manage Profile

| Field | Detail |
|---|---|
| **ID** | UC-10 |
| **Actors** | Student Ambassador, Counselor, System Admin |
| **Description** | The user updates their own profile fields. |
| **Preconditions** | The user is logged in. |
| **Trigger** | The user opens their profile page and edits a field. |
| **Main Flow** | 1. The user opens the profile screen.<br>2. The client loads current profile data.<br>3. The user edits an allowed field and saves.<br>4. The client sends a PATCH to the profile endpoint.<br>5. The backend updates the record. |
| **Alternate Flows** | None. |
| **Exception Flows** | Editing a field outside the allowed set is rejected by the backend. |
| **Postconditions** | The profile record is updated. |
| **Related Use Cases** | None. |
| **Notes / Evidence** | `frontend/src/app/api/profile/route.ts:58-75`. Ambassadors can self-edit only `availability_schedule`; counselors and admins can self-edit `contact_phone` and `avatar_url`. Other ambassador profile fields (bio, photo) are set by an admin through UC-16, not by the ambassador themselves, so this use case is narrower for ambassadors than the diagram implies. |

---

## UC-11: View Student Pipeline

| Field | Detail |
|---|---|
| **ID** | UC-11 |
| **Actors** | Student Ambassador, Counselor, System Admin |
| **Description** | The user views prospects laid out as cards across kanban stages (for example: New, Contacted, Consultation, Enrolled). |
| **Preconditions** | The user is logged in. |
| **Trigger** | The user opens the Pipeline page. |
| **Main Flow** | 1. The user navigates to the pipeline.<br>2. The client requests the kanban board, scoped by role.<br>3. The board renders stages as columns and prospects as cards. |
| **Alternate Flows** | None. |
| **Exception Flows** | Empty stage: the column renders with no cards. |
| **Postconditions** | None; read-only unless the user also performs UC-14 (Move Prospect Stage). |
| **Related Use Cases** | UC-14 (Move Prospect Stage) acts on the same board. |
| **Notes / Evidence** | `frontend/src/app/api/kanban/board/route.ts:52-91`. |

---

## UC-12: Send WhatsApp Message

| Field | Detail |
|---|---|
| **ID** | UC-12 |
| **Actors** | Student Ambassador, Counselor |
| **Description** | The user types and sends a WhatsApp message to a prospect from an open conversation. |
| **Preconditions** | A conversation is open in the Inbox. |
| **Trigger** | The user types a message and clicks Send. |
| **Main Flow** | 1. The user types a message in the chat composer.<br>2. The user clicks Send.<br>3. The client posts to the send endpoint.<br>4. The backend's WhatsApp controller forwards the message to the OpenWA gateway.<br>5. The gateway delivers the message over WhatsApp.<br>6. The sent message appears in the chat history. |
| **Alternate Flows** | UC-13 (Use AI Suggestions) can populate the composer before sending. |
| **Exception Flows** | Gateway unreachable: the send fails and the UI shows an error state on the message. |
| **Postconditions** | The message is recorded in `interaction_logs` and delivered to the prospect. |
| **Related Use Cases** | Extended by UC-13 (Use AI Suggestions). |
| **Notes / Evidence** | `frontend/src/app/api/whatsapp/send/route.ts`; `backend/server.js:99`; composer at `chat-workspace.tsx`. No explicit role gate was found in the send route beyond requiring a valid session, and `chat-workspace.tsx:133,173` sets `senderType` to `"counselor"` for any non-ambassador role, confirming counselors send through the same path in their personal inbox. **Correction from an earlier pass of this document:** Counselor was missing from the actor list even though the code doesn't restrict it to Ambassador. |

---

## UC-13: Use AI Suggestions

| Field | Detail |
|---|---|
| **ID** | UC-13 |
| **Actors** | Student Ambassador, Counselor |
| **Description** | The user requests AI-drafted reply options for the current conversation instead of writing a message from scratch. |
| **Preconditions** | A conversation is open. |
| **Trigger** | The user clicks the AI suggestion control in the chat composer. |
| **Main Flow** | 1. The user clicks for suggestions.<br>2. The client calls the draft-reply endpoint with the conversation context.<br>3. The backend retrieves relevant knowledge base context and generates reply variants.<br>4. Three toned reply options are shown.<br>5. The user picks one, edits it if needed, and sends it (UC-12). |
| **Alternate Flows** | The user discards all suggestions and writes their own message. |
| **Exception Flows** | Generation failure: the composer falls back to a blank message field. |
| **Postconditions** | None until the user sends a message. |
| **Related Use Cases** | Extends UC-12 (Send WhatsApp Message). |
| **Notes / Evidence** | `frontend/src/app/api/ai/draft-reply/route.ts`; invoked from `chat-workspace.tsx:80-105` and `expanded-chat.tsx:121-155`. The Sparkles control isn't wrapped in any role check, so it appears for counselors using their personal inbox tab too, same correction as UC-12. |

---

## UC-14: Move Prospect Stage

| Field | Detail |
|---|---|
| **ID** | UC-14 |
| **Actors** | Student Ambassador, Counselor, System Admin |
| **Description** | The user drags a prospect's card to a different pipeline stage, updating their status. |
| **Preconditions** | The pipeline board is open. |
| **Trigger** | The user drags a card to a new column. |
| **Main Flow** | 1. The user drags a card from one stage to another.<br>2. The client sends the move request with the target stage.<br>3. The backend validates the user's access to that card (own card for ambassadors, team card for counselors, any card for admins).<br>4. If the target stage is "Enrolled," the backend also triggers UC-20 (Capture Post-Enrollment Rating).<br>5. The card updates on the board. |
| **Alternate Flows** | Move rejected: the card snaps back to its original column. |
| **Exception Flows** | Unauthorized move (card not owned by the requesting ambassador): the API returns a permission error. |
| **Postconditions** | The prospect's stage is updated in the database. |
| **Related Use Cases** | Triggers UC-20 when the target stage is Enrolled. |
| **Notes / Evidence** | `frontend/src/app/api/kanban/cards/move/route.ts:93-111`. **Correction from diagram:** the diagram attaches this use case to Counselor only; ambassadors can move their own assigned cards, and admins can move any card. Creating or editing the stages (columns) themselves is restricted to counselor and admin (`frontend/src/app/api/kanban/stages/route.ts:68-69`). |

---

## UC-15: Assign Client under Student Ambassador

| Field | Detail |
|---|---|
| **ID** | UC-15 |
| **Actors** | Counselor, System Admin |
| **Description** | A supervisor assigns a prospect to a specific ambassador for follow-up. |
| **Preconditions** | The prospect exists as a contact and the target ambassador account exists. |
| **Trigger** | The supervisor selects an ambassador from the assignment control on a contact. |
| **Main Flow** | 1. The supervisor opens a contact's details.<br>2. The supervisor picks an ambassador from the assignment list.<br>3. The client sends a PUT request with the target phone number and ambassador ID.<br>4. The backend verifies the target user has the ambassador role.<br>5. The `assigned_to` field on the contact updates. |
| **Alternate Flows** | None. |
| **Exception Flows** | Target user is not an ambassador: the request is rejected. |
| **Postconditions** | The contact's assigned ambassador changes, affecting what shows in that ambassador's inbox (UC-05). |
| **Related Use Cases** | Feeds UC-05 (View Inbox Chats) via the `assigned_to` filter. |
| **Notes / Evidence** | `frontend/src/app/api/contacts/[phone_number]/assign/route.ts:10-47`. Confirmed as counselor/admin only; the code comment states ambassadors work leads rather than reassign them. |

---

## UC-16: Manage Ambassadors

| Field | Detail |
|---|---|
| **ID** | UC-16 |
| **Actors** | System Admin |
| **Description** | The admin creates, disables, or updates internal user accounts. |
| **Preconditions** | The user is logged in as admin. |
| **Trigger** | The admin opens User Management. |
| **Main Flow** | 1. The admin opens the user list.<br>2. The admin creates a new user with a role and temporary password, or edits/bans an existing one.<br>3. The client sends the request to the admin users endpoint.<br>4. The backend verifies admin access and applies the change. |
| **Alternate Flows** | The admin uploads a new avatar for a user. |
| **Exception Flows** | Non-admin attempts the same request: rejected by `verifyAdmin`. |
| **Postconditions** | The `internal_users` record is created, updated, or its status changed. |
| **Related Use Cases** | None. |
| **Notes / Evidence** | `frontend/src/app/api/admin/users/route.ts`, `[id]/route.ts`, `[id]/status/route.ts`, `[id]/avatar/route.ts`. **Naming note:** the diagram labels this "Manage Ambassadors," but the feature covers all internal roles (ambassador, counselor, admin), not ambassadors specifically. The sidebar label is "User Management" (`app-sidebar.tsx:31`). |

---

## UC-17: Manage Teams (Partially Implemented)

| Field | Detail |
|---|---|
| **ID** | UC-17 |
| **Actors** | System Admin |
| **Description** | As drawn, the admin would create, rename, and delete teams. In practice, the admin can only view the existing team list and move users between teams in bulk. |
| **Preconditions** | The user is logged in as admin. |
| **Trigger** | The admin opens Team Management. |
| **Main Flow** | 1. The admin opens the teams page and sees the current team list.<br>2. The admin selects users and reassigns them to a different existing team.<br>3. The client sends the bulk-reassign request.<br>4. The backend updates each selected user's team. |
| **Alternate Flows** | None. |
| **Exception Flows** | None found. |
| **Postconditions** | Selected users' team membership changes. |
| **Related Use Cases** | None. |
| **Notes / Evidence** | `frontend/src/app/api/admin/teams/route.ts` implements GET only; no create, rename, or delete endpoint exists for teams. `frontend/src/app/api/admin/users/bulk-reassign/route.ts` handles moving users between existing teams. Recommend renaming this use case to "Reassign Ambassadors to Teams" unless team CRUD is added later. |

---

## UC-18: Sync WhatsApp History

| Field | Detail |
|---|---|
| **ID** | UC-18 |
| **Actors** | «system» OpenWA Gateway |
| **Description** | The system pulls recent chats and messages from the OpenWA gateway and stores them, either on a schedule or when triggered manually. |
| **Preconditions** | An active WhatsApp session exists on the OpenWA gateway. |
| **Trigger** | A manual sync request, or a scheduled sync job. |
| **Main Flow** | 1. The sync endpoint is called.<br>2. The backend's WhatsApp controller requests recent chats from the gateway.<br>3. Each chat and its messages are upserted into `contacts` and `interaction_logs`. |
| **Alternate Flows** | None. |
| **Exception Flows** | Gateway session expired: the sync fails and logs an error. |
| **Postconditions** | The database reflects the latest WhatsApp state from the gateway. |
| **Related Use Cases** | None. |
| **Notes / Evidence** | `frontend/src/app/api/whatsapp/sync/route.ts`; `backend/controllers/WhatsAppController.js:72-142`. The backend route expects a `userId` in the request body, meaning it's designed to run on behalf of one internal user's session rather than being pushed by the gateway. No page or button anywhere in `frontend/src` currently calls this endpoint — `whatsapp-qr.tsx`, the only WhatsApp-connect screen, only polls `/api/whatsapp/status`. The feature exists at the API layer but has no UI entry point today. |

---

## UC-19: Receive Incoming Message

| Field | Detail |
|---|---|
| **ID** | UC-19 |
| **Actors** | Student Prospect (via «system» OpenWA Gateway) |
| **Description** | A prospect sends a WhatsApp message, which the gateway forwards to the backend as a webhook event and stores as an interaction log. |
| **Preconditions** | A webhook is registered on the active OpenWA session for the backend's public URL. |
| **Trigger** | The prospect sends a WhatsApp message. |
| **Main Flow** | 1. The prospect sends a message from WhatsApp.<br>2. The OpenWA gateway posts the event to `/webhook`.<br>3. The backend's webhook handler upserts the contact and logs the message.<br>4. If the contact has `pending_feedback_for` set, the handler instead routes the reply into UC-20. |
| **Alternate Flows** | Message is a 1-5 rating reply while feedback is pending: handled by UC-20 instead of a normal log entry. |
| **Exception Flows** | Webhook not registered (for example after a session restart): no event is delivered until the webhook is re-registered. |
| **Postconditions** | A new row exists in `interaction_logs`, and the contact record is created or updated. |
| **Related Use Cases** | Extended by UC-20 (Capture Post-Enrollment Rating). |
| **Notes / Evidence** | `backend/server.js:106`; handler at `backend/controllers/WhatsAppController.js:144-220`. |

---

## UC-20: Capture Post-Enrollment Rating

| Field | Detail |
|---|---|
| **ID** | UC-20 |
| **Actors** | Student Prospect (via «system» OpenWA Gateway) |
| **Description** | Once a prospect's card reaches the Enrolled stage, the system prompts them over WhatsApp to rate their experience, and records the score against the ambassador who worked with them. |
| **Preconditions** | A prospect's kanban card is moved to the Enrolled stage (UC-14). |
| **Trigger** | The stage-move to Enrolled runs `maybeSendFeedbackPrompt`. |
| **Main Flow** | 1. A card moves to Enrolled.<br>2. The backend sends a WhatsApp message asking for a 1-5 rating.<br>3. The contact's `pending_feedback_for` field is set to the responsible ambassador.<br>4. The prospect replies with a number.<br>5. The webhook handler (UC-19) detects the pending feedback state and writes the score to `ambassador_feedback`.<br>6. The ambassador's aggregate rating recalculates and shows in the Peer Directory (UC-08). |
| **Alternate Flows** | Prospect never replies: the pending state remains until a new prompt is sent or the field is cleared. |
| **Exception Flows** | Reply is not a valid 1-5 number: it is logged as a normal message instead of a rating. |
| **Postconditions** | A new `ambassador_feedback` row exists, and the ambassador's rating updates. |
| **Related Use Cases** | Extends UC-19 (Receive Incoming Message); triggered by UC-14 (Move Prospect Stage). |
| **Notes / Evidence** | `frontend/src/app/api/kanban/cards/move/route.ts:16-61`; `backend/controllers/WhatsAppController.js:179-193`; schema in `backend/migrations/004_ambassador_directory_enhancement.sql:39-79`; displayed in `frontend/src/components/peers/PerformanceStatsPanel.tsx:128-129`. |

---

## UC-22: View Analytics Dashboard

| Field | Detail |
|---|---|
| **ID** | UC-22 |
| **Actors** | System Admin, Counselor |
| **Description** | The user views aggregated metrics on conversations, pipeline movement, and ambassador performance. |
| **Preconditions** | The user is logged in as admin or counselor. |
| **Trigger** | The user opens the Analytics page. |
| **Main Flow** | 1. The user navigates to Analytics.<br>2. The client requests the overview data.<br>3. The backend scopes results by the requester's role.<br>4. Charts and summary cards render. |
| **Alternate Flows** | Admin views the separate `/admin` dashboard, which additionally surfaces top intent-router signals. |
| **Exception Flows** | No data for the period: charts render empty. |
| **Postconditions** | None; read-only. |
| **Related Use Cases** | None. |
| **Notes / Evidence** | `frontend/src/app/api/analytics/overview/route.ts:126-133`; admin-only signals at `/api/analytics/signals/top`. **Note:** the overview API scopes data by role rather than blocking non-admin/counselor roles outright, though there is no sidebar entry point for ambassadors. |

---

## UC-23: Manage AI Intent Router (routing rules, policy review, KB upload)

| Field | Detail |
|---|---|
| **ID** | UC-23 |
| **Actors** | System Admin |
| **Description** | The admin edits automated routing rules, reviews policy suggestions, and uploads knowledge base content that the AI reply system draws on. |
| **Preconditions** | The user is logged in as admin. |
| **Trigger** | The admin opens the Intent Router page under `/admin`. |
| **Main Flow** | 1. The admin opens the Intent Router page.<br>2. The admin edits a routing rule, or reviews and approves/rejects a policy suggestion, or uploads a knowledge base document.<br>3. The client sends the change to the corresponding endpoint.<br>4. The backend verifies admin access and applies the change. |
| **Alternate Flows** | A counselor submits a policy suggestion through the separate "Suggest a Rule" page, which only creates a `policy_suggestions` row and does not require admin access. |
| **Exception Flows** | Non-admin attempts direct access: rejected by `verifyAdmin`. |
| **Postconditions** | Routing rules, policy suggestion status, or the knowledge base are updated. |
| **Related Use Cases** | None. |
| **Notes / Evidence** | `frontend/src/app/api/routing-rules/route.ts:65-69`; `frontend/src/app/api/policy-suggestions/[id]/route.ts`; page reachable only under `/admin/intent-router`, gated by `admin/layout.tsx`. **Correction from diagram:** the diagram connects both Counselor and Admin to this use case. Commit `63f31cd` ("restrict Intent Router access to admins only") removed counselor access to this page; it is admin-only today. The counselor-facing "Suggest a Rule" feature (`frontend/src/app/api/policy-suggestions/route.ts:69-118`) is a distinct, narrower use case that the diagram does not currently show and may be worth adding separately. |

---

### Summary of recommended diagram changes

1. ~~Remove or flag as future work: **Change Password**, **Schedule Consultation/Appointment**, **Manage System Settings**~~ — superseded: Change Password and Schedule Consultation/Appointment now have real backend support (see the update note at the top of this document). **Manage System Settings** has been removed entirely from the codebase and diagram rather than implemented.
2. ~~Rename **Manage Teams** to reflect that only team listing and bulk user reassignment exist, not team CRUD~~ — superseded: Manage Teams now has full create/rename/delete CRUD.
3. Rename **Manage Ambassadors** to **Manage Users**, since the feature governs all three roles.
4. Add System Admin as an actor on **View Team Inbox (Supervisor Mode)**.
5. Add Student Ambassador and System Admin as actors on **Move Prospect Stage** (keep Counselor too).
6. Remove Counselor from **Manage AI Intent Router**; optionally add a new use case, "Suggest Routing Rule Change," connecting Counselor to a lighter-weight suggestion flow.
7. Add Counselor as an actor on **Send WhatsApp Message** (UC-12) and **Use AI Suggestions** (UC-13); neither route restricts these to Ambassador.
8. Note the reversed «include» direction on **Sign Out → Login** (UC-02); Login should read as a precondition, not a step Sign Out performs.

### A note on the live diagram file

The `.drawio` file on disk was edited while this document was being written: the `uc12` ellipse label changed from "Manage AI Intent Router (routing rules, policy review, KB upload)" to "Suggest Changes AI Intent Router (routing rules, policy review, KB upload)," but its actor lines still connect both Counselor and Admin to that single ellipse, and the label no longer matches the wider admin-only management flow this document describes. If the intent is to split this into two ellipses (a narrow Counselor-facing "Suggest a Rule" node, matching recommendation 6 above, plus a separate Admin-only "Manage AI Intent Router" node), the shape and its edges still need to be split in the file — renaming the single label isn't enough on its own.
