const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'fleet-management-secret-key-2024';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Database connection
const db = new sqlite3.Database(path.join(__dirname, '../database/fleet.db'));

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Auth middleware
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

// ===== AUTH ROUTES =====
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err || !user) return res.status(401).json({ error: 'Invalid credentials' });
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    
    // Get driver info if user is a driver
    if (user.role === 'driver') {
      db.get('SELECT * FROM drivers WHERE user_id = ?', [user.id], (err, driver) => {
        res.json({ token, user: { id: user.id, username: user.username, role: user.role, driverId: driver?.id } });
      });
    } else {
      res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
    }
  });
});

// ===== DASHBOARD STATS =====
app.get('/api/dashboard/stats', authenticate, (req, res) => {
  const stats = {};
  
  db.get('SELECT COUNT(*) as total, SUM(CASE WHEN status="available" THEN 1 ELSE 0 END) as available, SUM(CASE WHEN status="on_trip" THEN 1 ELSE 0 END) as active, SUM(CASE WHEN status="maintenance" THEN 1 ELSE 0 END) as maintenance FROM trucks', (err, trucks) => {
    stats.trucks = trucks;
    
    db.get('SELECT COUNT(*) as total, SUM(CASE WHEN status="available" THEN 1 ELSE 0 END) as available FROM drivers', (err, drivers) => {
      stats.drivers = drivers;
      
      db.get('SELECT COUNT(*) as total, SUM(CASE WHEN status="in_progress" THEN 1 ELSE 0 END) as active FROM trips', (err, trips) => {
        stats.trips = trips;
        
        db.get('SELECT SUM(amount) as total, SUM(CASE WHEN status="pending" THEN amount ELSE 0 END) as pending FROM payments', (err, payments) => {
          stats.payments = payments;
          res.json(stats);
        });
      });
    });
  });
});

// ===== TRUCKS =====
app.get('/api/trucks', authenticate, (req, res) => {
  db.all('SELECT * FROM trucks ORDER BY id', (err, trucks) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(trucks);
  });
});

