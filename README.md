# Courier Settlement Reconciliation & Alert Engine

A scalable, decoupled MERN-stack system for ingesting courier settlement batches, reconciling them against order data, and alerting merchants of discrepancies.

## 🚀 Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js & npm (for local development)
- Redis (for BullMQ)

### Running with Docker (Recommended)
1. Clone the repository.
2. Run the following command:
   ```bash
   docker-compose up --build
   ```
3. Access the Dashboard at `http://localhost:3000`.
4. API is available at `http://localhost:5000`.

### Local Development
1. **Server:**
   ```bash
   cd Server
   npm install
   # Set up .env (MONGO_URI, REDIS_HOST, REDIS_PORT)
   npm run dev
   ```
2. **Worker (Separate process):**
   ```bash
   cd Server
   node services/notificationWorker.js
   ```
3. **Client:**
   ```bash
   cd Client
   npm install
   npm run dev
   ```

## 🧠 Design Decisions & Assumptions

### 1. Strict Queue Decoupling (Point 3)
The API service and Reconciliation Engine do not call the notification logic directly. Instead, they publish events to a **BullMQ (Redis)** queue named `discrepancy-events`. A separate **Worker Process** consumes these events and interfaces with external notification APIs.

### 2. Idempotency (Point 4, 5, 18)
- **Job-Level:** Each reconciliation run is tracked with a `JobId`. Processing status is updated per record to prevent redundant work.
- **Notification-Level:** We use an `idempotencyKey` (combination of `awbNumber` and `discrepancyType`) to ensure that even if a job is retried, the merchant doesn't receive duplicate alerts for the same issue.
- **Duplicate Settlements:** Detection logic flags AWBs that appear across multiple settlement batches.

### 3. Rule Implementation (Point 10)
We have implemented 6 core discrepancy rules:
1. **ORDER_NOT_FOUND:** Settlement for an AWB that doesn't exist in our records.
2. **COD_SHORT:** Remitted COD amount is less than expected (considering a 2% or ₹10 tolerance).
3. **WEIGHT_DISPUTE:** Charged weight exceeds declared weight by more than 10%.
4. **PHANTOM_RTO:** RTO charges applied for a successfully DELIVERED order.
5. **OVERDUE_REMITTANCE:** No settlement received after 14 days of delivery.
6. **DUPLICATE_SETTLEMENT:** Same AWB settled across different batch IDs.

### 4. Notification Strategy (Point 12)
We use a **Mock API Provider** approach. The worker logs simulated calls to an external provider.
- **Provider:** Webhook.site (Simulated)
- **Retry Strategy:** Exponential backoff (1, 5, 15... minutes) with a maximum of 5 attempts.

## 🛠️ Performance & Scalability
- **Query Optimization:** Batch-fetching orders using `$in` and Map-based lookups to avoid N+1 query problems.
- **Rate Limiting:** `/api/settlements/upload` endpoint is limited to 5 requests per minute.
- **Partial Failure Handling:** The system continues processing valid records in a batch even if some encounter errors, logging failures separately.

## 🧪 Edge Cases Handled
- **Missing Delivery Date:** Automatically flags orders marked as DELIVERED but missing critical dates for PENDING_REVIEW.
- **Rate Limiting:** Prevents API abuse.
- **Data Validation:** Enforces 1,000 records per upload limit.

## 📈 Future Improvements
- **DLQ Management UI:** Better visibility into jobs that failed all retries.
- **Real-time Stats:** Websocket integration for dashboard updates.
- **Multi-tenant Support:** Per-merchant configuration for discrepancy thresholds.

## Loom Video: https://www.loom.com/share/cdb9cb970d034e3ea0a3eb2b3562132d