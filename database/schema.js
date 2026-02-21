const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'fleet.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'dispatcher', 'driver')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Drivers table
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

  // Trucks table
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

  // Trips table
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

  // Maintenance logs table
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

  // Payments table
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

  // Leave requests table
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

  console.log('Database schema created successfully');
});

db.close();

module.exports = db;
