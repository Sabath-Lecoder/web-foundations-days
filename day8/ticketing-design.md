# TicketHub Ticketing Design

## 1. Requirements

### Functional requirements

- Visitors can browse and search events by name, artist, venue, date, and location, and view event details and prices.
- A visitor can view the seat map and current availability for a selected event.
- A registered user can temporarily hold one or more available seats, see the hold's expiration, and release the hold.
- A user can pay for a held order and receive a confirmation with their tickets. They can later view their tickets and order history.
- The system expires unpaid holds and returns their seats to inventory. It supports payment-provider callbacks and retries without creating duplicate orders or charges.
- Sale organizers can publish event inventory and configure sale start times and seat prices.

### Non-functional requirements

- **Speed:** Event listings should respond within 300 ms at the 95th percentile; seat maps within 500 ms; a seat-hold response within 1 second at the 95th percentile when the request is admitted.
- **Correctness:** A seat can have at most one active hold or confirmed sale. Inventory and order changes must be atomic and durable. Payment callbacks and client retries must be idempotent.
- **Fairness:** A virtual waiting room admits buyers in queue order at a controlled rate. The queue displays a position or estimated wait, and all users arriving during the advertised sale window follow the same rules. A user cannot gain extra queue priority by refreshing or opening more connections.
- **Availability and resilience:** Browsing can continue if payment processing is unavailable; checkout reports the failure clearly and preserves a valid hold until its stated expiry. The sale path must withstand bursts without overwhelming the database.
- **Security and privacy:** Require authentication to hold or purchase seats; authorize users against their orders; protect payment details by using a payment provider and storing only provider references and payment status.

## 2. Traffic estimates

Assumptions: A normal day has 86,400 seconds. Daily page views are spread evenly for an average-rate estimate. A page view is one page-level request; additional assets and API calls are not counted. Normal-day purchases are also averaged over the day. The big-sale arrival rate is averaged over the stated 10-minute window; real arrivals may be burstier, so the system is sized for five times that rate.

| Measure | Normal day | Popular-concert sale |
|---|---:|---:|
| Visitors / attempts | 50,000 visitors per day | 200,000 buying attempts in 10 minutes |
| Page views / sale attempts | 50,000 × 10 = 500,000 page views per day | 200,000 ÷ 600 = about 333 attempts/second on average |
| Average request rate | 500,000 ÷ 86,400 = about 5.8 page views/second | About 333 attempts/second; design for at least 1,700/second (5× headroom) |
| Ticket sales | 5,000 tickets per day | 20,000 seats available |
| Average successful sales rate | 5,000 ÷ 86,400 = about 0.058 tickets/second | 20,000 ÷ 600 = about 33 tickets/second if all seats sell evenly |
| Registered-user scale | 2,000,000 users | Up to 200,000 queued users for this sale |

The sale's average attempt rate is about 57 times the normal page-view rate, and the provisioned 1,700 attempts/second is about 290 times that normal average. More importantly, 200,000 queued users must not become 200,000 simultaneous database sessions. The waiting room buffers them while a controlled number of valid buyers proceed. The 20,000 seats are scarce inventory: at most those 20,000 can be confirmed, even if all 200,000 users try.

## 3. API

All endpoints use HTTPS. Authenticated operations require a user token. Mutating requests accept an idempotency key so retries return the original result rather than creating another hold, order, or payment.

| Method and endpoint | Purpose |
|---|---|
| `GET /v1/events?query=&date=&location=&page=` | Search and browse published events; returns paginated event summaries. |
| `GET /v1/events/{eventId}` | View event details, venue, sale times, and price bands. |
| `GET /v1/events/{eventId}/seats` | View the seat map and availability. Availability is advisory; the hold endpoint makes the authoritative allocation. |
| `POST /v1/waiting-room/{eventId}/admit` | Join or check the sale queue and obtain a short-lived, signed admission token when admitted. Queue identity is bound to the authenticated user/session. |
| `POST /v1/holds` | Request a hold for seat IDs using an admission token; returns an order ID, held seats, and expiration time, or a conflict if unavailable. |
| `DELETE /v1/holds/{orderId}` | Release the caller's unpaid hold and return its seats to inventory. |
| `POST /v1/orders/{orderId}/payment` | Begin payment for a valid hold; returns a payment-provider checkout URL or client secret. |
| `POST /v1/payments/webhook` | Receive a signed, idempotently processed provider result; confirms or fails the order and updates inventory. |
| `GET /v1/me/tickets` | List the authenticated user's confirmed tickets and event details. |
| `GET /v1/me/orders/{orderId}` | View the authenticated user's order and payment status. |

## 4. Data model

Use a relational database (for example, PostgreSQL) for transactional inventory and orders. Primary keys are UUIDs unless noted.

| Table | Important columns and constraints | Relationships |
|---|---|---|
| `users` | `id` PK, `email` UNIQUE, `created_at` | One user has many orders. |
| `events` | `id` PK, `name`, `venue`, `starts_at`, `sale_starts_at`, `status` | One event has many seats and orders. |
| `seats` | `id` PK, `event_id` FK, `section`, `row`, `seat_number`, `price`, `status` (`AVAILABLE`, `HELD`, `SOLD`), `hold_order_id` nullable FK, `held_until`; UNIQUE (`event_id`, `section`, `row`, `seat_number`) | Each seat belongs to one event; an active hold points to its order. |
| `orders` | `id` PK, `user_id` FK, `event_id` FK, `status` (`HELD`, `PAYMENT_PENDING`, `CONFIRMED`, `EXPIRED`, `CANCELLED`, `REFUND_PENDING`), `expires_at`, `idempotency_key`, `payment_reference`; UNIQUE (`user_id`, `idempotency_key`) | Each order belongs to one user and one event, and contains one or more order items. |
| `order_items` | `id` PK, `order_id` FK, `seat_id` FK, `status` (`HELD`, `CONFIRMED`, `RELEASED`), `price_at_purchase`; UNIQUE (`order_id`, `seat_id`) and a partial UNIQUE index on `seat_id` while status is `HELD` or `CONFIRMED` | Connects an order to its seats and preserves the price and reservation history. |

