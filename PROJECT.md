## Courier Settlement Reconciliation & Alert Engine 
---

## 1. 🎯 Objective

Build a **scalable, decoupled MERN-stack system** that:

* Ingests courier settlement batches
* Reconciles them against order data
* Detects discrepancies via defined rules
* Publishes discrepancy events to a queue
* Sends notifications via a worker
* Exposes a dashboard for visibility

This system must be **fault-tolerant, idempotent, and extensible**.

---

## 2. 🧱 System Architecture

### High-Level Components

```
React UI (Dashboard)
        |
        v
Node.js API (Express)
        |
        ├── MongoDB (Primary Storage)
        |
        ├── Reconciliation Scheduler (Cron Job)
        |
        └── Queue (Redis / BullMQ / Kafka)
                      |
                      v
            Notification Worker Service
                      |
                      v
             External Notification API
```

---

## 3. ⚙️ Tech Stack

| Layer        | Tech                               |
| ------------ | ---------------------------------- |
| Frontend     | React + Vite / Next.js             |
| Backend API  | Node.js + Express                  |
| Database     | MongoDB (Mongoose)                 |
| Queue        | BullMQ (Redis preferred)           |
| Scheduler    | node-cron / BullMQ repeatable jobs |
| Worker       | Separate Node.js service           |
| File Parsing | csv-parser / papaparse             |
| Deployment   | Docker + docker-compose            |

---

## 4. 📦 Core Services Breakdown

### 4.1 API Service

Responsibilities:

* Upload settlements
* Query data
* Trigger reconciliation
* Serve dashboard data

---

### 4.2 Reconciliation Engine

Runs:

* Nightly (2:00 AM IST default)
* Manual trigger

Responsibilities:

* Match settlements ↔ orders
* Apply discrepancy rules
* Update status
* Publish events to queue

---

### 4.3 Queue Layer

* MUST be decoupled
* Use BullMQ (Redis)

Queue Types:

* `discrepancy-events`
* `notification-retries`
* `dead-letter`

---

### 4.4 Notification Worker

Responsibilities:

* Consume discrepancy events
* Call external API
* Handle retries + failures
* Maintain delivery logs

---

## 5. 🗄️ Database Design (MongoDB)

### 5.1 Orders Collection

```js
{
  awbNumber: String (unique),
  merchantId: String,
  courierPartner: String,
  orderStatus: "DELIVERED" | "RTO" | "IN_TRANSIT" | "LOST",
  codAmount: Number,
  declaredWeight: Number,
  orderDate: Date,
  deliveryDate: Date
}
```

---

### 5.2 Settlements Collection

```js
{
  awbNumber: String,
  batchId: String,
  settledCodAmount: Number,
  chargedWeight: Number,
  forwardCharge: Number,
  rtoCharge: Number,
  codHandlingFee: Number,
  settlementDate: Date,

  status: "MATCHED" | "DISCREPANCY" | "PENDING_REVIEW",
  discrepancies: [
    {
      type: String,
      expected: Number,
      actual: Number,
      message: String
    }
  ],

  processedAt: Date
}
```

---

### 5.3 Jobs Collection

```js
{
  jobId: String,
  runAt: Date,
  status: "SUCCESS" | "FAILED",
  recordsProcessed: Number,
  discrepanciesFound: Number,
  logs: [String]
}
```

---

### 5.4 Notifications Collection

```js
{
  awbNumber: String,
  merchantId: String,
  status: "SENT" | "FAILED" | "RETRYING",
  payload: Object,
  attempts: Number,
  lastAttemptAt: Date,
  error: String
}
```

---

## 6. 🔄 Data Flow

### Upload Flow

1. User uploads CSV/JSON
2. Parse file
3. Validate schema
4. Deduplicate (idempotency check via `batchId`)
5. Store in DB

---

### Reconciliation Flow

1. Fetch unprocessed settlements
2. Match with orders
3. Apply rules
4. Update status
5. Publish discrepancy events

---

### Notification Flow

1. Worker consumes event
2. Calls external API
3. Logs success/failure
4. Retry if needed
5. Move to DLQ if failed permanently

