# Notification vendors vs. building our own

Research for [#7](https://github.com/davidwilde/cohort-005-project/issues/7), a child of the map [#4](https://github.com/davidwilde/cohort-005-project/issues/4). Gathered 2026-11-10. Prices and plan limits change often, so re-check the linked pages before you rely on a number.

This document lays out trade-offs. It does not make the build-or-buy call. That decision belongs to [#8](https://github.com/davidwilde/cohort-005-project/issues/8).

## Context checked in the repo

- **Stack:** React Router `8.3.0` (framework mode, SSR), `drizzle-orm` `^0.45.2`, and `better-sqlite3` `^12.8.0` against one `data.db` file in WAL mode. See `package.json` and `app/db/index.ts`.
- **Postmark is not in the codebase yet.** The map and the ticket brief both mention Postmark and `app/lib/mailer.server.ts`, but neither exists on `main` (`32a68e8`), and `git grep -i postmark` returns nothing. Below, "email channel" means whether a vendor can send through Postmark if we adopt it. Confirm in #8 whether Postmark is a real constraint.

## Summary table

| | Knock | Novu | MagicBell | Courier | SuprSend | Home-grown (SQLite + Drizzle) |
|---|---|---|---|---|---|---|
| **Free tier** | 10,000 messages/mo | 10,000 workflow runs/mo, 24 h activity retention | 1,000 deliveries/mo | 10,000 sends/mo | 10,000 notifications/mo, SuprSend branding shown | n/a (no vendor bill) |
| **First paid tier** | Starter: $250/mo with 50,000 messages, then $0.005 each | Pro: from $30/mo with 30,000 runs, then $1.20 per 1,000 | Startup: $249/mo with 50,000 deliveries, then $0.0025 each | Business: $0.005 per send, pay as you go | Essentials: $100/mo with 50,000, then $2 per 1,000 | n/a |
| **Prebuilt React bell + feed** | Yes, `@knocklabs/react` | Yes, `@novu/react` `<Inbox />` | Yes, `@magicbell/react` | Yes, `@trycourier/courier-react` `<CourierInbox />` | Yes, React inbox SDK | No, we build it (shadcn/Radix are already in the app) |
| **Prebuilt preferences UI** | Yes (component plus hooks) | Yes (Preferences inside Inbox) | Yes (`UserPreferences`) | Preference center (hosted or in-app) | Yes (per docs) | No, we build it |
| **Self-host** | Not on public pages (contact sales) | Yes. MIT core ("Community"), with Enterprise self-host as a paid tier | Not documented | Not documented | Enterprise only | Yes, it lives inside our app |
| **Postmark as email provider** | Yes | Yes | Not listed (SMTP is listed) | Yes | Not checked | Already planned, call it directly |
| **Real-time** | WebSocket, managed by Knock | "Real time", managed by Novu (separate WS service when self-hosted) | "Persistent connection", managed by MagicBell | Real time, cross-device read sync | Real time (per vendor) | Our choice: refresh on navigation, poll with `useRevalidator`, or our own SSE |
| **New infra** | None (SaaS) | None on Cloud. Self-hosting needs MongoDB, Redis and S3 | None (SaaS) | None (SaaS) | None (SaaS) | One or two tables in the existing `data.db` |

## Criterion by criterion

### 1. Pricing at small scale

A billable unit differs by vendor. Knock bills per message sent, MagicBell per delivery per channel, Novu per workflow run, and Courier and SuprSend per send or notification. As a result, one event that goes to in-app and email can count once or twice.

- **Knock.** Free plan: $0, "Up to 10,000" messages, Knock branding, 30-day log retention. Starter: "$250/month + additional usage", with 50,000 messages included, then "$0.005 each". Branding removal starts at Starter. Feed retention is unlimited on every plan, and the FAQ says "We don't hard cap your messages." Source: <https://knock.app/pricing>
- **Novu (Cloud).**
  - Free: $0 for 10,000 runs/mo, 5 workflows, 24 h activity-feed retention, and up to 3 team members.
  - Pro: "Starting from $30/month" for 30,000+ runs, then "$1.20 per 1K", with 20 workflows and branding removed.
  - Team: from $250/mo for 250,000+ runs.
  - Source: <https://novu.co/pricing>
- **MagicBell.**
  - Builder: $0 for 1,000 deliveries/mo, with unlimited users.
  - Startup: $249/mo for 50,000 deliveries, then $0.0025 per delivery.
  - Deliveries are counted per channel. In the vendor's own example, 100 in-app recipients plus 50 of them also getting email comes to 150 deliveries.
  - Source: <https://www.magicbell.com/pricing>
- **Courier.**
  - Developer: free for 10,000 sends/mo.
  - Business: "$0.005 per send", with no base fee shown.
  - The page doesn't say what counts as a send or what happens above 10,000 on the free tier.
  - Source: <https://www.courier.com/pricing>
- **SuprSend.**
  - Free: 10,000/mo with SuprSend branding on the inbox.
  - Essentials: $100/mo ($1,200/yr) for 50,000/mo, then $2 per 1,000.
  - Business: $250/mo for 50,000, then $5 per 1,000.
  - The FAQ says requests aren't cut off on the free plan when you go over.
  - Source: <https://www.suprsend.com/pricing>
- **Home-grown.** No vendor fee. The cost is engineering time to build and maintain the feed UI, preferences, email fan-out, and retention, plus a little SQLite storage.

Every vendor has a free tier of 1,000 to 10,000 per month. The jump to the first paid plan is steep for most of them ($249 to $250/mo for Knock, MagicBell, and SuprSend Business). Novu Pro (from $30/mo) and Courier's pay-as-you-go plan are the cheapest ways to pay. Whether we fit a free tier depends on how many Notifications we send, which depends on the event list (#5/#6). Branding removal is a paid feature at Knock, Novu, and SuprSend.

### 2. Prebuilt React inbox / bell components

- **Knock.** `@knocklabs/react` provides `NotificationIconButton` (a bell with an unread/unseen count), `NotificationFeedPopover`, and `NotificationFeed` (full page), plus hooks for a headless/custom UI. The older `@knocklabs/react-notification-feed` package is superseded. Source: <https://docs.knock.app/in-app-ui/react/overview>
- **Novu.** `@novu/react` provides `<Inbox />`, which is built from Bell, Notifications, InboxContent, and Preferences, plus hooks. It needs React ≥ 18 and supports React 19. Updating a subscriber's profile from the client requires an HMAC `subscriberHash`. Source: <https://docs.novu.co/platform/inbox/overview>
- **MagicBell.** `@magicbell/react` provides `FloatingInbox` (with an `InboxButton` bell trigger), `Inbox`, `UserPreferences`, `InlineNotification`, and `ToastContainer`. It needs a User JWT that we generate on our own server. Source: <https://www.magicbell.com/docs/libraries/magicbell-react>
- **Courier.** `@trycourier/courier-react` (v9, React 18+) provides `<CourierInbox />` with theming (`CourierInboxTheme`), custom views, or a fully custom UI. The user signs in with a server-issued JWT. The older `@trycourier/react-inbox` is deprecated. Source: <https://www.courier.com/docs/platform/inbox/inbox-overview>
- **SuprSend.** Lists React inbox SDKs in its docs (<https://docs.suprsend.com/docs/inbox-overview.md>). This was not examined in depth.
- **Home-grown.** There is no prebuilt component. The app already has `radix-ui`, `lucide-react` (which has a `Bell` icon), and `sonner` (toasts), so a bell in a popover plus a `/notifications` route can be built from what's already installed.

### 3. Self-hosting

- **Novu** is the only candidate with a free self-hosted option. The core repo is MIT-licensed, and an `enterprise/` folder is under a commercial licence (<https://github.com/novuhq/novu>).
  - **Community self-hosted includes:** the Inbox component, the user preferences component, and digest.
  - **Community self-hosted lacks:** "Remove Novu branding" (❌), "Email activity tracking" (❌), and it caps team members at 1 (<https://docs.novu.co/community/self-hosted-and-novu-cloud>).
  - **Infra on a single VM:** a 4 vCPU / 8 GB box for API, Worker, WS, and Dashboard, plus MongoDB, Redis (with AOF), and S3-compatible storage (<https://docs.novu.co/community/self-hosting-novu/overview>).
  - That is a large addition next to an app whose whole datastore is one SQLite file.
- **SuprSend** lists "Self-hosted deployment" on Enterprise only (<https://www.suprsend.com/pricing>).
- **Knock.** The public enterprise page (<https://knock.app/enterprise>) mentions "dedicated infrastructure" but not self-hosting. A non-production Knock marketing build found by search mentions an on-prem/VPC option for regulated customers. That is unconfirmed, and you would need to contact sales.
- **MagicBell and Courier.** No self-hosting is documented on the pages checked.
- **Home-grown** is self-hosted by definition, and the data stays in `data.db`.

### 4. Fit with React Router SSR and a single SQLite file

- **Rendering.** None of the vendor React docs checked (Knock, Novu, MagicBell, Courier) give SSR guidance. Each SDK opens a client-side connection authenticated per user. In React Router framework mode, that most likely means rendering the bell only on the client (after hydration) and showing nothing or a placeholder during SSR. This is inference, because no vendor doc says it. The unread count therefore can't be part of the server-rendered HTML unless we also call the vendor's REST API from a loader. That adds a network hop to the vendor during SSR.
- **Auth.** Every vendor needs a signed per-user token minted on our server. Knock's "enhanced security mode" uses an RS256 JWT with a `sub` claim, and the docs say to turn it on in production (<https://docs.knock.app/in-app-ui/security-and-authentication>). Novu uses an HMAC `subscriberHash`, and MagicBell and Courier use a User JWT. That token fits naturally in a root or layout loader.
- **Data model.** With a vendor, the Notification feed lives in the vendor, outside SQLite. Recipients (users) have to be identified to the vendor (Knock "recipients", Novu "subscribers", and so on). We can't join Notifications to `users`, `courses`, or `comments` in SQL, and dev seeding (`npm run db:seed`) won't create feed items unless it calls the vendor.
- **Home-grown.** A `notifications` table in the existing Drizzle schema, read in a loader, puts the unread count straight into SSR. It reuses the session and user IDs we already have, and it is seeded and migrated like every other table (see the `database-migrations` skill).

### 5. Email channel (Postmark)

- **Knock** has a first-party Postmark channel with an API key and From address, optional delivery and bounce webhooks, and tracking. It uses Postmark's default `outbound` stream unless you set a `MessageStream` override. Source: <https://docs.knock.app/integrations/email/postmark>
- **Novu** has a first-party Postmark provider (server API token and From address). Source: <https://docs.novu.co/platform/integrations/email/postmark>
- **Courier** has a first-party Postmark provider, with per-message overrides and support for Postmark templates. Source: <https://www.courier.com/docs/external-integrations/email/postmark>
- **MagicBell** lists Ping Email, SendGrid, Amazon SES, Mailgun, and SMTP. Postmark isn't listed, though Postmark does offer SMTP. Source: <https://www.magicbell.com/docs/channels/email>
- **SuprSend.** Not checked.
- **Home-grown.** We call Postmark ourselves. That means we write the fan-out logic, the per-user email opt-out check, and any batching or digests.

With a vendor, the email templates and the in-app/email routing logic live in the vendor's workflow editor, not in our repo.

### 6. Real-time delivery

- **Knock:** "Our in-app API comes ready with websocket support, no infrastructure setup required." Source: <https://docs.knock.app/in-app-ui/overview>
- **Novu:** The Inbox stays synchronized "in real time". The transport isn't named on the overview page, but the self-host architecture has a dedicated WS service. Sources: <https://docs.novu.co/platform/inbox/overview>, <https://docs.novu.co/community/self-hosting-novu/overview>
- **MagicBell:** "MagicBell maintains a persistent connection to deliver notifications in real-time." Source: <https://www.magicbell.com/docs/channels/in_app>
- **Courier:** Messages arrive in real time, and read/archived state syncs across devices. Source: <https://www.courier.com/docs/platform/inbox/inbox-overview>
- **Home-grown.** React Router loaders re-run on navigation and automatically after actions. For freshness between navigations, `useRevalidator` exists for exactly this: "Revalidate the data on the page for reasons outside of normal data mutations like Window focus or polling on an interval" (<https://reactrouter.com/api/hooks/useRevalidator>). True push would need our own SSE or WebSocket resource route. That's doable on a single Node server but is new code. The map lists "Delivery timing" as unspecified, so how much real-time actually matters is still open.

### 7. Preferences and opt-out

- **Knock.** A `PreferenceSet` covers `workflows`, `categories`, `channel_types`, and `channels`. Unset values default to `true`, and a notification sends only if all applicable preferences are `true`. It also has a `commercial_subscribed` unsubscribe flag and a per-workflow "Override recipient preferences" for must-send messages. Source: <https://docs.knock.app/preferences/overview>
- **Novu.** Preferences can be set per workflow and per channel, globally per channel, or not at all for "critical" workflows (which are hidden from subscribers). The most specific setting wins. Source: <https://docs.novu.co/platform/concepts/preferences>
- **Courier.** Each topic defaults to `OPTED_IN`, `OPTED_OUT`, or `REQUIRED`, with per-topic channel choice (`custom_routing`) and a hosted or in-app preference center. Source: <https://www.courier.com/docs/platform/preferences/preferences-overview>
- **MagicBell.** The `UserPreferences` component lets users toggle channels per category. Source: <https://www.magicbell.com/docs/libraries/magicbell-react>
- **Home-grown.** We'd design the table, for example per user × Notification type × channel, and write the UI ourselves. The vendor models above are useful templates either way.

### 8. Lock-in and migration cost

This section is analysis, drawn from the facts above rather than from any single source.

- **Where the state lives.** With a vendor, the feed history, read/seen state, preferences, and email templates/workflows all live in the vendor. Moving away means exporting or abandoning feed history and preferences, rewriting templates, and swapping the client SDK. Each vendor's component API is proprietary (`NotificationFeedPopover`, `<Inbox />`, `<CourierInbox />`, and so on).
- **Ways to reduce lock-in.**
  - Use the vendor's **headless hooks** with our own UI components. Knock, Novu, and Courier all document this, so a later switch replaces only the data layer.
  - Keep a thin server-side `notify(event)` function that is the only place the vendor's API is called.
- **Novu** has the lowest lock-in of the vendors. The MIT core means a Cloud-to-self-host move is possible, though self-hosting adds MongoDB and Redis.
- **Home-grown** has no vendor lock-in. The costs are ongoing ownership (real-time, digests, retention, email fan-out), and features such as cross-device real-time sync and delivery tracking that vendors include.
- **Hybrid.** Store Notifications in SQLite and render them with our own UI, and send email directly through Postmark. Add a vendor later only for channels or features that justify it. No vendor is needed for this path. It is listed only so #8 can weigh it.

## Open questions for #8

1. Is Postmark actually adopted? It isn't in the repo yet.
2. What is the expected monthly Notification volume? Compare it against the free tiers: 1k (MagicBell) or 10k (Knock, Novu, Courier, SuprSend).
3. Is visible vendor branding in the inbox acceptable on a free tier?
4. Does the bell's unread count need to be in the server-rendered HTML, or is client-only acceptable?
5. Is real-time push a requirement, or is refresh-on-navigation plus polling enough?