An event has many seats. A user has many orders. Each order has many order items, and each order item refers to one seat. The partial unique index prevents the same seat from appearing in two active or confirmed reservations; released or expired history does not block a later sale. Seat-map reads can use a cache, but the primary database is authoritative for allocation.

### Preventing two people from buying the same seat

The application treats the seat row and the active order item as one transactional inventory decision. When a hold request arrives, the server starts a database transaction, locks the requested seat rows (`SELECT ... FOR UPDATE`), and checks that every seat is available (or that a previous hold has expired). It creates the order and order items, then changes the seat rows to `HELD` with that order ID and a short expiry, all in the same transaction. If any requested seat is unavailable, it rolls back the whole request rather than partially holding the selection.

The row lock serializes competing requests for the same seat: the second buyer waits, then sees the first buyer's committed hold and receives a conflict. The unique seat-map key and partial unique index are database constraints that remain a final guard even if application code has a bug. A hold is not a sale: after a verified payment result, another transaction locks and rechecks the order and seats, confirms the order, marks its seats `SOLD`, and marks the order items confirmed. If a successful payment arrives after its hold has expired, the system does not resurrect or resell that order; it marks it `REFUND_PENDING` and queues an idempotent refund. Expiry and release also lock and update the order, items, and seats atomically. No database transaction is kept open while calling the external payment provider.

## 5. Architecture

```text
 Buyers
   | browse / queue / checkout
   v
[CDN + WAF] ---> [Load balancer] ---> [Stateless API servers] <----> [Payment provider]
                       |                 |        |                       |
                       |                 |        +<--- signed webhook ---+
                       |                 |
                       |                 +----> [Cache: event/catalog/seat-map reads]
                       |                 |
                       |                 +----> [Primary relational DB]
                       |                           users, events, seats,
                       |                           orders, order_items
                       |
                       +----> [Virtual waiting room / queue]
                                      |
                                admission tokens
                                      |
                         [Sale admission controller]
                                      |
                        admitted requests to API

 [Primary relational DB] ---> [Outbox / job queue] ---> [Workers]
       |                                                - expire holds
       +---- replication ---> [Read replica]            - reconcile payments
                                                        - send ticket email
```

- **CDN and WAF:** Cache static assets and public event content, absorb routine reads, and apply abuse controls. They do not cache authoritative seat-hold decisions.
- **Load balancer and stateless API servers:** Spread requests across healthy instances. Adding API instances scales browsing and request handling without relying on in-memory seat state.
- **Virtual waiting room and admission controller:** Hold the large crowd outside the transactional database, preserve queue order, issue short-lived admission tokens, and cap the rate admitted to checkout. Tokens are bound to the sale and user/session to limit refresh-based queue jumping.
- **Cache:** Serves popular event details and seat-map snapshots quickly. It is only a display optimization; every hold revalidates against the primary database.
- **Primary relational database:** Serializes conflicting seat writes with row locks and enforces uniqueness and transaction constraints. Keep its connections bounded and prioritize admitted writes.
- **Read replica:** Handles eligible browse and ticket-history reads to reduce primary load. Route reads that require immediate consistency, especially post-hold and post-payment confirmation, to the primary.
- **Payment provider:** Collects payment details and reports outcomes through a signed webhook. Idempotency keys and stored provider references make retries safe.
- **Outbox/job queue and workers:** The API writes durable follow-up work in the same transaction as relevant state changes. Workers expire holds, reconcile uncertain payments, and send ticket notifications without slowing the purchase response. Jobs are retryable and idempotent.

Before a sale, pre-warm event and seat-map caches and verify capacity. During the sale, the waiting room absorbs the 200,000-user burst and releases buyers at a measured rate; the API tier scales horizontally, while the primary database receives only admitted reservation transactions. The system fails closed for seat allocation if the primary database is unavailable, rather than risk overselling. Browsing can remain available from cache, and queued users retain their place while checkout recovers.

## 6. Trade-offs

- **Strict transactional allocation vs. maximum write throughput:** Locking seat rows and checking constraints adds contention and limits how quickly the primary can allocate seats, but it is the clearest way to guarantee no double booking. The waiting room controls that write rate instead of weakening correctness.
- **Fair FIFO waiting room vs. instant access:** A queue adds a wait and infrastructure, but prevents the first traffic spike from overwhelming the sale and makes access more consistent. Strict FIFO can disadvantage users with poor connectivity, so the queue should use a clearly defined arrival window and show an estimated wait.
- **Cached seat maps vs. always-current availability:** Cached maps make views fast and reduce database reads, but can display a seat that has just been held. The API labels availability as indicative and returns a conflict from the authoritative hold operation.
- **Short holds vs. checkout flexibility:** A short expiry returns abandoned inventory quickly, but gives users less time to complete payment. A clear timer and a fixed, reasonable hold period balance completion time against keeping scarce seats unavailable.
