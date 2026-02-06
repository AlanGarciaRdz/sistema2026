# Transportation Management System - Development Prompt

## Project Overview
Build a clean, responsive dashboard application for managing transportation services including clients, quotes, contracts, payments, expenses, drivers, vehicles, and assignments.

## Tech Stack
- **Backend**: Node.js with Express
- **Database**: PostgreSQL
- **Frontend**: React with Tailwind CSS (no custom CSS)
- **Libraries**: Minimum necessary only

## Backend Requirements

### Core Libraries Only
```json
{
  "express": "^4.18.2",
  "pg": "^8.11.3",
  "dotenv": "^16.3.1",
  "cors": "^2.8.5",
  "bcrypt": "^5.1.1",
  "jsonwebtoken": "^9.0.2"
}
```

### API Structure
Create RESTful endpoints for each entity:

1. **Clients** (`/api/clients`)
   - GET, POST, PUT, DELETE
   - Fields: id, name, contact_person, phone, email, address, created_at, updated_at

2. **Quotes** (`/api/quotes`)
   - GET, POST, PUT, DELETE
   - Fields: id, quote_number, client_id, start_date, end_date, origin, destination, event_type, itinerary, num_units, passenger_count, total_amount, status, valid_until, notes, created_at, updated_at
   - Status values: "Pendiente", "Enviada", "Aceptada", "Rechazada"

3. **Contracts** (`/api/contracts`)
   - GET, POST, PUT, DELETE
   - Fields: id, contract_number, quote_id, client_id, start_date, end_date, origin, destination, itinerary, passenger_count, total_amount, status, created_at, updated_at
   - Status values: "Agendado", "Realizado", "Cancelado"

4. **Payments** (`/api/payments`)
   - GET, POST, PUT, DELETE
   - Fields: id, contract_id, contract_number, payment_type, amount, payment_method, payment_account_id, payment_date, invoice_number, iva_amount, notes, created_at, updated_at
   - Payment types: "Anticipo", "Liquidación", "Total"
   - Payment methods: "Efectivo", "Transferencia", "Tarjeta"

5. **Payment Accounts** (`/api/payment-accounts`)
   - GET, POST, PUT, DELETE
   - Fields: id, account_code, account_name, account_type, bank_name, business_unit, status, notes, created_at, updated_at
   - Account types: "Banco", "Efectivo", "Tarjeta"

6. **Expenses** (`/api/expenses`)
   - GET, POST, PUT, DELETE
   - Fields: id, contract_id, expense_type, amount, payment_account_id, business_unit, expense_date, notes, created_at, updated_at
   - Expense types: "Combustible", "Casetas", "Comida", "Hospedaje", "Otros"

7. **Drivers** (`/api/drivers`)
   - GET, POST, PUT, DELETE
   - Fields: id, name, license_number, documents, phone, email, status, created_at, updated_at
   - Status values: "Active", "Inactive"

8. **Vehicles** (`/api/vehicles`)
   - GET, POST, PUT, DELETE
   - Fields: id, vehicle_code, brand, model, year, vehicle_type, license_plate, vin_number, motor, acquisition_date, acquisition_cost, sale_date, sale_price, insurance_policy, insurance_company, insurance_expiry, passenger_capacity, fuel_type, drivedocs, status, notes, created_at, updated_at
   - Status values: "Active", "Maintenance", "Inactive"

9. **Assignments** (`/api/assignments`)
   - GET, POST, PUT, DELETE
   - Fields: id, contract_id, driver_id, vehicle_id, assigned_date, driving_date, external_company_id, notes, created_at, updated_at

### Database Configuration
- Use connection pooling with `pg.Pool`
- Environment variables: `DATABASE_URL` or separate `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- Auto-generate timestamps using PostgreSQL triggers

### Backend Structure
```
backend/
├── server.js              # Express app setup
├── config/
│   └── db.js             # PostgreSQL connection
├── routes/
│   ├── clients.js
│   ├── quotes.js
│   ├── contracts.js
│   ├── payments.js
│   ├── paymentAccounts.js
│   ├── expenses.js
│   ├── drivers.js
│   ├── vehicles.js
│   └── assignments.js
├── controllers/
│   └── [entity]Controller.js
└── .env                  # Environment variables
```

## Frontend Requirements

### Tech Stack
- **React** (Create React App or Vite)
- **Tailwind CSS** (utility-first, no custom CSS)
- **React Router** for navigation
- **Axios** for API calls

### Core Libraries Only
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-router-dom": "^6.20.0",
  "axios": "^1.6.2",
  "lucide-react": "^0.294.0"
}
```

### UI Design Requirements

