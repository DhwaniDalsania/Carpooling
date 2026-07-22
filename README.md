#  FindMeARide

FindMeARide is a full-stack enterprise carpooling platform built to simplify employee commuting through smart ride matching, route planning, wallet-based payments, and an intuitive dashboard for both users and organizations.

> Built during the Odoo × KSV Hackathon 2026.

---

##  Features

### For Users
- Search and book rides
- Offer rides using registered vehicles
- Wallet-based booking (Simulated Razorpay)
- Real-time chat between riders and drivers
- Live ride tracking (simulation)
- Save frequent locations (Home & Work)
- Trip history and upcoming rides

### For Organizations
- Admin dashboard
- User and trip management
- Monthly earnings overview
- Route analytics

---

## 🛠 Tech Stack

**Frontend**
- React
- Vite
- Vanilla CSS
- Leaflet

**Backend**
- Express.js
- Prisma ORM
- PostgreSQL

**Authentication**
- JWT

---

## 🚀 Getting Started

### Clone the repository

```bash
git clone <repo-url>
cd FindMeARide
```

### Backend

```bash
cd backend
npm install
```

Create a `.env`

```env
DATABASE_URL=
JWT_SECRET=
PORT=5000
```

```bash
npx prisma db push
npm run dev
```

### Frontend

```bash
cd ../frontend
npm install
npm run dev
```

---

## 📂 Project Structure

```
backend/
frontend/
```
---

## 📄 License

Developed as a prototype for the Odoo × KSV Hackathon 2026.