# Transportation Management System

A comprehensive web application for managing transportation services including clients, quotes, contracts, payments, expenses, drivers, vehicles, and assignments.

## Tech Stack

### Backend
- **Node.js** with Express
- **PostgreSQL** database
- RESTful API architecture

### Frontend
- **React 19** with React Router
- **Tailwind CSS** for styling
- **Axios** for API calls
- **Lucide React** for icons

## Features

- **Dashboard**: Overview with key metrics and recent activities
- **Clients Management**: CRUD operations for client records
- **Quotes**: Manage service quotations
- **Contracts**: Track and manage contracts
- **Payments**: Record and monitor payments
- **Expenses**: Track business expenses
- **Drivers**: Manage driver information
- **Vehicles**: Fleet management
- **Assignments**: Assign drivers and vehicles to contracts
- **Payment Accounts**: Manage payment accounts

## Project Structure

```
sistema2026/
├── backend/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   ├── clientsController.js
│   │   ├── quotesController.js
│   │   ├── contractsController.js
│   │   ├── paymentsController.js
│   │   ├── paymentAccountsController.js
│   │   ├── expensesController.js
│   │   ├── driversController.js
│   │   ├── vehiclesController.js
│   │   ├── assignmentsController.js
│   │   └── dashboardController.js
│   ├── routes/
│   │   ├── clients.js
│   │   ├── quotes.js
│   │   ├── contracts.js
│   │   ├── payments.js
│   │   ├── paymentAccounts.js
│   │   ├── expenses.js
│   │   ├── drivers.js
│   │   ├── vehicles.js
│   │   ├── assignments.js
│   │   └── dashboard.js
│   ├── server.js
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Button.jsx
│   │   │   ├── FormInput.jsx
│   │   │   ├── FormSelect.jsx
│   │   │   ├── Header.jsx
│   │   │   ├── Loading.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Table.jsx
│   │   │   └── Toast.jsx
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Clients.jsx
│   │   │   ├── Quotes.jsx
│   │   │   ├── Contracts.jsx
│   │   │   ├── Payments.jsx
│   │   │   ├── Expenses.jsx
│   │   │   ├── Drivers.jsx
│   │   │   ├── Vehicles.jsx
│   │   │   ├── Assignments.jsx
│   │   │   └── PaymentAccounts.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   ├── index.js
│   │   └── index.css
│   ├── package.json
│   └── .env
└── psql_dump.sql
```

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Database Setup

1. Create a PostgreSQL database:
```bash
createdb transportation_db
```

2. Import the database schema:
```bash
psql -U postgres -d transportation_db -f psql_dump.sql
```

Or use a PostgreSQL GUI tool like pgAdmin to import the `psql_dump.sql` file.

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Update the database credentials in `.env`:
```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=transportation_db
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret
```

4. Start the backend server:
```bash
npm start
```

The API will be available at `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies (if not already installed):
```bash
npm install
```

3. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Update the API URL if needed:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

4. Start the development server:
```bash
npm start
```

The application will open in your browser at `http://localhost:3000`

## API Endpoints

### Clients
- `GET /api/clients` - Get all clients
- `GET /api/clients/:id` - Get client by ID
- `POST /api/clients` - Create new client
- `PUT /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client

### Quotes
- `GET /api/quotes` - Get all quotes
- `GET /api/quotes/:id` - Get quote by ID
- `POST /api/quotes` - Create new quote
- `PUT /api/quotes/:id` - Update quote
- `DELETE /api/quotes/:id` - Delete quote

### Contracts
- `GET /api/contracts` - Get all contracts
- `GET /api/contracts/:id` - Get contract by ID
- `POST /api/contracts` - Create new contract
- `PUT /api/contracts/:id` - Update contract
- `DELETE /api/contracts/:id` - Delete contract

### Payments
- `GET /api/payments` - Get all payments
- `GET /api/payments/:id` - Get payment by ID
- `POST /api/payments` - Create new payment
- `PUT /api/payments/:id` - Update payment
- `DELETE /api/payments/:id` - Delete payment

### Payment Accounts
- `GET /api/payment-accounts` - Get all payment accounts
- `GET /api/payment-accounts/:id` - Get payment account by ID
- `POST /api/payment-accounts` - Create new payment account
- `PUT /api/payment-accounts/:id` - Update payment account
- `DELETE /api/payment-accounts/:id` - Delete payment account

### Expenses
- `GET /api/expenses` - Get all expenses
- `GET /api/expenses/:id` - Get expense by ID
- `POST /api/expenses` - Create new expense
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense

### Drivers
- `GET /api/drivers` - Get all drivers
- `GET /api/drivers/:id` - Get driver by ID
- `POST /api/drivers` - Create new driver
- `PUT /api/drivers/:id` - Update driver
- `DELETE /api/drivers/:id` - Delete driver

### Vehicles
- `GET /api/vehicles` - Get all vehicles
- `GET /api/vehicles/:id` - Get vehicle by ID
- `POST /api/vehicles` - Create new vehicle
- `PUT /api/vehicles/:id` - Update vehicle
- `DELETE /api/vehicles/:id` - Delete vehicle

### Assignments
- `GET /api/assignments` - Get all assignments
- `GET /api/assignments/:id` - Get assignment by ID
- `POST /api/assignments` - Create new assignment
- `PUT /api/assignments/:id` - Update assignment
- `DELETE /api/assignments/:id` - Delete assignment

### Dashboard
- `GET /api/dashboard` - Get dashboard metrics and data

## Usage

1. **Start the Backend**: Run `npm start` in the `backend` directory
2. **Start the Frontend**: Run `npm start` in the `frontend` directory
3. **Access the Application**: Open your browser to `http://localhost:3000`

### First Time Setup
- The database will be populated with sample data from the SQL dump
- Navigate through the sidebar to access different modules
- Use the "+ New" buttons to create new records
- Click on edit/delete icons in tables to modify existing records

## Development

### Backend Development
- Controllers handle business logic
- Routes define API endpoints
- Database connection is managed via connection pool
- All responses follow the format: `{ success: boolean, data: any, error?: string }`

### Frontend Development
- Components are located in `src/components/`
- Pages are located in `src/pages/`
- API calls are centralized in `src/services/api.js`
- Styling uses Tailwind CSS utility classes only

## Deployment

### Backend
1. Set up a PostgreSQL database
2. Update environment variables for production
3. Deploy to a Node.js hosting service (e.g., Heroku, DigitalOcean, AWS)

### Frontend
1. Build the production version:
```bash
npm run build
```
2. Deploy the `build` folder to a static hosting service (e.g., Netlify, Vercel, AWS S3)

## License

This project is proprietary software for internal use.

## Support

For questions or issues, please contact the development team.
