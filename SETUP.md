# Quick Setup Guide

## Step-by-Step Setup Instructions

### 1. Database Setup (5 minutes)

**Option A: Using Command Line**
```bash
# Create database
createdb transportation_db

# Import data
psql -U postgres -d transportation_db -f psql_dump.sql
```

**Option B: Using pgAdmin**
1. Open pgAdmin
2. Create new database named `transportation_db`
3. Right-click on the database → Restore
4. Select the `psql_dump.sql` file
5. Click Restore

### 2. Backend Setup (2 minutes)

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Update .env file with your database credentials
# Edit the .env file:
# - DB_USER: your PostgreSQL username (default: postgres)
# - DB_PASSWORD: your PostgreSQL password
# - DB_NAME: transportation_db (keep this)

# Start the server
npm start
```

You should see:
```
Server is running on port 5000
Connected to PostgreSQL database
API available at http://localhost:5000/api
```

### 3. Frontend Setup (2 minutes)

```bash
# Open a new terminal
# Navigate to frontend
cd frontend

# Dependencies are already installed from create-react-app

# Start the app
npm start
```

The application will automatically open in your browser at `http://localhost:3000`

## Verification

### Test Backend
Open your browser or use curl:
```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{"success":true,"message":"Server is running"}
```

### Test Frontend
The dashboard should load with:
- Metrics cards showing counts
- Recent contracts table
- Upcoming assignments table

## Common Issues

### Issue: "Connection refused" to PostgreSQL
**Solution:** Make sure PostgreSQL is running:
```bash
# On macOS
brew services start postgresql

# On Linux
sudo systemctl start postgresql

# On Windows
# Start PostgreSQL service from Services app
```

### Issue: "Port 5000 is already in use"
**Solution:** Kill the process or change the port in `backend/.env`:
```bash
# Find and kill process on port 5000 (macOS/Linux)
lsof -ti:5000 | xargs kill -9

# Or change PORT in .env
PORT=5001
```

### Issue: "Cannot find module"
**Solution:** Reinstall dependencies:
```bash
# In backend
cd backend
rm -rf node_modules package-lock.json
npm install

# In frontend
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Issue: Frontend shows blank page
**Solution:** 
1. Check browser console for errors
2. Verify backend is running on port 5000
3. Check `.env` file in frontend has correct API URL

## Next Steps

After successful setup:

1. **Explore the Dashboard** - View system metrics and recent activity
2. **Manage Clients** - Add, edit, or delete client records
3. **Create Quotes** - Generate service quotations
4. **Track Contracts** - Monitor active and completed contracts
5. **Record Payments** - Log payment transactions
6. **Manage Fleet** - Add drivers and vehicles
7. **Assign Jobs** - Create driver and vehicle assignments

## Default Data

The system comes with sample data imported from the SQL dump:
- ~200+ clients
- Multiple contracts and quotes
- Payment records
- Driver and vehicle information

You can:
- Use this data for testing
- Delete sample data and start fresh
- Add your own real data

## Production Deployment

For deploying to production, see the main README.md file for detailed deployment instructions.

## Getting Help

If you encounter issues:
1. Check the error message carefully
2. Verify all services are running
3. Review the Common Issues section above
4. Check the main README.md for more details
