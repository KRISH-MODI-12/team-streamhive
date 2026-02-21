https://1drv.ms/v/c/f83537bab9a9d2af/IQD_ifGr_j9QRZLoihGUTdpcAX2Esxm-sz85Q5hym6494r0?e=3g74Fv - streamhive video presentation 

### 🔐 Authentication & Roles
- Secure JWT-based authentication
- Three roles: Admin, Dispatcher, Driver
- Role-based dashboards and permissions

### 👨‍💼 Admin Dashboard
- Fleet overview with real-time statistics
- Live truck tracking simulation
- Maintenance scheduling and alerts
- Driver payment tracking
- Analytics (fuel efficiency, cost per km, maintenance costs)
- 7-day fleet availability forecast

### 📋 Dispatcher Panel
- Assign trips with capacity validation
- Prevent double booking
- View all trips and fleet status
- Real-time availability checking

### 🚗 Driver Panel
- View assigned trips
- Payment status and history
- Document management
- Leave request system

### 🤖 Smart Features
- Capacity validation before trip assignment
- Availability forecasting
- Payment tracking with due dates
- Maintenance scheduling

## Tech Stack

- **Frontend**: HTML, CSS, Vanilla JavaScript
- **Backend**: Node.js, Express
- **Database**: SQLite
- **Authentication**: JWT, bcrypt

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm

### Setup Steps

1. **Clone/Download the project**
```bash
cd fleet-management
```

2. **Install dependencies**
```bash
npm install
```

3. **Initialize database and seed data**
```bash
npm run seed
```

4. **Start the server**
```bash
npm start
```

5. **Open browser**
Navigate to: `http://localhost:3000`

## Default Login Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Dispatcher | dispatcher | dispatch123 |
| Driver | driver1 | driver123 |

## Project Structure

```
fleet-management/
├── backend/
│   └── server.js          # Express API server
├── database/
│   ├── schema.js          # Database schema
│   ├── seed.js            # Sample data
│   └── fleet.db           # SQLite database (auto-generated)
├── frontend/
│   ├── index.html         # Main HTML
│   ├── style.css          # Responsive styles
│   └── app.js             # Frontend logic
├── package.json
└── README.md
```

## Database Schema

### Tables
- **users** - Authentication and roles
- **drivers** - Driver information and status
- **trucks** - Fleet vehicles and specifications
- **trips** - Trip assignments and tracking
- **maintenance** - Service records and schedules
- **payments** - Driver payment tracking
- **leave_requests** - Driver leave management

## API Endpoints

### Authentication
- `POST /api/login` - User login

### Dashboard
- `GET /api/dashboard/stats` - Overview statistics
- `GET /api/analytics` - Performance analytics
- `GET /api/forecast` - 7-day availability forecast

### Trucks
- `GET /api/trucks` - List all trucks
- `POST /api/trucks` - Add new truck (Admin)
- `PUT /api/trucks/:id` - Update truck

### Drivers
- `GET /api/drivers` - List all drivers
- `GET /api/drivers/:id` - Get driver details
- `PUT /api/drivers/:id` - Update driver

### Trips
- `GET /api/trips` - List all trips
- `GET /api/trips/driver/:driverId` - Driver's trips
- `POST /api/trips` - Create trip (Admin/Dispatcher)
- `PUT /api/trips/:id` - Update trip status

### Maintenance
- `GET /api/maintenance` - Maintenance history
- `POST /api/maintenance` - Schedule maintenance (Admin)

### Payments
- `GET /api/payments` - All payments
- `GET /api/payments/driver/:driverId` - Driver payments
- `PUT /api/payments/:id` - Update payment status (Admin)

### Leave Requests
- `GET /api/leave-requests` - All leave requests
- `GET /api/leave-requests/driver/:driverId` - Driver's requests
- `POST /api/leave-requests` - Submit request (Driver)
- `PUT /api/leave-requests/:id` - Approve/reject (Admin/Dispatcher)

## Key Features Explained

### 1. Trip Assignment Validation
- Checks truck capacity vs cargo weight
- Prevents double booking of trucks/drivers
- Only assigns available resources

### 2. Fleet Availability Forecast
- 7-day prediction of available trucks
- Considers scheduled trips
- Helps with planning

### 3. Payment Tracking
- Automatic payment records for trips
- Due date tracking
- Status management (pending/paid)

### 4. Maintenance Scheduling
- Service date tracking
- Odometer-based alerts
- Cost tracking

### 5. Live Tracking Simulation
- Visual map with truck locations
- Real-time status updates

## Deployment Options

### Free Hosting Platforms

**Backend + Database:**
- Railway.app
- Render.com
- Fly.io
- Heroku (with PostgreSQL addon)

**Frontend:**
- Netlify
- Vercel
- GitHub Pages (static)

### Database Migration
To use PostgreSQL instead of SQLite:
1. Replace `sqlite3` with `pg` in package.json
2. Update connection string in server.js
3. Adjust SQL syntax if needed

## Future Enhancements

- Real GPS integration
- Mobile app for drivers
- Push notifications
- Advanced route optimization
- Fuel consumption tracking
- Document upload with cloud storage
- Multi-language support
- Export reports (PDF/Excel)

## Troubleshooting

**Port already in use:**
```bash
# Change PORT in server.js or kill process
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**Database errors:**
```bash
# Delete and recreate database
del database\fleet.db
npm run seed
```

**CORS errors:**
- Ensure frontend is served from same origin or CORS is enabled

## License

MIT License - Free to use and modify

## Support

For issues or questions, check the code comments or create an issue in the repository.

---

Built with ❤️ for efficient fleet management
