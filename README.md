# Hungry Spoon — Restaurant Management & Billing System

A complete, functional, secure, and responsive restaurant operating system built with **React**, **Node.js**, **Express**, **Prisma ORM**, and a modern **Bento Grid** minimalist interface.

---

## 🌟 Key Highlights & Architecture

Hungry Spoon is designed for real-world restaurant operations, bridging the front-of-house (POS & customer billing), kitchen line (Kitchen Display System & KOT tickets), back-office inventory (recipe ingredient tracking & low-stock alerts), and administrative controls (audit logs, bill & KOT deletion workflows).

### 1. Visual Identity — Bento Grid + Modern Minimalism
- **Color Tokens**:
  - Primary Background: `#F7F7F4`
  - Main Card: `#FFFFFF`
  - Primary Brand Accent: `#EA580C` (Warm orange)
  - Dark Sidebar: `#18181B`
  - Status Indicators: Success (`#16A34A`), Warning (`#F59E0B`), Danger (`#DC2626`)
- **Bento Grid Hierarchy**: Responsive modular cards with 12px–18px rounded corners, subtle shadows, and Lucide iconography.

### 2. Multi-Role Authentication & Access Control
- **ADMIN**: Access to all modules, staff management, menu/price editing, stock adjustments, financial reports, transaction audit logs, and permanent deletion workflows.
- **STAFF**: Fast order entry, kitchen dispatch, KDS status tracking, bill finalization, payment collection, and printing.
- **Security**: Server-validated JWT in HTTP-only cookies, password hashing with bcrypt, strict server-side role enforcement preventing API bypasses.

---

## 🚀 Core Modules

### 🥄 Point of Sale (POS)
- Dine-in, Takeaway, and Delivery order workflows with table assignment.
- Visual dish cards with live availability indicators.
- Cart with line-item notes (e.g., *"Less spicy"*, *"No coriander"*) and order-level instructions.
- Real-time server-side price and GST calculations in Indian Rupees (₹).
- Pre-submission inventory availability check with authorized override alerts.

### 👨‍🍳 Kitchen Order Ticket (KOT) System & KDS
- **Dedicated Kitchen Display System (KDS)**: Auto-refreshes every 5 seconds.
- Color-coded elapsed time indicators (<10m green, 10–20m amber, >20m urgent red).
- Lifecycle state transitions: `SENT_TO_KITCHEN` ➔ `PREPARING` ➔ `READY` ➔ `SERVED`.
- **KOT Amendment Engine**: Post-submission item additions or modifications preserve original ticket history and automatically generate versioned amendment tickets (e.g. `KOT-1002 REV v2`).

### 🧾 Billing & Multi-Format Receipt Printing
- Instant preview of subtotal, configurable discounts (with mandatory audit reason), CGST + SGST tax breakdown (default 5%), and grand total.
- Separate finalization and payment tracking (`UNPAID`, `PARTIALLY_PAID`, `PAID`, `REFUNDED`).
- Multi-payment support: UPI, Cash, Card, Net Banking.
- **Dual Format Printing**:
  1. **80mm Thermal Receipt**: Compact font, dashed borders, receipt header/footer messages, itemized breakdown.
  2. **Standard A4 Tax Invoice**: Full-page commercial layout with GSTIN, FSSAI numbers, tax breakdown, and payment ledger.

### 📦 Recipe-Based Inventory & Stock Management
- Ingredients tracked in standard units (`kg`, `g`, `litre`, `ml`, `pcs`).
- **Recipe Mappings**: Dishes link to ingredient quantities (e.g. *Paneer Butter Masala* ➔ *200g Paneer, 30g Butter, 50ml Cream, 150g Tomato*).
- **Two-phase deduction**: Ingredients are reserved on kitchen dispatch, converted to consumed stock on bill finalization, and safely released if cancelled.
- Automatic **Low Stock** and **Out of Stock** alerts with visual status badges.
- Stock movements logged for purchases, adjustments, and wastage with mandatory audit reasons.

### 🛡️ Admin Destructive Operations & Audit Logs
- **Bill & KOT Deletion Dialog**:
  - **Option A**: Delete Customer Bill only (maintains kitchen operational records).
  - **Option B**: Delete Customer Bill and associated KOT tickets.
- All sensitive actions (deletions, discounts, price changes, manual stock adjustments) record an immutable forensic entry with user ID, before/after values, and justification.

### 📊 Reporting & Analytics
- Live dashboard metrics: Today's revenue, order volume, average order value (AOV), active kitchen orders, bestselling items.
- Visual charts: 7-day revenue trend, payment method breakdown, revenue by dining channel.
- **CSV Export**: Direct one-click download of itemized sales ledger.

---

## 🔑 Demo Credentials

| Role | Username | Password | Privileges |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `admin123` | Full access, settings, deletion, staff accounts, audit logs |
| **Front Desk Staff** | `staff` | `staff123` | POS orders, KDS, billing, payment collection, printing |

*(Quick sign-in demo buttons are also provided on the login page).*

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide React, Recharts, React Router v6.
- **Backend**: Node.js, Express, TypeScript, Prisma ORM, bcryptjs, jsonwebtoken, cookie-parser, cors.
- **Database**: SQLite (Zero-configuration embedded database; can switch to PostgreSQL by changing `DATABASE_URL` in `.env`).
- **Testing**: Node.js Native Test Runner with TypeScript and Supertest.

---

## 🏃 Running the Application

### 1. Installation
All packages are already installed in `node_modules`. If installing from scratch:
```bash
npm install
```

### 2. Database Setup & Seeding
```bash
npx prisma db push
npx tsx prisma/seed.ts
```

### 3. Run Automated Tests
```bash
npm test
```
All 21 comprehensive integration and unit test scenarios verify authentication, role enforcement, KOT lifecycles, billing calculations, and inventory reservations.

### 4. Build for Production
```bash
npm run build
```
Builds the Vite React frontend into `dist/` and compiles the TypeScript server into `dist-server/`.

### 5. Launch Full-Stack Server
```bash
node dist-server/server/src/index.js
```
The server serves both the REST API and the single-page application at `http://localhost:5000`.

For active frontend development with HMR:
```bash
npm run dev:server  # Runs Express API on port 5000
npm run dev:client  # Runs Vite dev server on port 3000
```
