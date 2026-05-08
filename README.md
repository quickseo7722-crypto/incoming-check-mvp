# 進貨清點系統 MVP

手機優先的 Web App，核心流程：

1. 老闆登入後台建立叫貨單草稿
2. 上傳 1688 / 供應商訂單截圖（存到 Vercel Blob）
3. 使用 OpenAI Vision 解析成品項
4. 老闆人工校正品名、規格、數量、單位
5. 產生分享連結給員工進行清點
6. 員工送出已收到 / 未收到 / 部分收到 / 數量錯誤等結果
7. 老闆回後台查看完成率與異常摘要

## 技術棧

- Next.js 15 App Router · TypeScript · Tailwind CSS
- Prisma + **PostgreSQL（Supabase）**
- **Vercel Blob**（圖片儲存）
- OpenAI Responses API（Vision + Structured Outputs）
- 部署平台：**Vercel**

## 本機開發

> 因為 production 用 Postgres + Vercel Blob，本機也直接接同樣的服務，避免 dev/prod 行為分歧。建議用 Supabase 的免費 dev 專案 + Vercel Blob 的 dev token。

### 1. 安裝依賴

```bash
npm install
```

### 2. 建立 `.env`

```bash
cp .env.example .env
```

填入：

| 變數 | 從哪裡拿 |
|---|---|
| `DATABASE_URL` | Supabase → Project Settings → Database → Connection string → **Transaction pooler** (port 6543) |
| `DIRECT_URL` | 同上，但選 **Session pooler / Direct** (port 5432) |
| `BLOB_READ_WRITE_TOKEN` | Vercel → Storage → 你的 Blob store → `.env.local` 分頁 |
| `OPENAI_API_KEY` | OpenAI dashboard。空字串也能跑，只是 AI 解析會回傳友善錯誤 |
| `SESSION_SECRET` | `openssl rand -hex 32` |
| `DEFAULT_ADMIN_EMAIL` / `DEFAULT_ADMIN_PASSWORD` | 第一次 seed 才會用到，之後改密碼不會被覆蓋 |

### 3. 初始化資料庫

第一次（沒有 migration 檔案時）：

```bash
npx prisma migrate dev --name init
```

之後（schema 變動時）：

```bash
npx prisma migrate dev --name <change-description>
```

### 4. 建立預設 admin

```bash
npm run db:seed
```

這個指令是 **idempotent**：admin 已存在時不會重複建立、不會覆蓋密碼、不會清空既有資料。

### 5. 啟動開發伺服器

```bash
npm run dev
```

打開 <http://localhost:3000> ，用 `DEFAULT_ADMIN_EMAIL` / `DEFAULT_ADMIN_PASSWORD` 登入。

## 部署到 Vercel

### 一、準備外部服務

1. **Supabase Postgres**
   - 到 <https://supabase.com> 建立新專案（**不要**用其他專案的 DB）
   - Project Settings → Database → 把 Transaction pooler 的 URI 留作 `DATABASE_URL`，Direct URI 留作 `DIRECT_URL`
   - 注意 `DATABASE_URL` 的 pooler 字串要保留 `?pgbouncer=true&connection_limit=1`，否則 Prisma 在 serverless 環境會抓到亂掉的 prepared statement

2. **Vercel Blob**
   - Vercel dashboard → Storage → Create → Blob → 命名為 `incoming-check-uploads`
   - 連結這個 Blob 到 incoming-check-mvp 專案後，Vercel 會自動把 `BLOB_READ_WRITE_TOKEN` 注入到專案的環境變數

3. **OpenAI API key**
   - <https://platform.openai.com/api-keys> 建一把新的（**不要**用本機 `.env` 的 key，建議重新產一把專屬給 production 的 key）

### 二、建立 Vercel 專案

1. Push 這個 repo 到 GitHub（見最下方「First push to GitHub」段落）
2. Vercel dashboard → Add New → Project → 選這個 GitHub repo
3. **Build & Output Settings** 維持預設即可（`vercel-build` 會自動觸發 Prisma migrate + Next build）
4. **Environment Variables** 設定（**Production + Preview** 都要）：

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | Supabase pooled URI |
   | `DIRECT_URL` | Supabase direct URI |
   | `SESSION_SECRET` | 32+ char random hex |
   | `OPENAI_API_KEY` | OpenAI key |
   | `OPENAI_MODEL` | `gpt-4.1-mini` |
   | `DEFAULT_ADMIN_EMAIL` | 你的 admin email |
   | `DEFAULT_ADMIN_PASSWORD` | 強密碼（首次部署 seed 用，**部署完立刻登入改掉**） |
   | `NEXT_PUBLIC_APP_URL` | `https://<project>.vercel.app`（可後補） |

   `BLOB_READ_WRITE_TOKEN` 在你連結 Blob store 時 Vercel 會自動加，**不要手動覆寫**。

