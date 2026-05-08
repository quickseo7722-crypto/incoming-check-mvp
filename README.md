# incoming-check-mvp

進貨清點系統 MVP，使用 Next.js App Router、TypeScript、Tailwind CSS、Prisma、Supabase PostgreSQL、Vercel Blob 與 OpenAI Vision。

## Current stack

- Frontend: Next.js App Router + React + TypeScript + Tailwind CSS
- Database: Supabase PostgreSQL via Prisma
- File storage: Vercel Blob
- AI parsing: OpenAI Responses API using Blob image URLs
- Deploy: Vercel

## Core flow

1. Admin 登入後台
2. 建立叫貨單
3. 上傳 1688 / 供應商訂單截圖到 Vercel Blob
4. 使用 OpenAI Vision 解析品項
5. Admin 人工校正
6. 產生分享連結給員工
7. 員工透過 `/share/[token]` 免登入清點
8. Admin 回後台看結果摘要與歷史紀錄

## Environment variables

Production 目前維持下列環境變數：

- `DATABASE_URL`
- `DIRECT_URL`
- `BLOB_READ_WRITE_TOKEN`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `NEXT_PUBLIC_APP_URL`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_NAME`

補充：

- `SESSION_SECRET` 仍然需要存在，供目前 cookie session 使用。
- `DEFAULT_ADMIN_EMAIL` 與 `DEFAULT_ADMIN_PASSWORD` 目前保留為舊本機環境的 fallback，不是 production 必填。

## Local setup

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

## Admin password

### 1. 後台頁面修改

已登入 Admin 可進入：

- `/settings/password`

表單欄位：

- 目前密碼
- 新密碼
- 確認新密碼

規則：

- 目前密碼必填
- 新密碼必填
- 新密碼至少 8 碼
- 新密碼與確認新密碼必須一致

### 2. 指令列備援修改

可用以下指令直接更新指定 Admin 的密碼：

```bash
npm run admin:change-password -- admin@example.com NewPassword123
```

說明：

- 會透過 Prisma 連 `DATABASE_URL`
- 只更新指定 email 的使用者
- 找不到使用者時會回傳錯誤
- 不會輸出明文新密碼

## Admin seed behavior

`npm run db:seed` 目前會：

- 優先使用 `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME`
- 若沒提供，再 fallback 到 `DEFAULT_ADMIN_EMAIL` / `DEFAULT_ADMIN_PASSWORD`
- 如果同 email 的 Admin 已存在，不會覆蓋既有密碼

## Share link flow

第一版員工不需要帳號密碼，直接使用分享連結：

- 員工透過 `/share/[token]` 開啟指定清點單
- 員工不能進入 Admin dashboard
- 員工可以清點、備註、送出
- Admin 頁面與管理 API 仍需既有登入 cookie session

### Share link security reminder

- 拿到分享連結的人，就能打開該張清點單
- 不要把分享連結公開張貼
- 目前 token 使用 crypto random bytes 產生，屬不可猜測型 token
- 後續可再加入過期時間、停用分享、員工帳號等機制

### Known risk

- 目前已完成或已結案的分享清點單，若前端仍持有連結，流程上仍可能被再次修改
- 這次沒有大改既有 share 流程，只先在 README 記錄這個風險

## Useful scripts

- `npm run dev`
- `npm run build`
- `npm run vercel-build`
- `npm run db:migrate`
- `npm run db:migrate:deploy`
- `npm run db:push`
- `npm run db:seed`
- `npm run db:studio`
- `npm run admin:change-password -- <email> <new-password>`
