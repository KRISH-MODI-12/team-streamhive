# Quick Setup Guide

## Step 1: Navigate to project directory
```bash
cd fleet-management
```

## Step 2: Install dependencies
```bash
npm install
```

## Step 3: Seed database
```bash
npm run seed
```

## Step 4: Start server
```bash
npm start
```

## Step 5: Open browser
Navigate to: http://localhost:3000

## Troubleshooting

**Error: Cannot find module**
- Make sure you're in the `fleet-management` directory
- Run `npm install` first

**Port already in use**
- Change PORT in backend/server.js
- Or kill the process using port 3000

**Database errors**
- Delete database/fleet.db if it exists
- Run `npm run seed` again
