const API_URL = 'http://localhost:3000/api';
let token = localStorage.getItem('token');
let currentUser = JSON.parse(localStorage.getItem('user') || '{}');

// Auth
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  
  try {
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await res.json();
    if (res.ok) {
      token = data.token;
      currentUser = data.user;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(currentUser));
      showDashboard();
    } else {
      document.getElementById('loginError').textContent = data.error;
    }
  } catch (err) {
    document.getElementById('loginError').textContent = 'Connection error';
  }
});

function logout() {
  localStorage.clear();
  location.reload();
}

function showDashboard() {
  document.getElementById('loginPage').classList.remove('active');
  if (currentUser.role === 'admin') {
    document.getElementById('adminDashboard').classList.add('active');
    showTab('overview');
  } else if (currentUser.role === 'dispatcher') {
    document.getElementById('dispatcherDashboard').classList.add('active');
    showTab('assign-trip');
  } else if (currentUser.role === 'driver') {
    document.getElementById('driverDashboard').classList.add('active');
    showTab('my-trips');
  }
}

async function apiCall(endpoint, options = {}) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: { ...options.headers, 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
  });
  return res.json();
}

// Tab switching
function showTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  event?.target?.classList.add('active');
  
  if (currentUser.role === 'admin') renderAdminTab(tab);
  else if (currentUser.role === 'dispatcher') renderDispatcherTab(tab);
  else if (currentUser.role === 'driver') renderDriverTab(tab);
}

