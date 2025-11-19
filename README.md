## Công nghệ sử dụng

### Backend

- **NestJS** - Framework Node.js
- **Prisma** - ORM cho database
- **MySQL** - Cơ sở dữ liệu

### Frontend

- **React** - Thư viện UI
- **Vite** - Build tool
- **Tailwind CSS** - CSS framework

## Cài đặt

### 1. Clone repository

# Backend Setup

Hướng dẫn thiết lập và chạy backend của dự án.

---

## 1. Clone repository

```bash
git clone <repo-url>
cd backend
```

## 2. Cài đặt dependencies

```bash
npm install
```

## 3. Cấu hình môi trường

Tạo file `.env` ở thư mục `backend/`

Điền đầy đủ các biến môi trường, ví dụ:

```env
DATABASE_URL="mysql://username:password@host:port/dbname"
JWT_SECRET="secret_key"
CLIENT_ORIGIN="http://localhost:5173"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_REGION="ap-southeast-1"
AWS_BUCKET="your-s3-bucket"
```

**Lưu ý:** AWS keys dùng cho upload file S3.

## 4. Database setup

Nếu bạn đã có sẵn migration files và database online (có dữ liệu hiện tại), chạy:

```bash
cd prisma
npx prisma migrate deploy
```
```bash
npx prisma studio
```

Lệnh này sẽ áp dụng tất cả migration đã có lên database mà không làm mất dữ liệu.

**⚠️ Lưu ý:** Không dùng `npx prisma migrate dev` nếu DB đã có dữ liệu quan trọng.

## 5. Chạy backend

### Môi trường phát triển:

```bash
npm run start:dev
```

### Môi trường production:

```bash
npm run start
```

---

## Thông tin bổ sung

- **Port mặc định:** Backend sẽ chạy trên port được định nghĩa trong file `.env` hoặc port mặc định của NestJS (3000)
- **API Documentation:** Truy cập Swagger UI tại `http://localhost:3000/api` (nếu có cấu hình)
- **Prisma Studio:** Để quản lý database qua giao diện, chạy `npx prisma studio`

### 3. Cài đặt Frontend

```bash
cd frontend
npm install
```

Khởi động frontend:

```bash
npm run dev
```

Frontend sẽ chạy tại `http://localhost:5173`

## Cấu trúc thư mục

```
HUST-FOOD-LOCA/
├── backend/          # NestJS API server
│   ├── prisma/       # Database schema
│   └── src/          # Source code
└── frontend/         # React application
    └── src/          # Source code
```

## Scripts

### Backend

- `npm run start:dev` - Chạy development mode
- `npm run build` - Build production
- `npm run test` - Chạy tests

### Frontend

- `npm run dev` - Chạy development mode
- `npm run build` - Build production
- `npm run preview` - Preview production build

## License

UNLICENSED