---

## 7. 🧠 Discrepancy Rules (Implement ≥3)

### Rule 1: COD Short Remittance

```js
tolerance = min(2% of codAmount, 10)

if (settledCodAmount < codAmount - tolerance)
```

---

### Rule 2: Weight Dispute

```js
if (chargedWeight > declaredWeight * 1.10)
```

---

### Rule 3: Phantom RTO

```js
if (rtoCharge > 0 && orderStatus === "DELIVERED")
```

---

### Rule 4: Overdue Remittance

```js
if (deliveryDate > 14 days && !settlementDate)
```

---

### Rule 5: Duplicate Settlement

```js
same awbNumber appears in multiple batchIds
```

---

## 8. 🔐 Idempotency Strategy

* Use `batchId` + `awbNumber` as unique key
* Prevent duplicate insertions
* Use upserts instead of inserts
* Store `processedAt` to avoid reprocessing

---

## 9. ⏱️ Scheduling

* Default: **2:00 AM IST**
* Use timezone-aware cron:

```js
cron.schedule('0 2 * * *', job, {
  timezone: 'Asia/Kolkata'
});
```

---

## 10. 📡 API Design

### Upload

```
POST /api/settlements/upload
```

---

### Fetch Settlements

```
GET /api/settlements?status=DISCREPANCY
```

---

### Jobs

```
GET /api/jobs
```

---

### Notifications

```
GET /api/notifications
```

---

### Manual Trigger

```
POST /api/jobs/run
```

---

## 11. 📊 Frontend Requirements

### Pages

#### 1. Upload Page

* File upload (CSV/JSON)
* Validation feedback

#### 2. Settlements Table

* Filters: MATCHED / DISCREPANCY / PENDING
* Pagination
* Click row → detail view

#### 3. Discrepancy Detail View

* Show rule triggered
* Expected vs actual
* Suggested action

#### 4. Job Logs

* Last 10 runs
* Stats

#### 5. Notifications Log

* Status
* Retry count

---

## 12. 🚨 Notification Payload

```json
{
  "merchantId": "M123",
  "awbNumber": "AWB001",
  "discrepancyType": "COD_SHORT",
  "expectedValue": 1000,
  "actualValue": 900,
  "suggestedAction": "Raise dispute with courier"
}
```

---

## 13. 🔁 Retry Strategy

* Exponential backoff:

```
1st retry: 1 min
2nd retry: 5 min
3rd retry: 15 min
```

* Max retries: 5
* Move to DLQ after failure

---

## 14. ⚡ Performance Considerations

* Batch processing (chunk size: 100)
* Indexes:

  * `awbNumber`
  * `batchId`
  * `status`
* Avoid N+1 queries (use aggregation)

---

## 15. 🧪 Seed Data Strategy

* Generate:

  * 50+ orders
  * 1 settlement batch
* Inject intentional discrepancies:

  * Underpaid COD
  * Overweight
  * Fake RTO

---

## 16. 🐳 Docker Setup

### Services

* `api`
* `worker`
* `mongodb`
* `redis`

### Command

```bash
docker-compose up --build
```

---

## 17. 🧾 Assumptions

* All AWB numbers are unique per order
* Settlement always references valid AWB (else mark invalid)
* Timezone is IST everywhere
* External API may fail → retries required

---

## 18. 🚀 Bonus Features (If Time)

### Technical

* Rate limiting (5 req/min)
* Dead-letter queue
* Idempotency keys for notifications

### Product

* Discrepancy value summary
* Courier breakdown chart
* Export CSV
* Notification preview

---

## 19. 📈 Future Improvements

* Multi-tenant scaling
* Real-time streaming (Kafka)
* ML-based anomaly detection
* Auto dispute filing
* SLA tracking per courier

---

## 20. ✅ Definition of Done

* End-to-end flow works:

  * Upload → Reconcile → Queue → Notify
* Dashboard reflects real-time state
* System runs via Docker
* Seed data included
* Idempotency ensured
* Queue is decoupled