5. Deploy。第一次 build 會：
   - `prisma generate`（產生 client）
   - `prisma migrate deploy`（套用 migration 到 Supabase）
   - `next build`

### 三、第一次 seed admin

Vercel 不會自動跑 seed。本機指向 production DB 跑一次：

```bash
DATABASE_URL="<production pooled url>" \
DIRECT_URL="<production direct url>" \
DEFAULT_ADMIN_EMAIL="admin@yourdomain.com" \
DEFAULT_ADMIN_PASSWORD="<strong password>" \
npm run db:seed
```

之後 admin 已存在，再跑這個指令也不會覆寫密碼，安全。

### 四、驗收清單

部署完成後依序測試：

- [ ] 開啟 Vercel 網址、看到登入頁
- [ ] 用 admin 帳號登入成功
- [ ] **立即在後台改密碼**（如果有改密碼介面；目前 MVP 沒有，請直接改 DB user.passwordHash）
- [ ] 建立叫貨單
- [ ] 上傳 1688 截圖
- [ ] 圖片在編輯頁可正常顯示（src 應為 `https://<...>.public.blob.vercel-storage.com/...`）
- [ ] 點「開始解析」，回傳品項清單
- [ ] 人工校正品項並儲存草稿
- [ ] 點「建立清點單」拿到分享連結（顯示為相對路徑 `/share/<token>`）
- [ ] 「複製連結」按鈕在無痕視窗也能正常複製完整網址
- [ ] 員工填表單送出
- [ ] 老闆結果摘要頁看得到清點結果
- [ ] 重新部署後（Redeploy 或推一次小改動），叫貨單與圖片仍存在

## 環境變數總覽

| 變數 | 必填 | 說明 |
|---|:---:|---|
| `DATABASE_URL` | ✓ | Postgres pooled connection（runtime） |
| `DIRECT_URL` | ✓ | Postgres direct connection（migration 用） |
| `SESSION_SECRET` | ✓ | 32+ char 隨機字串 |
| `BLOB_READ_WRITE_TOKEN` | ✓ | Vercel Blob 連結後自動注入 |
| `OPENAI_API_KEY` |  | 留空時 AI 解析會回友善錯誤、其他流程不受影響 |
| `OPENAI_MODEL` |  | 預設 `gpt-4.1-mini` |
| `DEFAULT_ADMIN_EMAIL` |  | 第一次 seed 用 |
| `DEFAULT_ADMIN_PASSWORD` |  | 第一次 seed 用 |
| `NEXT_PUBLIC_APP_URL` |  | 純文件用途；分享連結實際以 client 端 origin 組合 |

## 安全注意事項

- 任何 secret（`OPENAI_API_KEY`、`SESSION_SECRET`、Postgres 密碼、`BLOB_READ_WRITE_TOKEN`）都不要 commit 到 git；只放在 `.env`（已 gitignore）和 Vercel 環境變數
- 預設 admin 密碼 `admin1234` **僅供第一次 seed**，部署後務必改成強密碼
- Vercel Blob 預設是 public access（URL 不可猜但任何人拿到 URL 就能下載）；如果有更高隱私需求，需改成 server-side proxied access
- OpenAI key 一旦外洩請到 dashboard rotate

## First push to GitHub

```bash
cd "C:/Users/蝦皮上架高手/Documents/New project/incoming-check-mvp"
git init -b main
git add .
git commit -m "Initial commit: incoming-check MVP for Vercel"
# 在 https://github.com/new 建立 private repo，名字隨意例如 incoming-check-mvp
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

## 已完成的 MVP 範圍

- Admin 登入
- 叫貨單建立 / 編輯 / 歷史紀錄
- 多張圖片上傳（Vercel Blob）
- OpenAI Vision 解析單張圖片
- 人工校正品項
- 分享連結清點頁
- 老闆結果摘要頁
- Postgres + Prisma migration
- idempotent seed admin

## 尚未做的延伸功能

- 員工正式帳號管理
- Line / Email 通知
- CSV / Excel / PDF 匯出
- 異常照片上傳
- 完整庫存同步
- 後台改密碼介面
- Blob 圖片刪除（刪叫貨單時）
