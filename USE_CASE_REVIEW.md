# Use Case Diagram Review

This document provides a comprehensive review of the provided Use Case Diagrams (`image.png` and `something.png`) against the actual Next.js frontend and Supabase backend implementation in the codebase.

## 1. Student Ambassador Role

**Current Diagram Coverage:**
- **Well-covered:** The diagram accurately captures `Login`, `Sign Out`, `Clock In/Out for Shift`, `View Inbox Chats`, `View Peer Directory`, `Schedule Consultation / Appointment`, `Manage Profile`, `View Student Pipeline`, and `Send WhatsApp Message`.
- **`<<extend>>` Relationships:** The extension of `View Inbox Chats` by `View Prospect AI Analysis`, and `Send WhatsApp Message` by `Use AI Suggestions` are accurate representations of the UI functionality (AI tools are optional extensions in the chat workspace).

**Discrepancies & Missing Use Cases:**
- **Move Prospect Stage:** The diagram lists `View Student Pipeline` but misses the interactive capability. In the codebase (`/kanban`), Ambassadors can drag and drop cards to move deals across stages in the Kanban board. They should have a `Move Prospect Stage` use case, or `View Student Pipeline` should be renamed to `Manage Student Pipeline`.

## 2. Staff Counselor Role

**Current Diagram Coverage:**
- **Well-covered:** `View Team Inbox (Supervisor Mode)`, `View Peer Directory`, `Schedule Consultation / Appointment`, `Manage Profile`, `View Student Pipeline`, `Send WhatsApp Message`, and `Move Prospect Stage`.

**Discrepancies & Missing Use Cases:**
- **Suggest Rule Change (INCORRECT IN DIAGRAM):** The diagram shows the Counselor linked to `Manage AI Intent Router (routing rules, policy review, KB upload)`. This is strictly an **Admin** function in the codebase (`/admin/intent-router`). Counselors only have the ability to **Suggest a Rule Change** (`/suggestions` route), which goes to the Admin for review and approval.
- **View Analytics Dashboard:** In the codebase, Counselors have a dedicated `/analytics` route in their sidebar to view metrics, enrollments, and leaderboards. The diagram currently only connects Analytics to the System Admin. It must be connected to the Counselor.
- **View Inbox Chats (Personal):** While Counselors have Supervisor Mode, they also have a unified inbox (`/inbox`) where they can directly interact with students. The generic `View Inbox Chats` use case should also be linked to Counselors.

## 3. System Admin Role

**Current Diagram Coverage:**
- **Well-covered:** `Manage System Settings`, `Manage Ambassadors` (part of `/admin/users`), and `Manage Teams` are accurate.

**Discrepancies & Missing Use Cases:**
- **Manage AI Intent Router:** This use case is incorrectly assigned to the Counselor in the diagram. It belongs to the System Admin (`/admin/intent-router`), who reviews policy requests, edits routing rules, and manages the knowledge base.
- **View Inbox Chats:** According to the `AppSidebar` component, Admins have access to the `/inbox` route to view chats across the system. This link is missing in the diagram.
- **View Analytics Dashboard / Admin Dashboard:** The diagram connects the Admin to `View Analytics Dashboard`. While the Admin has an Admin Dashboard (`/admin`) with high-level stats (e.g., active users, pending requests, top concerns), the primary operational Analytics page (`/analytics`) is actually assigned to Counselors. It would be more precise to call the Admin's use case `View Admin Dashboard` or `View System Metrics`.

## 4. `<<include>>` and `<<extend>>` Relationships Review

- **Login / Sign Out:** The diagram shows `Sign Out` connected to `Login` via `<<include>>`. In standard UML, `Sign Out` and `Login` are typically independent use cases. If anything, protected use cases `<<include>>` the `Login` use case. The relationship as drawn is non-standard.
- **AI Features (`<<extend>>`):** The `<<extend>>` relationships for AI Analysis and AI Suggestions are conceptually correct and well-utilized. They represent optional features triggered within the base context of viewing a chat or drafting a message.

## Summary of Recommended Diagram Changes
1. **Ambassador:** Add `Move Prospect Stage` (or allow them to inherit it if you use generalization).
2. **Counselor:**
   - **Remove** `Manage AI Intent Router`.
   - **Add** `Suggest Rule Change`.
   - **Add** a link to `View Analytics Dashboard`.
   - **Add** a link to `View Inbox Chats`.
3. **Admin:**
   - **Add** a link to `Manage AI Intent Router` (moved from Counselor).
   - **Add** a link to `View Inbox Chats`.
   - **Rename** `View Analytics Dashboard` connection to `View Admin Dashboard`.