#### Dashboard Layout
- **Sidebar Navigation**: Fixed left sidebar with icons and labels
  - Dashboard
  - Clientes
  - Cotizaciones
  - Contratos
  - Pagos
  - Gastos
  - Choferes
  - Vehículos
  - Asignaciones
  - Cuentas de Pago

- **Main Content Area**: Clean, spacious with proper padding
- **Color Scheme**: Fresh and modern (use Tailwind's slate/blue/green palette)
- **Responsive**: Mobile-first approach, hamburger menu for mobile

#### Page Structure (Consistent for All Entities)
1. **Header Section**
   - Page title
   - Action button (e.g., "+ Nuevo Cliente", "+ Nueva Cotización")

2. **Data Table**
   - Clean table with hover effects
   - Sortable columns
   - Row actions (View, Edit, Delete icons)
   - Pagination if needed

3. **Form Modal/Page**
   - Clean form with proper labels
   - Input validation
   - Submit and Cancel buttons
   - Date pickers for date fields
   - Dropdowns for status/type fields

#### Key UI Components to Build
```
frontend/src/
├── components/
│   ├── Sidebar.jsx           # Navigation sidebar
│   ├── Header.jsx            # Page header with actions
│   ├── Table.jsx             # Reusable data table
│   ├── Modal.jsx             # Reusable modal
│   ├── FormInput.jsx         # Styled input component
│   ├── FormSelect.jsx        # Styled select component
│   └── Button.jsx            # Styled button component
├── pages/
│   ├── Dashboard.jsx         # Overview with stats
│   ├── Clients.jsx
│   ├── Quotes.jsx
│   ├── Contracts.jsx
│   ├── Payments.jsx
│   ├── Expenses.jsx
│   ├── Drivers.jsx
│   ├── Vehicles.jsx
│   ├── Assignments.jsx
│   └── PaymentAccounts.jsx
├── services/
│   └── api.js               # Axios instance and API calls
└── App.jsx                  # Main app with routing
```

### Design Guidelines
- **Typography**: Use Tailwind's default font stack
- **Spacing**: Consistent padding/margin (p-4, p-6, gap-4, etc.)
- **Cards**: Use `bg-white rounded-lg shadow-sm border border-gray-200`
- **Buttons**: 
  - Primary: `bg-blue-600 hover:bg-blue-700 text-white`
  - Secondary: `bg-gray-200 hover:bg-gray-300 text-gray-800`
  - Danger: `bg-red-600 hover:bg-red-700 text-white`
- **Tables**: 
  - Header: `bg-gray-50 text-gray-700 font-semibold`
  - Rows: `hover:bg-gray-50 border-b border-gray-200`
- **Forms**:
  - Labels: `text-sm font-medium text-gray-700 mb-1`
  - Inputs: `border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500`

### Dashboard Overview Page
Display key metrics:
- Total Clients
- Active Contracts
- Pending Quotes
- Total Revenue (Current Month)
- Recent Contracts (Table with 5 latest)
- Upcoming Assignments (Table with 15 next assignments)

## Development Guidelines

### Backend Best Practices
- Use async/await for database queries
- Implement proper error handling with try-catch
- Return consistent JSON responses: `{ success: true, data: [...] }` or `{ success: false, error: "message" }`
- Validate input data before database operations
- Use parameterized queries to prevent SQL injection

### Frontend Best Practices
- Use functional components with hooks (useState, useEffect)
- Implement loading states for async operations
- Show user feedback (success/error messages)
- Handle errors gracefully
- Keep components small and reusable
- Use Tailwind utility classes only (no inline styles or custom CSS)

### Code Style
- Use ES6+ features
- Consistent naming: camelCase for variables/functions, PascalCase for components
- Keep functions small and focused
- Add comments only for complex logic

## Initial Setup Instructions

### Backend Setup
```bash
cd backend
npm init -y
npm install express pg dotenv cors
# Create database using psql_dump.sql
# Configure .env file
# Run: node server.js
```

### Frontend Setup
```bash
npx create-react-app frontend
cd frontend
npm install react-router-dom axios lucide-react
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
# Configure tailwind.config.js
# Run: npm start
```

## Expected Deliverables

1. **Backend API**: Fully functional REST API with all endpoints
2. **Frontend Dashboard**: Clean, responsive UI with all CRUD operations
3. **Database Schema**: PostgreSQL database with all tables and relationships
4. **Documentation**: Brief README with setup instructions

## Notes
- Keep it SIMPLE and CLEAN
- Focus on functionality first, then polish
- Use minimal dependencies
- Ensure responsive design works on mobile, tablet, and desktop
- Test all CRUD operations for each entity