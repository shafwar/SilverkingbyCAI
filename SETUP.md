# 🚀 Silver King by CAI - Complete Setup Guide

This guide will walk you through setting up the **Silver King by CAI** project from scratch.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- ✅ **Node.js 18+** ([Download here](https://nodejs.org/))
- ✅ **MySQL 8.0+** ([Download here](https://dev.mysql.com/downloads/mysql/))
- ✅ **npm or yarn** (comes with Node.js)
- ✅ **Git** (for version control)

---

## 🎯 Step-by-Step Setup

### Step 1: Verify Installation

All dependencies have already been installed! Verify by checking:

```bash
cd /Users/macbookpro2019/SilverkingbyCAI
npm list --depth=0
```

You should see all the packages listed in package.json.

---

### Step 2: Configure Database

#### Option A: Using Local MySQL

1. **Start MySQL server** (if not running):
   ```bash
   # macOS with Homebrew
   brew services start mysql
   
   # Or manually
   mysql.server start
   ```

2. **Create the database**:
   ```bash
   mysql -u root -p
   ```
   
   Then in MySQL console:
   ```sql
   CREATE DATABASE silverking;
   EXIT;
   ```

3. **Update .env file** with your MySQL credentials:
   ```env
   DATABASE_URL="mysql://root:your_password@localhost:3306/silverking"
   ```

#### Option B: Using Railway (Cloud Database)

1. Install Railway CLI:
   ```bash
   npm install -g @railway/cli
   ```

2. Login and create MySQL:
   ```bash
   railway login
   railway init
   railway add mysql
   ```

3. Get the connection string:
   ```bash
   railway variables
   ```

4. Update `.env` with the Railway DATABASE_URL.

---

### Step 3: Generate Prisma Client

```bash
npm run prisma:generate
```

This generates the Prisma Client based on your schema.

---

### Step 4: Run Database Migrations

```bash
npm run prisma:migrate
```

This will:
- Create all database tables
- Set up the schema structure
- Create the initial migration

---

### Step 5: Seed the Database

```bash
npm run prisma:seed
```

This creates two default users:

**Admin Account:**
- Email: `admin@silverking.com`
- Password: `admin123`

**Staff Account:**
- Email: `staff@silverking.com`
- Password: `staff123`

⚠️ **Change these passwords in production!**

---

### Step 6: Start Development Server

```bash
npm run dev
```

The application will be available at:
**http://localhost:3000**

---

## 🧪 Testing the Application

### 1. Test the Homepage
- Open http://localhost:3000
- You should see the luxury landing page with gold/silver theme

### 2. Test Admin Login
- Navigate to http://localhost:3000/dashboard/login
- Login with: `admin@silverking.com` / `admin123`
- You should be redirected to the dashboard

### 3. Test Product Creation
- From the dashboard, click "Manage Products"
- Click "Add Product"
- Fill in the form:
  - Name: "Silver Bar 100gr"
  - Weight: 100gr
  - Purity: 99.99
  - Unique Code: "Be part of this kingdom"
- Click "Create Product"
- A QR code should be generated automatically!

### 4. Test QR Verification
- Download the QR code from the product
- Scan it with your phone or use a QR scanner
- You should be redirected to the verification page
- Product details should display with "Verified" status

---

## 📱 QR Code Testing Flow

### Manual Testing (Without Physical Scanner)

1. Create a product in the dashboard
2. Note the serial number (e.g., `SK-ABC123-XYZ`)
3. Visit: `http://localhost:3000/verify/SK-ABC123-XYZ`
4. You should see the verification page

### Physical QR Scanner Testing

1. Download QR code from product
2. Print it or display on another device
3. Scan with phone camera
4. Should open verification URL automatically

---

## 🎨 Customization

### Change Color Scheme

Edit `tailwind.config.ts`:

```typescript
colors: {
  luxury: {
    black: "#0a0a0a",     // Change base color
    gold: "#D4AF37",      // Change gold color
    silver: "#C0C0C0",    // Change silver color
  },
}
```

### Change Fonts

Edit `src/app/layout.tsx`:

```typescript
const inter = Inter({ subsets: ["latin"] });
const playfair = Playfair_Display({ subsets: ["latin"] });
```

### Update Brand Name

Edit `src/utils/constants.ts`:

```typescript
export const APP_NAME = "Your Brand Name";
export const APP_DESCRIPTION = "Your tagline here";
```

---

## 🔧 Troubleshooting

### Issue: "Cannot connect to database"

**Solution:**
1. Verify MySQL is running: `mysql.server status`
2. Check DATABASE_URL in `.env`
3. Test connection: `mysql -u root -p -h localhost -P 3306`

### Issue: "Prisma Client not generated"

**Solution:**
```bash
npm run prisma:generate
```

### Issue: "NextAuth session error"

**Solution:**
1. Check NEXTAUTH_SECRET is set in `.env`
2. Clear browser cookies
3. Restart dev server

### Issue: "QR code not generating"

**Solution:**
1. Check console for errors
2. Verify `qrcode` package is installed: `npm list qrcode`
3. Check API response in Network tab

### Issue: "Page not found"

**Solution:**
1. Restart dev server: `npm run dev`
2. Clear `.next` cache: `rm -rf .next && npm run dev`

---

## 📊 Database Management

### View Database in Prisma Studio

```bash
npm run prisma:studio
```

Opens a GUI at http://localhost:5555 to view/edit database.

### Reset Database

```bash
npx prisma migrate reset
npm run prisma:seed
```

⚠️ **This deletes all data!**

### Backup Database

```bash
mysqldump -u root -p silverking > backup.sql
```

### Restore Database

```bash
mysql -u root -p silverking < backup.sql
```

---

## 🚀 Production Deployment

### Deploy to Railway

1. **Push to GitHub** (if not already):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Deploy to Railway**:
   ```bash
   railway login
   railway init
   railway add mysql
   railway up
   ```

3. **Set Environment Variables** in Railway dashboard:
   ```
   NEXTAUTH_URL=https://your-app.railway.app
   NEXTAUTH_SECRET=generate-strong-secret
   NEXT_PUBLIC_APP_URL=https://your-app.railway.app
   ```

4. **Run Migrations**:
   ```bash
   railway run npx prisma migrate deploy
   railway run npm run prisma:seed
   ```

5. **Access Your App**:
   Visit the URL provided by Railway!

---

## 📦 Package Summary

All installed packages and their purposes:

### Core Framework
- `next` - React framework with App Router
- `react` - UI library
- `react-dom` - React DOM renderer
- `typescript` - Type safety

### Styling & UI
- `tailwindcss` - Utility-first CSS
- `framer-motion` - Smooth animations
- `lucide-react` - Beautiful icons

### Database & ORM
- `prisma` - Next-generation ORM
- `@prisma/client` - Prisma client
- `mysql2` - MySQL driver

### Authentication
- `next-auth` - Authentication solution
- `bcrypt` - Password hashing

### Utilities
- `qrcode` - QR code generation
- `axios` - HTTP requests
- `zod` - Schema validation
- `react-hook-form` - Form handling
- `clsx` & `tailwind-merge` - Class name utilities

### Development
- `eslint` - Code linting
- `prettier` - Code formatting
- `ts-node` - TypeScript execution
- `dotenv` - Environment variables

---

## ✅ Verification Checklist

Before going to production, verify:

- [ ] All environment variables are set
- [ ] Database is accessible and migrated
- [ ] Admin credentials are changed from defaults
- [ ] QR codes generate correctly
- [ ] Verification page works
- [ ] Authentication works
- [ ] Product CRUD operations work
- [ ] Responsive design on mobile
- [ ] No console errors
- [ ] HTTPS enabled in production

---

## 🎉 You're All Set!

Your Silver King by CAI application is now running!

### Next Steps:
1. Create your first product
2. Test the QR verification
3. Customize the branding
4. Deploy to production

### Quick Links:
- 🏠 Homepage: http://localhost:3000
- 🔐 Admin: http://localhost:3000/dashboard/login
- 📦 Products: http://localhost:3000/dashboard/products
- 🔍 Verify: http://localhost:3000/verify/[serial]

---

**Need Help?**

Check the main README.md for detailed documentation or contact support.

---

*Built with ❤️ for Silver King by CAI - "The Art of Precious Metal Perfection"*

