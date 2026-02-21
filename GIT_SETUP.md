# Git Setup Instructions

## Initial Setup

### 1. Initialize Git Repository
```bash
cd d:\problem project\fleet-management
git init
```

### 2. Add All Files
```bash
git add .
```

### 3. Create Initial Commit
```bash
git commit -m "Initial commit: Fleet Management System"
```

## Push to GitHub

### Option A: New Repository

1. **Create new repository on GitHub**
   - Go to https://github.com/new
   - Name: fleet-management-system
   - Don't initialize with README (we already have one)
   - Click "Create repository"

2. **Link and push**
```bash
git remote add origin https://github.com/YOUR_USERNAME/fleet-management-system.git
git branch -M main
git push -u origin main
```

### Option B: Existing Repository

```bash
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git
git branch -M main
git push -u origin main
```

## Future Updates

```bash
git add .
git commit -m "Your commit message"
git push
```

## Common Git Commands

```bash
# Check status
git status

# View changes
git diff

# View commit history
git log

# Create new branch
git checkout -b feature-name

# Switch branches
git checkout main

# Pull latest changes
git pull
```

## What Gets Pushed

✅ Pushed to Git:
- Source code (backend, frontend, database)
- package.json
- README.md
- Configuration files

❌ NOT pushed (in .gitignore):
- node_modules/
- *.db (database files)
- uploads/
- .env
- *.log

## Deploy to Free Hosting

### Railway.app
1. Connect GitHub repo
2. Auto-deploys on push
3. Free tier available

### Render.com
1. New Web Service
2. Connect GitHub
3. Build: `npm install`
4. Start: `npm start`

### Fly.io
```bash
flyctl launch
flyctl deploy
```
