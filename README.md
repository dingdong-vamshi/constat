# ConStat — Construction Statistics Tracker

A local V1 beta built with Next.js App Router, TypeScript, Tailwind CSS, Radix accessible dialogs, React Hook Form, Zod, Lucide, and Recharts. No external backend, authentication, cloud storage, or paid API is configured.

## Run locally

```sh
npm ci
npm run dev
```

Open http://localhost:3000. If occupied: `npm run dev -- --port 3001`.

## Verification

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

The end-to-end suite expects a running local server at port 3000 and installed Google Chrome. It runs in isolated browser contexts and does not change your normal browser data.

## Pages

- `/`: project dashboard, date filters, diesel and workforce charts, material stock
- `/diesel`: diesel entry, required meter photo, filtering and machine summaries
- `/machinery`: project machinery registry
- `/employees`: technical employee registry
- `/attendance`: daily bulk technical attendance, historical viewing and clear-day action
- `/labour`: one labour headcount per project and date
- `/materials`: receipts and consumption transactions
- `/inventory`: calculated received, consumed and available stock by material
- `/projects`: company and project management and selection
- `/data`: JSON export/import, sample loading and reset

## Data architecture

`src/lib/models.ts` holds typed models and centralized Zod schemas. `src/lib/repository.ts` owns persistence through a `StorageAdapter`, validates relationships and unique daily records, and rejects changes that make material stock negative. A write is committed to the observable store only after storage succeeds. React subscribes through `src/components/store.tsx`; components never access localStorage directly.

All project operations are scoped by project ID. Deleting a company or project requires confirmation and cascades to its associated records. Deleting a machine with diesel history is blocked; deleting an employee also deletes their attendance history. Import validates the full dataset before replacing it. Stock validation applies to edits, deletes, and imports as well as new records.

`src/lib/statistics.ts` derives all totals from records. Diesel total cost and material units are derived rather than stored redundantly. Multi-day attendance and workforce totals are person-days, explicitly labeled. Attendance percentage is present / marked employees; unmarked employees remain visible. Dashboard material stock is current stock across all dates and is labeled independently of the activity date filter. Stock checks enforce total recorded balance, not an accounting ledger of historical running balances.

`src/lib/format.ts` uses local calendar `YYYY-MM-DD` dates with noon parsing to avoid UTC day shifts, and Indian rupee/number formatting.

## Local storage and photos

The database is a versioned JSON document under `constat.database.v1` in localStorage. It survives refresh but belongs to this browser and origin. Tabs listen for storage changes. This is a single-user local beta; simultaneous edits from different tabs are last-write-wins. Export before clearing site data or switching browsers.

`src/lib/images.ts` accepts JPEG, PNG, or WebP up to 25 MB, resizes to a maximum dimension of 1200 pixels, and encodes compressed JPEG. Saved images are capped at 450,000 data-URL characters. They are included in JSON backups. Quota failures leave the previous database intact and show an actionable error. Browser capacity varies; many photos can fill localStorage before text records do.

## Sample data and reset

`src/lib/seed.ts` is the single demo-data source. It seeds one company and project, three machines, six employees, seven days of activity, and four materials. Dates are relative to the day the sample loads. Demo meter images are clearly labeled illustrations. Sample data is loaded only when the database key has never been initialized. An intentional reset persists an empty database and stays empty after refresh.

Open Data Management to export, restore a previous ConStat JSON export, load sample data, or reset. Destructive replacements require confirmation.

## V2 boundary

Replace the storage/repository implementation with a cloud service while keeping the typed models, forms, and calculations. Supabase, auth, roles, remote image storage, multi-device sync, and realtime collaboration are intentionally left for V2.

## Deploy through GitHub to Vercel

1. In Vercel, choose **Add New → Project**, connect GitHub, and import `dingdong-vamshi/constat`.
2. Use the **Next.js** framework preset and repository root (`./`). Keep the default install and output settings. Build command: `npm run build`.
3. No environment variables or database connections are required. Click **Deploy**.
4. Open the production URL. A new browser starts with sample data. To transfer existing localhost records, export from localhost Data Management and import the JSON on the production URL.

Vercel hosts the application code, not the user's operational database. Records and photos remain in the visiting browser's localStorage. They survive refresh and normal redeploys on the same origin, but do not sync across devices, browsers, preview URLs, or custom domains. Clearing browser site data removes them. Use JSON backups to move or protect records.