app.post('/api/trucks', authenticate, authorize('admin'), (req, res) => {
  const { plate_number, model, capacity_kg, fuel_efficiency } = req.body;
  db.run('INSERT INTO trucks (plate_number, model, capacity_kg, fuel_efficiency) VALUES (?, ?, ?, ?)', 
    [plate_number, model, capacity_kg, fuel_efficiency], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

app.put('/api/trucks/:id', authenticate, authorize('admin', 'dispatcher'), (req, res) => {
  const { status, last_service_date, next_service_date, odometer_km, latitude, longitude } = req.body;
  db.run('UPDATE trucks SET status=?, last_service_date=?, next_service_date=?, odometer_km=?, latitude=?, longitude=? WHERE id=?',
    [status, last_service_date, next_service_date, odometer_km, latitude, longitude, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// ===== DRIVERS =====
app.get('/api/drivers', authenticate, (req, res) => {
  db.all('SELECT * FROM drivers ORDER BY id', (err, drivers) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(drivers);
  });
});

app.get('/api/drivers/:id', authenticate, (req, res) => {
  db.get('SELECT * FROM drivers WHERE id = ?', [req.params.id], (err, driver) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(driver);
  });
});

app.put('/api/drivers/:id', authenticate, (req, res) => {
  const { status, documents } = req.body;
  db.run('UPDATE drivers SET status=?, documents=? WHERE id=?', [status, documents, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// ===== TRIPS =====
app.get('/api/trips', authenticate, (req, res) => {
  const query = `
    SELECT t.*, tr.plate_number, tr.model, d.name as driver_name 
    FROM trips t 
    JOIN trucks tr ON t.truck_id = tr.id 
    JOIN drivers d ON t.driver_id = d.id 
    ORDER BY t.start_date DESC
  `;
  db.all(query, (err, trips) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(trips);
  });
});

app.get('/api/trips/driver/:driverId', authenticate, (req, res) => {
  const query = `
    SELECT t.*, tr.plate_number, tr.model 
    FROM trips t 
    JOIN trucks tr ON t.truck_id = tr.id 
    WHERE t.driver_id = ? 
    ORDER BY t.start_date DESC
  `;
  db.all(query, [req.params.driverId], (err, trips) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(trips);
  });
});

app.post('/api/trips', authenticate, authorize('admin', 'dispatcher'), (req, res) => {
  const { truck_id, driver_id, origin, destination, cargo_weight_kg, distance_km, start_date, estimated_arrival, cost } = req.body;
  
  // Check truck availability
  db.get('SELECT status, capacity_kg FROM trucks WHERE id = ?', [truck_id], (err, truck) => {
    if (err || !truck) return res.status(400).json({ error: 'Truck not found' });
    if (truck.status !== 'available') return res.status(400).json({ error: 'Truck not available' });
    if (cargo_weight_kg > truck.capacity_kg) return res.status(400).json({ error: 'Cargo exceeds truck capacity' });
    
    // Check driver availability
    db.get('SELECT status FROM drivers WHERE id = ?', [driver_id], (err, driver) => {
      if (err || !driver) return res.status(400).json({ error: 'Driver not found' });
      if (driver.status !== 'available') return res.status(400).json({ error: 'Driver not available' });
      
      // Create trip
      db.run('INSERT INTO trips (truck_id, driver_id, origin, destination, cargo_weight_kg, distance_km, start_date, estimated_arrival, cost, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [truck_id, driver_id, origin, destination, cargo_weight_kg, distance_km, start_date, estimated_arrival, cost, 'scheduled'], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        
        // Update truck and driver status
        db.run('UPDATE trucks SET status="on_trip" WHERE id=?', [truck_id]);
        db.run('UPDATE drivers SET status="on_trip" WHERE id=?', [driver_id]);
        
        res.json({ id: this.lastID, success: true });
      });
    });
  });
});

app.put('/api/trips/:id', authenticate, (req, res) => {
  const { status, end_date } = req.body;
  
  db.get('SELECT truck_id, driver_id FROM trips WHERE id = ?', [req.params.id], (err, trip) => {
    if (err || !trip) return res.status(400).json({ error: 'Trip not found' });
    
    db.run('UPDATE trips SET status=?, end_date=? WHERE id=?', [status, end_date, req.params.id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      
      // If trip completed, update truck and driver status
      if (status === 'completed') {
        db.run('UPDATE trucks SET status="available" WHERE id=?', [trip.truck_id]);
        db.run('UPDATE drivers SET status="available" WHERE id=?', [trip.driver_id]);
      }
      
      res.json({ success: true });
    });
  });
});

// ===== MAINTENANCE =====
app.get('/api/maintenance', authenticate, (req, res) => {
  const query = `
    SELECT m.*, t.plate_number, t.model 
    FROM maintenance m 
    JOIN trucks t ON m.truck_id = t.id 
    ORDER BY m.service_date DESC
  `;
  db.all(query, (err, maintenance) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(maintenance);
  });
});

app.post('/api/maintenance', authenticate, authorize('admin'), (req, res) => {
  const { truck_id, service_type, service_date, cost, odometer_reading, notes, next_service_km } = req.body;
  db.run('INSERT INTO maintenance (truck_id, service_type, service_date, cost, odometer_reading, notes, next_service_km) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [truck_id, service_type, service_date, cost, odometer_reading, notes, next_service_km], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    
    // Update truck service dates
    db.run('UPDATE trucks SET last_service_date=?, status="available" WHERE id=?', [service_date, truck_id]);
    
    res.json({ id: this.lastID });
  });
});

// ===== PAYMENTS =====
app.get('/api/payments', authenticate, (req, res) => {
  const query = `
    SELECT p.*, d.name as driver_name, t.origin, t.destination 
    FROM payments p 
    JOIN drivers d ON p.driver_id = d.id 
    LEFT JOIN trips t ON p.trip_id = t.id 
    ORDER BY p.due_date DESC
  `;
  db.all(query, (err, payments) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(payments);
  });
});

app.get('/api/payments/driver/:driverId', authenticate, (req, res) => {
  const query = `
    SELECT p.*, t.origin, t.destination 
    FROM payments p 
    LEFT JOIN trips t ON p.trip_id = t.id 
    WHERE p.driver_id = ? 
    ORDER BY p.due_date DESC
  `;
  db.all(query, [req.params.driverId], (err, payments) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(payments);
  });
});

app.put('/api/payments/:id', authenticate, authorize('admin'), (req, res) => {
  const { status, paid_date } = req.body;
  db.run('UPDATE payments SET status=?, paid_date=? WHERE id=?', [status, paid_date, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// ===== LEAVE REQUESTS =====
app.get('/api/leave-requests', authenticate, (req, res) => {
  const query = `
    SELECT l.*, d.name as driver_name 
    FROM leave_requests l 
    JOIN drivers d ON l.driver_id = d.id 
    ORDER BY l.created_at DESC
  `;
  db.all(query, (err, leaves) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(leaves);
  });
});

app.get('/api/leave-requests/driver/:driverId', authenticate, (req, res) => {
  db.all('SELECT * FROM leave_requests WHERE driver_id = ? ORDER BY created_at DESC', [req.params.driverId], (err, leaves) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(leaves);
  });
});

app.post('/api/leave-requests', authenticate, authorize('driver'), (req, res) => {
  const { driver_id, start_date, end_date, reason } = req.body;
  db.run('INSERT INTO leave_requests (driver_id, start_date, end_date, reason) VALUES (?, ?, ?, ?)',
    [driver_id, start_date, end_date, reason], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

app.put('/api/leave-requests/:id', authenticate, authorize('admin', 'dispatcher'), (req, res) => {
  const { status } = req.body;
  
  db.get('SELECT driver_id FROM leave_requests WHERE id = ?', [req.params.id], (err, leave) => {
    if (err || !leave) return res.status(400).json({ error: 'Leave request not found' });
    
    db.run('UPDATE leave_requests SET status=? WHERE id=?', [status, req.params.id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      
      // Update driver status if approved
      if (status === 'approved') {
        db.run('UPDATE drivers SET status="on_leave" WHERE id=?', [leave.driver_id]);
      }
      
      res.json({ success: true });
    });
  });
});

// ===== ANALYTICS =====
app.get('/api/analytics', authenticate, authorize('admin'), (req, res) => {
  const analytics = {};
  
  // Fuel efficiency
  db.get('SELECT AVG(fuel_efficiency) as avg_fuel FROM trucks', (err, fuel) => {
    analytics.avgFuelEfficiency = fuel?.avg_fuel || 0;
    
    // Cost per km
    db.get('SELECT SUM(cost) as total_cost, SUM(distance_km) as total_distance FROM trips WHERE status="completed"', (err, cost) => {
      analytics.costPerKm = cost?.total_distance ? (cost.total_cost / cost.total_distance).toFixed(2) : 0;
      
      // Maintenance cost
      db.get('SELECT SUM(cost) as total FROM maintenance WHERE service_date >= date("now", "-30 days")', (err, maint) => {
        analytics.maintenanceCost = maint?.total || 0;
        
        res.json(analytics);
      });
    });
  });
});

// ===== FORECAST =====
app.get('/api/forecast', authenticate, (req, res) => {
  const forecast = [];
  const today = new Date();
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    
    db.get(`SELECT COUNT(*) as scheduled FROM trips WHERE DATE(start_date) = ? AND status != "cancelled"`, [dateStr], (err, trips) => {
      db.get('SELECT COUNT(*) as total FROM trucks WHERE status != "maintenance"', (err, trucks) => {
        forecast.push({
          date: dateStr,
          available: (trucks?.total || 0) - (trips?.scheduled || 0),
          scheduled: trips?.scheduled || 0
        });
        
        if (forecast.length === 7) {
          res.json(forecast.sort((a, b) => a.date.localeCompare(b.date)));
        }
      });
    });
  }
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚚 Fleet Management System running on http://localhost:${PORT}`);
  console.log('📊 API ready at http://localhost:${PORT}/api\n');
});