// Admin tabs
async function renderAdminTab(tab) {
  const content = document.getElementById('adminContent');
  
  if (tab === 'overview') {
    const stats = await apiCall('/dashboard/stats');
    const trucks = await apiCall('/trucks');
    const forecast = await apiCall('/forecast');
    
    content.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <h3>Total Trucks</h3>
          <div class="value">${stats.trucks.total}</div>
          <div class="sub">${stats.trucks.available} available</div>
        </div>
        <div class="stat-card">
          <h3>Active Trips</h3>
          <div class="value">${stats.trips.active}</div>
          <div class="sub">${stats.trips.total} total</div>
        </div>
        <div class="stat-card">
          <h3>Maintenance</h3>
          <div class="value">${stats.trucks.maintenance}</div>
          <div class="sub">trucks in service</div>
        </div>
        <div class="stat-card">
          <h3>Pending Payments</h3>
          <div class="value">$${stats.payments.pending || 0}</div>
          <div class="sub">$${stats.payments.total || 0} total</div>
        </div>
      </div>
      
      <h3>Live Truck Tracking</h3>
      <div id="map"></div>
      
      <h3>7-Day Fleet Availability Forecast</h3>
      <table>
        <thead><tr><th>Date</th><th>Available</th><th>Scheduled</th></tr></thead>
        <tbody>
          ${forecast.map(f => `<tr><td>${f.date}</td><td>${f.available}</td><td>${f.scheduled}</td></tr>`).join('')}
        </tbody>
      </table>
    `;
    renderMap(trucks.filter(t => t.latitude && t.longitude));
  }
  
  else if (tab === 'trucks') {
    const trucks = await apiCall('/trucks');
    content.innerHTML = `
      <table>
        <thead><tr><th>Plate</th><th>Model</th><th>Capacity</th><th>Status</th><th>Odometer</th><th>Next Service</th></tr></thead>
        <tbody>
          ${trucks.map(t => `
            <tr>
              <td>${t.plate_number}</td>
              <td>${t.model}</td>
              <td>${t.capacity_kg} kg</td>
              <td><span class="badge ${t.status}">${t.status}</span></td>
              <td>${t.odometer_km} km</td>
              <td>${t.next_service_date || 'N/A'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }
  
  else if (tab === 'drivers') {
    const drivers = await apiCall('/drivers');
    content.innerHTML = `
      <table>
        <thead><tr><th>Name</th><th>Phone</th><th>License</th><th>Expiry</th><th>Status</th></tr></thead>
        <tbody>
          ${drivers.map(d => `
            <tr>
              <td>${d.name}</td>
              <td>${d.phone}</td>
              <td>${d.license_number}</td>
              <td>${d.license_expiry}</td>
              <td><span class="badge ${d.status}">${d.status}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }
  
  else if (tab === 'trips') {
    const trips = await apiCall('/trips');
    content.innerHTML = `
      <table>
        <thead><tr><th>Truck</th><th>Driver</th><th>Route</th><th>Distance</th><th>Start</th><th>Status</th><th>Cost</th></tr></thead>
        <tbody>
          ${trips.map(t => `
            <tr>
              <td>${t.plate_number}</td>
              <td>${t.driver_name}</td>
              <td>${t.origin} → ${t.destination}</td>
              <td>${t.distance_km} km</td>
              <td>${new Date(t.start_date).toLocaleDateString()}</td>
              <td><span class="badge ${t.status}">${t.status}</span></td>
              <td>$${t.cost}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }
  
  else if (tab === 'maintenance') {
    const maintenance = await apiCall('/maintenance');
    const trucks = await apiCall('/trucks');
    
    content.innerHTML = `
      <h3>Schedule Maintenance</h3>
      <form id="maintenanceForm" class="form-grid">
        <div class="form-group">
          <label>Truck</label>
          <select name="truck_id" required>
            ${trucks.map(t => `<option value="${t.id}">${t.plate_number} - ${t.model}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Service Type</label>
          <input name="service_type" required>
        </div>
        <div class="form-group">
          <label>Date</label>
          <input type="date" name="service_date" required>
        </div>
        <div class="form-group">
          <label>Cost</label>
          <input type="number" name="cost" required>
        </div>
        <div class="form-group">
          <label>Odometer</label>
          <input type="number" name="odometer_reading" required>
        </div>
        <div class="form-group">
          <label>Next Service KM</label>
          <input type="number" name="next_service_km">
        </div>
        <div class="form-group" style="grid-column: 1/-1;">
          <button type="submit" class="btn btn-primary">Schedule</button>
        </div>
      </form>
      
      <h3>Maintenance History</h3>
      <table>
        <thead><tr><th>Truck</th><th>Service</th><th>Date</th><th>Cost</th><th>Odometer</th></tr></thead>
        <tbody>
          ${maintenance.map(m => `
            <tr>
              <td>${m.plate_number}</td>
              <td>${m.service_type}</td>
              <td>${m.service_date}</td>
              <td>$${m.cost}</td>
              <td>${m.odometer_reading} km</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    
    document.getElementById('maintenanceForm').onsubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      await apiCall('/maintenance', {
        method: 'POST',
        body: JSON.stringify(Object.fromEntries(formData))
      });
      showTab('maintenance');
    };
  }
  
  else if (tab === 'payments') {
    const payments = await apiCall('/payments');
    content.innerHTML = `
      <table>
        <thead><tr><th>Driver</th><th>Trip</th><th>Amount</th><th>Due Date</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>
          ${payments.map(p => `
            <tr>
              <td>${p.driver_name}</td>
              <td>${p.origin || 'N/A'} → ${p.destination || 'N/A'}</td>
              <td>$${p.amount}</td>
              <td>${p.due_date}</td>
              <td><span class="badge ${p.status}">${p.status}</span></td>
              <td>
                ${p.status === 'pending' ? `<button class="btn btn-success" onclick="markPaid(${p.id})">Mark Paid</button>` : ''}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }
  
  else if (tab === 'analytics') {
    const analytics = await apiCall('/analytics');
    content.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <h3>Avg Fuel Efficiency</h3>
          <div class="value">${analytics.avgFuelEfficiency?.toFixed(1)} L/100km</div>
        </div>
        <div class="stat-card">
          <h3>Cost Per KM</h3>
          <div class="value">$${analytics.costPerKm}</div>
        </div>
        <div class="stat-card">
          <h3>Maintenance Cost (30d)</h3>
          <div class="value">$${analytics.maintenanceCost}</div>
        </div>
      </div>
    `;
  }
}

// Dispatcher tabs
async function renderDispatcherTab(tab) {
  const content = document.getElementById('dispatcherContent');
  
  if (tab === 'assign-trip') {
    const trucks = await apiCall('/trucks');
    const drivers = await apiCall('/drivers');
    const availableTrucks = trucks.filter(t => t.status === 'available');
    const availableDrivers = drivers.filter(d => d.status === 'available');
    
    content.innerHTML = `
      <h3>Assign New Trip</h3>
      <form id="tripForm" class="form-grid">
        <div class="form-group">
          <label>Truck</label>
          <select name="truck_id" id="truckSelect" required>
            ${availableTrucks.map(t => `<option value="${t.id}" data-capacity="${t.capacity_kg}">${t.plate_number} - ${t.model} (${t.capacity_kg}kg)</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Driver</label>
          <select name="driver_id" required>
            ${availableDrivers.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Origin</label>
          <input name="origin" required>
        </div>
        <div class="form-group">
          <label>Destination</label>
          <input name="destination" required>
        </div>
        <div class="form-group">
          <label>Cargo Weight (kg)</label>
          <input type="number" name="cargo_weight_kg" id="cargoWeight" required>
        </div>
        <div class="form-group">
          <label>Distance (km)</label>
          <input type="number" name="distance_km" required>
        </div>
        <div class="form-group">
          <label>Start Date</label>
          <input type="datetime-local" name="start_date" required>
        </div>
        <div class="form-group">
          <label>Estimated Arrival</label>
          <input type="datetime-local" name="estimated_arrival" required>
        </div>
        <div class="form-group">
          <label>Cost</label>
          <input type="number" name="cost" required>
        </div>
        <div class="form-group" style="grid-column: 1/-1;">
          <button type="submit" class="btn btn-primary">Assign Trip</button>
          <div id="tripError" class="error"></div>
        </div>
      </form>
    `;
    
    document.getElementById('tripForm').onsubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);
      
      const truck = availableTrucks.find(t => t.id == data.truck_id);
      if (parseInt(data.cargo_weight_kg) > truck.capacity_kg) {
        document.getElementById('tripError').textContent = 'Cargo exceeds truck capacity!';
        return;
      }
      
      const result = await apiCall('/trips', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      
      if (result.success) {
        alert('Trip assigned successfully!');
        showTab('assign-trip');
      } else {
        document.getElementById('tripError').textContent = result.error;
      }
    };
  }
  
  else if (tab === 'trips') {
    const trips = await apiCall('/trips');
    content.innerHTML = `
      <table>
        <thead><tr><th>Truck</th><th>Driver</th><th>Route</th><th>Start</th><th>Status</th></tr></thead>
        <tbody>
          ${trips.map(t => `
            <tr>
              <td>${t.plate_number}</td>
              <td>${t.driver_name}</td>
              <td>${t.origin} → ${t.destination}</td>
              <td>${new Date(t.start_date).toLocaleString()}</td>
              <td><span class="badge ${t.status}">${t.status}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }
  
  else if (tab === 'fleet-status') {
    const trucks = await apiCall('/trucks');
    const drivers = await apiCall('/drivers');
    
    content.innerHTML = `
      <h3>Trucks</h3>
      <table>
        <thead><tr><th>Plate</th><th>Model</th><th>Status</th></tr></thead>
        <tbody>
          ${trucks.map(t => `<tr><td>${t.plate_number}</td><td>${t.model}</td><td><span class="badge ${t.status}">${t.status}</span></td></tr>`).join('')}
        </tbody>
      </table>
      
      <h3>Drivers</h3>
      <table>
        <thead><tr><th>Name</th><th>Phone</th><th>Status</th></tr></thead>
        <tbody>
          ${drivers.map(d => `<tr><td>${d.name}</td><td>${d.phone}</td><td><span class="badge ${d.status}">${d.status}</span></td></tr>`).join('')}
        </tbody>
      </table>
    `;
  }
}

// Driver tabs
async function renderDriverTab(tab) {
  const content = document.getElementById('driverContent');
  const driverId = currentUser.driverId;
  
  if (tab === 'my-trips') {
    const trips = await apiCall(`/trips/driver/${driverId}`);
    content.innerHTML = `
      <table>
        <thead><tr><th>Truck</th><th>Route</th><th>Start</th><th>ETA</th><th>Status</th><th>Payment</th></tr></thead>
        <tbody>
          ${trips.map(t => `
            <tr>
              <td>${t.plate_number}</td>
              <td>${t.origin} → ${t.destination}</td>
              <td>${new Date(t.start_date).toLocaleString()}</td>
              <td>${new Date(t.estimated_arrival).toLocaleString()}</td>
              <td><span class="badge ${t.status}">${t.status}</span></td>
              <td>$${t.cost}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }
  
  else if (tab === 'payments') {
    const payments = await apiCall(`/payments/driver/${driverId}`);
    content.innerHTML = `
      <table>
        <thead><tr><th>Trip</th><th>Amount</th><th>Due Date</th><th>Paid Date</th><th>Status</th></tr></thead>
        <tbody>
          ${payments.map(p => `
            <tr>
              <td>${p.origin || 'N/A'} → ${p.destination || 'N/A'}</td>
              <td>$${p.amount}</td>
              <td>${p.due_date}</td>
              <td>${p.paid_date || 'Pending'}</td>
              <td><span class="badge ${p.status}">${p.status}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }
  
  else if (tab === 'documents') {
    const driver = await apiCall(`/drivers/${driverId}`);
    content.innerHTML = `
      <div class="form-grid">
        <div class="form-group">
          <label>License Number</label>
          <input value="${driver.license_number}" readonly>
        </div>
        <div class="form-group">
          <label>License Expiry</label>
          <input value="${driver.license_expiry}" readonly>
        </div>
      </div>
      <p>Document upload feature available in full version</p>
    `;
  }
  
  else if (tab === 'leave') {
    const leaves = await apiCall(`/leave-requests/driver/${driverId}`);
    content.innerHTML = `
      <h3>Request Leave</h3>
      <form id="leaveForm" class="form-grid">
        <div class="form-group">
          <label>Start Date</label>
          <input type="date" name="start_date" required>
        </div>
        <div class="form-group">
          <label>End Date</label>
          <input type="date" name="end_date" required>
        </div>
        <div class="form-group" style="grid-column: 1/-1;">
          <label>Reason</label>
          <textarea name="reason" rows="3"></textarea>
        </div>
        <div class="form-group" style="grid-column: 1/-1;">
          <button type="submit" class="btn btn-primary">Submit Request</button>
        </div>
      </form>
      
      <h3>Leave History</h3>
      <table>
        <thead><tr><th>Start</th><th>End</th><th>Reason</th><th>Status</th></tr></thead>
        <tbody>
          ${leaves.map(l => `
            <tr>
              <td>${l.start_date}</td>
              <td>${l.end_date}</td>
              <td>${l.reason}</td>
              <td><span class="badge ${l.status}">${l.status}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    
    document.getElementById('leaveForm').onsubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);
      data.driver_id = driverId;
      
      await apiCall('/leave-requests', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      showTab('leave');
    };
  }
}

// Map rendering
function renderMap(trucks) {
  const map = document.getElementById('map');
  if (!map) return;
  
  map.innerHTML = trucks.map(t => `
    <div class="truck-marker" style="left: ${(t.longitude + 180) / 360 * 100}%; top: ${(90 - t.latitude) / 180 * 100}%;" title="${t.plate_number}">
      🚚
    </div>
  `).join('');
}

async function markPaid(paymentId) {
  await apiCall(`/payments/${paymentId}`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'paid', paid_date: new Date().toISOString().split('T')[0] })
  });
  showTab('payments');
}

// Initialize
if (token && currentUser.role) {
  showDashboard();
}
