# Silver King by CAI

A luxury precious metal manufacturing platform with QR code product verification and admin management dashboard.

![Silver King](https://img.shields.io/badge/Status-Production_Ready-gold?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)

## 🌟 Features

- **QR Code Verification System**: Automatically generates unique QR codes for each product
- **Product Management Dashboard**: Full CRUD operations for products
- **Authentication System**: Secure admin/staff login with NextAuth.js
- **Luxury Design**: Black, gold, and silver color palette with smooth animations
- **Real-time Verification**: Instant product authenticity checking
- **Scan Tracking**: Monitor how many times each product has been scanned
- **Responsive Design**: Works perfectly on all devices

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - App Router
- **React 18** - UI Library
- **TypeScript** - Type Safety
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **Lucide React** - Icons

### Backend
- **Next.js API Routes** - RESTful API
- **Prisma** - ORM
- **MySQL** - Database
- **NextAuth.js** - Authentication
- **bcrypt** - Password Hashing

### Utilities
- **QRCode** - QR Code Generation
- **Zod** - Schema Validation
- **React Hook Form** - Form Handling
- **Axios** - HTTP Client

## 📦 Installation

### Prerequisites

- Node.js 18+ installed
- MySQL database running
- npm or yarn package manager

### Step 1: Clone and Install

```bash
cd /Users/macbookpro2019/SilverkingbyCAI
npm install
```

### Step 2: Configure Environment Variables

Update the `.env` file with your MySQL credentials:

```env
DATABASE_URL="mysql://username:password@localhost:3306/silverking"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Step 3: Set Up Database

```bash
# Generate Prisma Client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# Seed the database with admin user
npx ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts
```

### Step 4: Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your application.

## 👤 Default Login Credentials

After seeding the database, use these credentials:

**Admin Account:**
- Email: `admin@silverking.com`
- Password: `admin123`

**Staff Account:**
- Email: `staff@silverking.com`
- Password: `staff123`

⚠️ **Important**: Change these passwords in production!

## 🗂️ Project Structure

```
SilverkingbyCAI/
├── src/
│   ├── app/
│   │   ├── api/                  # API routes
│   │   │   ├── auth/             # NextAuth endpoints
│   │   │   └── products/         # Product CRUD & verification
│   │   ├── dashboard/            # Admin dashboard
│   │   │   ├── login/            # Login page
│   │   │   └── products/         # Product management
│   │   ├── verify/[serialNumber] # QR verification page
│   │   ├── about/                # About page
│   │   ├── page.tsx              # Homepage
│   │   └── layout.tsx            # Root layout
│   ├── components/
│   │   ├── forms/                # Form components
│   │   ├── layout/               # Layout components
│   │   └── ui/                   # UI components
│   ├── lib/
│   │   ├── auth.ts               # NextAuth configuration
│   │   └── prisma.ts             # Prisma client
│   ├── utils/
│   │   ├── qrcode.ts             # QR code utilities
│   │   ├── constants.ts          # App constants
│   │   └── cn.ts                 # Class name utilities
│   └── styles/
│       └── globals.css           # Global styles
├── prisma/
│   ├── schema.prisma             # Database schema
│   └── seed.ts                   # Database seeding
├── .env                          # Environment variables
└── package.json                  # Dependencies
```

## 🎨 Design Theme

The application uses a luxury metallic theme:

- **Primary Black**: `#0a0a0a`
- **Gold**: `#D4AF37`
- **Silver**: `#C0C0C0`
- **Font Serif**: Playfair Display
- **Font Sans**: Inter

## 🚀 Usage Guide

### Creating a New Product

1. Log in to the admin dashboard
2. Navigate to "Products" page
3. Click "Add Product" button
4. Fill in product details:
   - Product Name
   - Weight (5gr, 10gr, 25gr, 50gr, 100gr, 250gr, 500gr)
   - Purity (default: 99.99%)
   - Unique Code (optional message)
5. Click "Create Product"
6. QR code is automatically generated!

### Verifying a Product

1. Scan the QR code on the product
2. Opens verification page automatically
3. See product details and authenticity status
4. Scan count is automatically tracked

### Managing Products

- **View**: See all products with QR codes
- **Edit**: Update product details (QR code remains the same)
- **Delete**: Admin-only feature to remove products
- **Download QR**: Download QR code as PNG image

## 📱 API Endpoints

### Products

- `GET /api/products` - Get all products
- `POST /api/products` - Create new product (auto-generates QR)
- `GET /api/products/[id]` - Get single product
- `PUT /api/products/[id]` - Update product
- `DELETE /api/products/[id]` - Delete product (Admin only)
- `GET /api/products/verify/[serialNumber]` - Verify product authenticity

### Authentication

- `POST /api/auth/signin` - Login
- `POST /api/auth/signout` - Logout
- `GET /api/auth/session` - Get session

## 🔐 Security Features

- Password hashing with bcrypt
- JWT-based session management
- Protected API routes
- Role-based access control (Admin/Staff)
- Input validation with Zod
- SQL injection protection via Prisma

## 🚀 Deployment to Railway

### 1. Prepare for Production

Update `.env` for production:

```env
DATABASE_URL="mysql://user:pass@your-mysql-host:3306/silverking"
NEXTAUTH_URL="https://your-domain.railway.app"
NEXTAUTH_SECRET="generate-a-strong-secret"
NEXT_PUBLIC_APP_URL="https://your-domain.railway.app"
```

### 2. Deploy to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init

# Add MySQL database
railway add mysql

# Deploy
railway up
```

### 3. Run Migrations on Railway

```bash
railway run npx prisma migrate deploy
railway run npx prisma db seed
```

## 🧪 Testing QR Code Flow

1. Create a product in the dashboard
2. Download the QR code
3. Scan with phone camera or QR scanner
4. Should redirect to verification page
5. See product details and "Verified" status

## 📊 Database Schema

### Product Table
- `id`: Auto-increment primary key
- `name`: Product name
- `weight`: Enum (5gr - 500gr)
- `purity`: Decimal (default 99.99)
- `serialNumber`: Unique identifier
- `uniqueCode`: Custom message
- `qrCode`: Base64 QR code image
- `scannedCount`: Number of scans
- `createdAt`: Timestamp
- `updatedAt`: Timestamp

### User Table
- `id`: Auto-increment primary key
- `name`: User name
- `email`: Unique email
- `password`: Hashed password
- `role`: ADMIN or STAFF
- `createdAt`: Timestamp
- `updatedAt`: Timestamp

## 🛠️ Development Commands

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Format code
npm run format

# Open Prisma Studio (Database GUI)
npm run prisma:studio

# Generate Prisma Client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate
```

## 📝 Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | MySQL connection string | `mysql://user:pass@host:3306/db` |
| `NEXTAUTH_URL` | Application URL | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | Secret for JWT signing | `random-secret-string` |
| `NEXT_PUBLIC_APP_URL` | Public app URL | `http://localhost:3000` |

## 🎯 Features Roadmap

- [ ] Email notifications for new scans
- [ ] Analytics dashboard
- [ ] Bulk product import
- [ ] PDF certificate generation
- [ ] Multi-language support
- [ ] Mobile app integration

## 🤝 Contributing

This is a production-ready project. For modifications:

1. Follow the existing code structure
2. Maintain the luxury design theme
3. Test QR code generation thoroughly
4. Update documentation

## 📄 License

Proprietary - Silver King by CAI

## 👨‍💻 Support

For issues or questions, contact the development team.

---

**Built with ❤️ for Silver King by CAI**

*"The Art of Precious Metal Perfection"*

