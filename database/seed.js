const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'fleet.db');
const db = new sqlite3.Database(dbPath);

(async () => {
  db.serialize(async () => {
    // Create tables
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'dispatcher', 'driver')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS drivers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE,
      name TEXT NOT NULL,
      phone TEXT,
      license_number TEXT,
      license_expiry DATE,
      status TEXT DEFAULT 'available' CHECK(status IN ('available', 'on_trip', 'on_leave')),
      documents TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS trucks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plate_number TEXT UNIQUE NOT NULL,
      model TEXT,
      capacity_kg INTEGER,
      status TEXT DEFAULT 'available' CHECK(status IN ('available', 'on_trip', 'maintenance')),
      last_service_date DATE,
      next_service_date DATE,
      odometer_km INTEGER DEFAULT 0,
      fuel_efficiency REAL,
      latitude REAL,
      longitude REAL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      truck_id INTEGER NOT NULL,
      driver_id INTEGER NOT NULL,
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      cargo_weight_kg INTEGER,
      distance_km INTEGER,
      start_date DATETIME,
      end_date DATETIME,
      estimated_arrival DATETIME,
      status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
      cost REAL,
      FOREIGN KEY (truck_id) REFERENCES trucks(id),
      FOREIGN KEY (driver_id) REFERENCES drivers(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS maintenance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      truck_id INTEGER NOT NULL,
      service_type TEXT NOT NULL,
      service_date DATE NOT NULL,
      cost REAL,
      odometer_reading INTEGER,
      notes TEXT,
      next_service_km INTEGER,
      FOREIGN KEY (truck_id) REFERENCES trucks(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      driver_id INTEGER NOT NULL,
      trip_id INTEGER,
      amount REAL NOT NULL,
      due_date DATE,
      paid_date DATE,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'overdue')),
      FOREIGN KEY (driver_id) REFERENCES drivers(id),
      FOREIGN KEY (trip_id) REFERENCES trips(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS leave_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      driver_id INTEGER NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      reason TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (driver_id) REFERENCES drivers(id)
    )`);
    // Hash passwords
    const adminPass = await bcrypt.hash('admin123', 10);
    const dispatcherPass = await bcrypt.hash('dispatch123', 10);
    const driverPass = await bcrypt.hash('driver123', 10);

    // Insert users
    const users = [
      ['admin', adminPass, 'admin'],
      ['dispatcher', dispatcherPass, 'dispatcher'],
      ['driver1', driverPass, 'driver'],
      ['driver2', driverPass, 'driver'],
      ['driver3', driverPass, 'driver'],
      ['driver4', driverPass, 'driver']
    ];

    const userStmt = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)');
    users.forEach(user => userStmt.run(user));
    userStmt.finalize();

    // Insert drivers
    const drivers = [
      [3, 'John Smith', '+1234567890', 'DL123456', '2025-12-31', 'available', '[]'],
      [4, 'Maria Garcia', '+1234567891', 'DL123457', '2025-10-15', 'available', '[]'],
      [5, 'David Chen', '+1234567892', 'DL123458', '2026-03-20', 'on_trip', '[]'],
      [6, 'Sarah Johnson', '+1234567893', 'DL123459', '2025-08-10', 'available', '[]']
    ];

    const driverStmt = db.prepare('INSERT INTO drivers (user_id, name, phone, license_number, license_expiry, status, documents) VALUES (?, ?, ?, ?, ?, ?, ?)');
    drivers.forEach(driver => driverStmt.run(driver));
    driverStmt.finalize();

    // Insert trucks
    const trucks = [
      ['TRK-001', 'Volvo FH16', 25000, 'available', '2024-01-15', '2024-07-15', 45000, 8.5, 40.7128, -74.0060],
      ['TRK-002', 'Mercedes Actros', 20000, 'on_trip', '2024-02-10', '2024-08-10', 38000, 9.2, 34.0522, -118.2437],
      ['TRK-003', 'Scania R500', 30000, 'available', '2023-12-20', '2024-06-20', 52000, 7.8, 41.8781, -87.6298],
      ['TRK-004', 'MAN TGX', 22000, 'maintenance', '2024-03-05', '2024-09-05', 41000, 8.9, 29.7604, -95.3698],
      ['TRK-005', 'DAF XF', 28000, 'available', '2024-01-25', '2024-07-25', 47000, 8.3, 33.4484, -112.0740],
      ['TRK-006', 'Iveco Stralis', 24000, 'available', '2024-02-15', '2024-08-15', 39000, 9.0, 39.7392, -104.9903]
    ];

    const truckStmt = db.prepare('INSERT INTO trucks (plate_number, model, capacity_kg, status, last_service_date, next_service_date, odometer_km, fuel_efficiency, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    trucks.forEach(truck => truckStmt.run(truck));
    truckStmt.finalize();

    // Insert trips
    const trips = [
      [2, 3, 'New York, NY', 'Boston, MA', 18000, 350, '2024-05-01 08:00', '2024-05-02 14:00', '2024-05-02 14:00', 'completed', 850],
      [3, 1, 'Los Angeles, CA', 'San Francisco, CA', 22000, 615, '2024-05-10 06:00', null, '2024-05-11 18:00', 'in_progress', 1200],
      [1, 4, 'Chicago, IL', 'Detroit, MI', 15000, 450, '2024-05-15 09:00', null, '2024-05-16 15:00', 'scheduled', 950],
      [5, 2, 'Houston, TX', 'Dallas, TX', 20000, 385, '2024-05-12 07:00', null, '2024-05-13 13:00', 'scheduled', 780],
      [2, 3, 'Phoenix, AZ', 'Las Vegas, NV', 16000, 475, '2024-04-20 10:00', '2024-04-21 16:00', '2024-04-21 16:00', 'completed', 920]
    ];

    const tripStmt = db.prepare('INSERT INTO trips (truck_id, driver_id, origin, destination, cargo_weight_kg, distance_km, start_date, end_date, estimated_arrival, status, cost) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    trips.forEach(trip => tripStmt.run(trip));
    tripStmt.finalize();

    // Insert maintenance records
    const maintenance = [
      [1, 'Oil Change', '2024-01-15', 250, 45000, 'Routine maintenance', 50000],
      [2, 'Tire Replacement', '2024-02-10', 1200, 38000, 'All 4 tires replaced', 43000],
      [3, 'Brake Service', '2023-12-20', 800, 52000, 'Brake pads and rotors', 57000],
      [4, 'Engine Repair', '2024-03-05', 3500, 41000, 'Major engine overhaul', 46000],
      [5, 'Oil Change', '2024-01-25', 250, 47000, 'Routine maintenance', 52000]
    ];

    const maintenanceStmt = db.prepare('INSERT INTO maintenance (truck_id, service_type, service_date, cost, odometer_reading, notes, next_service_km) VALUES (?, ?, ?, ?, ?, ?, ?)');
    maintenance.forEach(m => maintenanceStmt.run(m));
    maintenanceStmt.finalize();

    // Insert payments
    const payments = [
      [1, 1, 850, '2024-05-05', '2024-05-04', 'paid'],
      [3, 2, 1200, '2024-05-15', null, 'pending'],
      [4, 3, 950, '2024-05-20', null, 'pending'],
      [2, 4, 780, '2024-05-18', null, 'pending'],
      [1, 5, 920, '2024-04-25', '2024-04-23', 'paid']
    ];

    const paymentStmt = db.prepare('INSERT INTO payments (driver_id, trip_id, amount, due_date, paid_date, status) VALUES (?, ?, ?, ?, ?, ?)');
    payments.forEach(payment => paymentStmt.run(payment));
    paymentStmt.finalize();

    // Insert leave requests
    const leaves = [
      [2, '2024-05-20', '2024-05-22', 'Family emergency', 'approved'],
      [4, '2024-06-01', '2024-06-05', 'Vacation', 'pending']
    ];

    const leaveStmt = db.prepare('INSERT INTO leave_requests (driver_id, start_date, end_date, reason, status) VALUES (?, ?, ?, ?, ?)');
    leaves.forEach(leave => leaveStmt.run(leave));
    leaveStmt.finalize();

    setTimeout(() => {
      console.log('✓ Database seeded successfully!');
      console.log('\nDefault Login Credentials:');
      console.log('Admin: admin / admin123');
      console.log('Dispatcher: dispatcher / dispatch123');
      console.log('Driver: driver1 / driver123');
      db.close();
      process.exit(0);
    }, 500);
  });
})();
