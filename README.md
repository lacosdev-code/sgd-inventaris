<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# SGD Inventaris - Admin Dashboard 🏗️

Welcome to the **Admin Dashboard** of the SGD Inventaris Management System. This repository is part of a **Decoupled Frontend Architecture** designed for high-security and specialized user experiences.

## 📐 System Architecture

Our system operates on a "One Database, Two Frontends" philosophy to ensure clear separation of concerns and optimized workflows:

### 1. Admin Dashboard (This Project)
- **Primary Domain:** `inventaris.sgd-corp.com`
- **Scope:** High-level management and administration.
- **Core Functions:**
  - Master Data CRUD (Inventory, Tools, Personnel).
  - Stock & Asset Management.
  - Comprehensive Audit Logs & Activity Monitoring.
  - Reporting & Analytics (Excel & PDF Exports).
- **Privilege Level:** Admin Only.

### 2. Technician Portal (External PWA)
- **Primary Domain:** `peminjaman.sgd-corp.com`
- **Scope:** Operational field activities.
- **Core Functions:**
  - QR Code scanning for instant tool identification.
  - Real-time Borrowing & Returning (Handover).
  - Physical Condition reporting with Photo Proof.
  - Quick access for field technicians (PWA).
- **Privilege Level:** Restricted (No Admin access).

### 🗄️ Shared Infrastructure
Both frontends communicate directly with a single **Supabase Shared Database**. This ensures:
- **Consistent Truth:** Any action taken in the Technician Portal is reflected instantly in the Admin Dashboard.
- **Atomic Operations:** Shared business logic (triggers/RPC) preserves data integrity across platforms.

---

## 🛠️ Development Setup

**Prerequisites:** Node.js (v18+) & Supabase CLI (Optional)

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Environment Variables:**
   Copy `.env.example` to `.env.local` and configure your Supabase & ImageKit credentials.
3. **Run locally:**
   ```bash
   npm run dev
   ```

## 🚀 Deployment
This project is optimized for deployment on **Vercel**. Ensure environment variables are correctly mirrored in the Vercel dashboard for production stability.
