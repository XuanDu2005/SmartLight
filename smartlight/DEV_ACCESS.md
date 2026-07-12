# SmartLight — Tài khoản & Đường dẫn truy cập (Dev)

> Tài liệu nội bộ cho môi trường development. **KHÔNG dùng các thông tin này cho production.**

---

## 1. Tài khoản

### 1.1. Admin (super admin)

| Trường | Giá trị |
| --- | --- |
| Email | `admin@smartlight.vn` |
| Password | `Admin@SmartLight2026` |
| Display name | `Super Admin` |
| Role | `super_admin` |
| Status | `ACTIVE` |
| Failed login | `0` (không bị khóa) |
| Trang đăng nhập | `http://localhost:5174/login` |

### 1.2. Customer (demo)

| Trường | Giá trị |
| --- | --- |
| Email | `customer@smartlight.vn` |
| Password | `Customer@SmartLight2026` |
| Locale | `vi-VN` |
| Status | `ACTIVE` |
| Trang đăng nhập | `http://localhost:5173/login` |

### 1.3. Database (Postgres — chỉ dành cho dev)

| Trường | Giá trị |
| --- | --- |
| Host | `localhost:5432` *(host)* hoặc `postgres:5432` *(trong docker network)* |
| User | `smartlight` |
| Password | `smartlight_dev_password` |
| Database | `smartlight` |
| Connection string | `postgresql://smartlight:smartlight_dev_password@localhost:5432/smartlight?schema=public` |

### 1.4. Redis (chỉ dành cho dev)

| Trường | Giá trị |
| --- | --- |
| Host | `localhost:6379` |
| Không có password (dev only) | |

---

## 2. Đường dẫn truy cập (Local Dev)

| Dịch vụ | URL | Mô tả |
| --- | --- | --- |
| **Storefront (web)** | http://localhost:5173 | Trang bán hàng cho khách hàng |
| **Admin panel** | http://localhost:5174 | Trang quản trị |
| **API (REST)** | http://localhost:4000 | NestJS API, prefix `/v1` |
| **Swagger / API docs** | http://localhost:4000/api/docs | Tài liệu tương tác cho API |
| **Health check** | http://localhost:4000/health | Trả về `200 OK` khi API sẵn sàng |
| **Adminer (DB UI)** | http://localhost:8080 | Web UI quản lý Postgres |
| **Postgres** | `localhost:5432` | Cổng TCP (cần client như psql, DBeaver, …) |
| **Redis** | `localhost:6379` | Cổng TCP |

### 2.1. Đăng nhập Adminer

Vào http://localhost:8080 và điền:

| Field | Value |
| --- | --- |
| System | `PostgreSQL` |
| Server | `postgres` *(đã prefill nhờ env `ADMINER_DEFAULT_SERVER`)* |
| Username | `smartlight` |
| Password | `smartlight_dev_password` |
| Database | `smartlight` |

---

## 3. Endpoint API thường dùng

Prefix chung: `http://localhost:4000/v1`

| Method | Path | Mô tả |
| --- | --- | --- |
| `POST` | `/auth/admin/login` | Đăng nhập admin → trả `accessToken` + `refreshToken` |
| `POST` | `/auth/login` | Đăng nhập customer |
| `POST` | `/auth/register` | Đăng ký customer mới |
| `POST` | `/auth/refresh` | Refresh access token |
| `GET` | `/admin/ping` | Ping admin module |
| `GET` | `/products` | Danh sách sản phẩm (public) |
| `GET` | `/products/:slug` | Chi tiết sản phẩm |

> Xem đầy đủ tại http://localhost:4000/api/docs

---

## 4. Cách khởi động stack

Từ thư mục `smartlight/`:

```bash
# Khởi động tất cả services
docker compose up -d

# Xem trạng thái
docker compose ps

# Xem log của 1 service (vd: api)
docker logs smartlight-api --tail 50 -f

# Dừng toàn bộ
docker compose down

# Dừng nhưng giữ volume DB (giữ nguyên data)
docker compose stop

# Reset hoàn toàn kể cả data (XÓA HẾT DB)
docker compose down -v
```

---

## 5. Cách reset DB khi cần (dev only)

Nếu login lỗi `table ... does not exist`, schema bị drift, hoặc muốn reset về trạng thái sạch:

```bash
cd smartlight

# 1. Xóa volume DB (xóa sạch tables)
docker compose down -v
docker compose up -d postgres
docker compose restart api web admin

# 2. Chạy migration + seed từ host (cần DATABASE_URL trỏ về localhost:5432)
$env:DATABASE_URL = "postgresql://smartlight:smartlight_dev_password@localhost:5432/smartlight?schema=public"
$env:DIRECT_URL    = "postgresql://smartlight:smartlight_dev_password@localhost:5432/smartlight?schema=public"

# Cài prisma CLI 1 lần vào thư mục tạm
mkdir -p d:\tmp\prisma-cli; cd d:\tmp\prisma-cli
npm init -y > $null
npm install prisma@5.22.0

# Chạy migrate deploy
node "d:\tmp\prisma-cli\node_modules\prisma\build\index.js" migrate deploy `
    --schema="d:\Project\SmartLight\smartlight\apps\api\prisma\schema.prisma"

# 3. Restart API để Prisma client kết nối lại DB mới
cd "d:\Project\SmartLight\smartlight"
docker compose restart api
```

> Lưu ý: bước 2 cần chạy từ **host Windows** (không phải container) vì image API chỉ chứa production deps — không có `prisma` CLI.

---

## 6. Lưu ý bảo mật

> ⚠️ **Các credentials trong file này chỉ dành cho môi trường dev local.** Trước khi deploy production:

- [ ] Đổi tất cả passwords trong `docker-compose.yml` và `.env` (`POSTGRES_PASSWORD`, `JWT_*_SECRET`, …)
- [ ] Không expose Adminer ra internet public — hoặc bật HTTP Basic Auth
- [ ] Không commit `.env` thật vào git
- [ ] Đổi `FRONTEND_BASE_URL`, `ADMIN_BASE_URL`, `API_CORS_ORIGINS` về domain thật
- [ ] Đặt `NODE_ENV=production` cho API

Xem thêm: [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md), [`SECURITY.md`](./SECURITY.md).