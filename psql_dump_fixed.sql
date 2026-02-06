-- PostgreSQL Database Dump for Transportation Management System
-- Generated from Excel data (FIXED VERSION)
-- Date: 2026-01-29 04:16:11

-- Drop existing tables (in correct order due to foreign keys)
DROP TABLE IF EXISTS assignments CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS contracts CASCADE;
DROP TABLE IF EXISTS quotes CASCADE;
DROP TABLE IF EXISTS drivers CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS payment_accounts CASCADE;
DROP TABLE IF EXISTS clients CASCADE;

-- Create tables

-- Clients table
CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quotes table
CREATE TABLE quotes (
    id SERIAL PRIMARY KEY,
    quote_number INTEGER,
    client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    start_date DATE,
    end_date DATE,
    origin VARCHAR(255),
    destination VARCHAR(255),
    event_type VARCHAR(100),
    itinerary TEXT,
    num_units INTEGER,
    passenger_count INTEGER,
    total_amount DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'Pendiente',
    valid_until DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contracts table
CREATE TABLE contracts (
    id SERIAL PRIMARY KEY,
    contract_number VARCHAR(50),
    quote_id INTEGER REFERENCES quotes(id) ON DELETE SET NULL,
    client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    start_date DATE,
    end_date DATE,
    origin VARCHAR(255),
    destination VARCHAR(255),
    itinerary TEXT,
    passenger_count INTEGER,
    total_amount DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'Agendado',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment Accounts table
CREATE TABLE payment_accounts (
    id SERIAL PRIMARY KEY,
    account_code VARCHAR(50) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50),
    bank_name VARCHAR(255),
    business_unit VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Active',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments table
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER REFERENCES contracts(id) ON DELETE CASCADE,
    contract_number VARCHAR(50),
    payment_type VARCHAR(50),
    amount DECIMAL(10,2),
    payment_method VARCHAR(50),
    payment_account_id INTEGER REFERENCES payment_accounts(id) ON DELETE SET NULL,
    payment_date DATE,
    invoice_number VARCHAR(100),
    iva_amount DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Expenses table
CREATE TABLE expenses (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER REFERENCES contracts(id) ON DELETE SET NULL,
    expense_type VARCHAR(100),
    amount DECIMAL(10,2),
    payment_account_id INTEGER REFERENCES payment_accounts(id) ON DELETE SET NULL,
    business_unit VARCHAR(100),
    expense_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Drivers table
CREATE TABLE drivers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    license_number VARCHAR(100),
    documents TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vehicles table
CREATE TABLE vehicles (
    id SERIAL PRIMARY KEY,
    vehicle_code VARCHAR(50),
    brand VARCHAR(100),
    model VARCHAR(100),
    year INTEGER,
    vehicle_type VARCHAR(100),
    license_plate VARCHAR(50),
    vin_number VARCHAR(100),
    motor VARCHAR(100),
    acquisition_date DATE,
    acquisition_cost DECIMAL(12,2),
    sale_date DATE,
    sale_price DECIMAL(12,2),
    insurance_policy VARCHAR(100),
    insurance_company VARCHAR(255),
    insurance_expiry DATE,
    passenger_capacity INTEGER,
    fuel_type VARCHAR(50),
    drivedocs TEXT,
    status VARCHAR(50) DEFAULT 'Active',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Assignments table
CREATE TABLE assignments (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER REFERENCES contracts(id) ON DELETE CASCADE,
    driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
    vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
    assigned_date DATE,
    driving_date DATE,
    external_company_id INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_quotes_client_id ON quotes(client_id);
CREATE INDEX idx_contracts_client_id ON contracts(client_id);
CREATE INDEX idx_contracts_quote_id ON contracts(quote_id);
CREATE INDEX idx_payments_contract_id ON payments(contract_id);
CREATE INDEX idx_expenses_contract_id ON expenses(contract_id);
CREATE INDEX idx_assignments_contract_id ON assignments(contract_id);
CREATE INDEX idx_assignments_driver_id ON assignments(driver_id);
CREATE INDEX idx_assignments_vehicle_id ON assignments(vehicle_id);

-- Insert data


-- Insert data into clients
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (1, 'Alberto Campirano', 'Alberto Campirano', '+52 1 33 3506 1786', NULL, NULL, '2025-10-18', '2025-10-18');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (2, 'Alejandra Gonzalez Lozano', 'Alejandra Gonzalez Lozano', '+52 1 33 1770 0171', NULL, NULL, '2025-10-20', '2025-10-20');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (3, 'Alejandra Meza', 'Alejandra Meza', '+52 1 33 1411 4968', NULL, NULL, '2026-02-06', '2026-02-06');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (4, 'Alejandro Zazueta', 'Alejandro Zazueta', '+52 1 33 2361 4626', NULL, NULL, '2026-02-06', '2026-02-06');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (5, 'Alejandro', 'Alejandro', '+52 1 33 2835 0610', NULL, NULL, '2025-07-31', '2025-07-31');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (6, 'Alejandro Veraza', NULL, '+52 1 33 2255 5037', NULL, NULL, '2025-05-17', '2025-05-17');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (7, 'Alex rosalia arturo', NULL, NULL, NULL, NULL, '2025-04-15', '2025-04-15');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (8, 'Alfredo Fregoso Arreguin', 'Alfredo Fregoso Arreguin', '+52 313 962 6452', NULL, NULL, '2025-07-27', '2025-07-27');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (9, 'Ana Ruth', 'Ana Ruth', '+52 1 33 3178 3655', NULL, NULL, '2025-07-18', '2025-07-18');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (10, 'Andrés Márquez Noriega', 'Andrés Márquez Noriega', '+52 1 477 499 5692', NULL, NULL, '2025-10-18', '2025-10-18');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (11, 'Antonio hdez', NULL, '+52 1 33 2121 2347', NULL, NULL, '2025-05-30', '2025-05-30');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (12, 'Arleth Montserrat Duarte', NULL, '+52 33 1703 1857', NULL, NULL, '2025-05-25', '2025-05-25');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (13, 'Arturo Villaseñor', 'Arturo Villaseñor', '+52 33 3100 4452', NULL, NULL, '2025-12-18', '2025-12-18');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (14, 'Axel', 'Axel', '+52 1 33 3028 0937', NULL, NULL, '2025-05-03', '2025-05-03');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (15, 'Brenda Ivonne Valencia Ezqueda ', 'Brenda Ivonne Valencia Ezqueda ', '3322102549', NULL, NULL, '2025-11-28', '2025-11-28');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (16, 'Brenda Montserrat Figueroa', 'Brenda Montserrat Figueroa', '+52 1 33 1441 1486', NULL, NULL, '2025-10-04', '2025-10-04');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (17, 'Brightcove', 'Marce Brightcove', '+52 1 33 1793 0590', NULL, NULL, '2025-10-24', '2025-10-24');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (18, 'Brightcove', 'Karla Rivero', '+52 1 33 1312 2498', NULL, NULL, NULL, NULL);
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (19, 'Bruno Gustavo De Alba Pelayo', 'Bruno Gustavo De Alba Pelayo', '+52 1 33 1584 2615', NULL, NULL, '2025-10-04', '2025-10-04');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (20, 'Bryan Ramírez', 'Bryan Ramírez', '+52 1 33 3492 9759', NULL, NULL, '2025-10-17', '2025-10-17');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (21, 'Carlos', 'Carlos', '+1 (323) 219-2531', NULL, NULL, '2025-07-26', '2025-07-26');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (22, 'Carlos Millán Flores', 'Carlos Millán Flores', '+52 1 669 229 4996', NULL, NULL, '2025-10-28', '2025-10-28');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (23, 'Carlos Wallas', 'Carlos Wallas', '+52 1 33 1711 5588', NULL, NULL, '2025-11-14', '2025-11-14');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (24, 'Carolina Chávez García', 'Carolina Chávez García', '+52 1 673 111 6352', NULL, NULL, '2025-10-04', '2025-10-04');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (25, 'Christian Ivan Carreon Cisneros', 'Christian Ivan Carreon Cisneros', '+52 1 33 2255 3662', NULL, NULL, '2025-03-30', '2025-03-30');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (26, 'Christian Villanueva', 'Christian Villanueva', '+52 1 33 1536 4730', NULL, NULL, '2025-07-29', '2025-07-29');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (27, 'Claus Witte', 'Carolina Tene', '+52 1 33 1070 1417', NULL, NULL, '2025-11-16', '2025-11-16');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (28, 'Cliente Aéreo', 'Cliente Aéreo', NULL, NULL, NULL, '2025-11-16', '2025-11-16');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (29, 'Cristina', 'Cristina', '+52 1 33 1885 7913', NULL, NULL, '2025-09-12', '2025-09-12');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (30, 'Damián', NULL, '+52 1 33 3502 7896', NULL, NULL, '2025-05-30', '2025-05-30');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (31, 'Daniela', 'Daniela', '+52 1 33 2181 5748', NULL, NULL, '2025-11-30', '2025-11-30');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (32, 'Debora Gutierrez Hermosillo', 'Debora Gutierrez Hermosillo', '+52 1 33 3137 1983', NULL, NULL, '2025-11-08', '2025-11-08');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (33, 'Descender', 'Ivan D Nava', '+52 1 33 3409 4436', 'info.descender@gmail.com', NULL, '2025-10-01', '2025-10-01');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (34, 'Didier Guzmán', 'Didier Guzmán', '+52 1 33 2494 3319', NULL, NULL, '2025-11-15', '2025-11-15');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (35, 'Diego Del Angel', 'Diego Del Angel', '+52 1 33 3822 3146', NULL, NULL, '2025-11-01', '2025-11-01');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (36, 'Eduardo Garcia Mireles', 'Eduardo Garcia Mireles', '+52 1 221 198 9692', NULL, NULL, '2025-11-21', '2025-11-21');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (37, 'Elena Camino', 'Elena Camino', '+52 1 33 1117 2321', NULL, NULL, '2025-11-22', '2025-11-22');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (38, 'Elizabeth C. Sayula', NULL, '+52 1 33 3270 1566', NULL, NULL, '2025-05-30', '2025-05-30');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (39, 'Emmanuel Rivera Gastelum', 'Emmanuel Rivera Gastelum', '+52 1 33 3195 7807', NULL, NULL, '2025-11-15', '2025-11-15');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (40, 'Epicenter', 'Lucio', '+52 1 33 1820 0054', NULL, NULL, '2025-11-13', '2025-11-13');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (41, 'Erick Hernández', 'Erick Hernández', '+52 1 33 1954 3366', NULL, NULL, '2025-07-12', '2025-07-12');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (42, 'Escuela Culinaria Internacional', 'Escuela Culinaria Internacional', '+52 1 33 2182 7216', NULL, NULL, '2025-11-24', '2025-11-24');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (43, 'Explora Mexico', 'Renato', '+52 1 33 1409 4298', NULL, NULL, '2025-03-27', '2025-03-27');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (44, 'Explora Mexico', 'Magdiel', '+52 1 33 2185 2075', NULL, NULL, '2025-10-16', '2025-10-16');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (45, 'Fer Cuevas', 'Fer Cuevas', '+61 413 391 808', NULL, NULL, '2025-05-03', '2025-05-03');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (46, 'Florencia Salido', 'Ana Paula Salido', '+52 1 33 1718 7246', NULL, NULL, '2025-11-02', '2025-11-02');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (47, 'Geovanna Loza', NULL, '+52 1 33 1154 9485', NULL, NULL, '2025-06-07', '2025-06-07');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (48, 'GPO CAPITAL - WIZELINE 10 pax', NULL, NULL, NULL, NULL, '2025-06-23', '2025-06-23');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (49, 'Israel Ramírez vela', 'Israel Ramírez vela', '+52 1 33 1433 9514', NULL, NULL, '2025-08-20', '2025-08-20');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (50, 'ITESO', 'Pablos Hernández Iteso', '+52 1 33 2578 4460', NULL, NULL, '2025-04-26', '2025-04-26');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (51, 'Jessy Orozco', 'Jessy Orozco', '3319-96-7639', NULL, NULL, '2025-08-15', '2025-08-15');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (52, 'Jonathan Esparza', 'Jonathan Esparza', '+52 1 33 1759 7835', NULL, NULL, '2025-08-22', '2025-08-22');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (53, 'Jorge jauregui', 'Jorge jauregui', '+52 1 33 2847 1174', NULL, NULL, '2025-07-13', '2025-07-13');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (54, 'José Antonio Gómez Rocha', NULL, '+52 1 33 3443 2734', NULL, NULL, '2025-05-01', '2025-05-01');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (55, 'José Manuel Martinez Cordova ', 'José Manuel Martinez Cordova ', '+52 33 3626 7423', NULL, NULL, '2025-11-08', '2025-11-08');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (56, 'Juan Carlos Reynoso Alvarez ', 'Juan Carlos Reynoso Alvarez ', '+52 33 1328 3614', NULL, NULL, '2025-11-07', '2025-11-07');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (57, 'Karla Padilla', 'Karla Padilla', '+52 1 395 785 9489', NULL, NULL, '2025-11-08', '2025-11-08');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (58, 'Laura Bolaños', NULL, '+52 1 33 1824 6993', NULL, NULL, '2025-05-24', '2025-05-24');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (59, 'Lorena Macías Sánchez', 'Lorena Macías Sánchez', '+52 1 612 102 4062', NULL, NULL, '2025-10-04', '2025-10-04');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (60, 'Lourdes Navarro', 'Lourdes Navarro', '+52 1 33 3442 8031', NULL, NULL, '2025-11-22', '2025-11-22');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (61, 'Lourdes Navarro', 'Mariana López', '+52 1 33 3442 8031', NULL, NULL, '2025-07-12', '2025-07-12');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (62, 'Mafer Cárdenas', 'Mafer Cárdenas', '+52 1 33 2106 4446', NULL, NULL, '2025-10-25', '2025-10-25');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (63, 'Mar Plascencia', 'Mar Plascencia', '+52 1 33 3462 8797', NULL, NULL, '2025-11-17', '2025-11-17');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (64, 'Marco Sanchez', 'Marco Sanchez', '+52 1 33 3559 7853', NULL, NULL, '2025-04-04', '2025-04-04');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (65, 'Maritza Abdias', NULL, '+52 1 33 2485 5576', NULL, NULL, '2025-05-17', '2025-05-17');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (66, 'Melissa Slotnick', 'Melissa Slotnick', '+1 (347) 525-7119', NULL, NULL, '2025-12-19', '2025-12-19');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (67, 'Michelle puentes', 'Michelle puentes', '‪+1 (218) 414‑0291‬', NULL, NULL, '2025-07-25', '2025-07-25');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (68, 'Miguel Primo', 'Miguel Primo', '+1 (619) 334-7587', NULL, NULL, '2025-11-01', '2025-11-01');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (69, 'Nancy', 'Nancy', '+52 1 33 2182 7216', NULL, NULL, '2025-10-21', '2025-10-21');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (70, 'Natalia Martínez Mejía', NULL, '+52 1 33 1005 1065', NULL, NULL, '2025-05-30', '2025-05-30');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (71, 'Natalia Rostenberg', 'Natalia Rostenberg', '+52 1 55 1802 6811', NULL, NULL, '2025-12-19', '2025-12-19');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (72, 'Neostella', 'Brian Mayer', '+57 314 7739796', NULL, NULL, '2025-10-01', '2025-10-01');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (73, 'Neostella', 'Stalin Di Carlo Neostella', '+57 314 7739796', NULL, NULL, NULL, NULL);
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (74, 'Pablos Hernández Iteso', 'Pablos Hernández Iteso', '+52 1 33 2578 4460', NULL, NULL, '2025-07-11', '2025-07-11');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (75, 'Platino', 'Alfonso Magaña', '+52 1 33 1356 4728', 'maganavaldovinosalfonso@gmail.com', NULL, '2025-11-15', '2025-11-15');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (76, 'ProyectoZero', 'Tere Lora', '+52 1 33 1095 6217', NULL, NULL, '2025-12-27', '2025-12-27');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (77, 'Publico general', NULL, '+00 000 000 00', NULL, NULL, '2025-05-04', '2025-05-04');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (78, 'Remedios Molina Carranza', 'Remedios Molina Carranza (40 pax)', '3327-67-7413', NULL, NULL, '2025-10-11', '2025-10-11');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (79, 'Ricardo Mora', 'Ricardo Mora', '+52 1 33 3676 2091', NULL, NULL, '2025-11-07', '2025-11-07');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (80, 'Ricardo Ríos', 'Ricardo Ríos', '+52 1 33 3455 6888', NULL, NULL, '2025-08-21', '2025-08-21');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (81, 'Ricky bayardo', 'Alex zazueta', ' +52 1 33 1432 2855', NULL, NULL, '2025-04-11', '2025-04-11');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (82, 'Rosalinda Arvizu', NULL, '+52 1 33 1822 1379', NULL, NULL, '2025-05-03', '2025-05-03');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (83, 'Santiago Villaseñor', 'Anahi Santiago Villaseñor', '+52 1 33 1223 8906', NULL, NULL, '2025-10-31', '2025-10-31');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (84, 'Santiago Villaseñor', 'Karla Rojas', '+52 1 443 465 2391', NULL, NULL, '2025-12-19', '2025-12-19');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (85, 'Santiago Villaseñor', 'Sofia Nieto Trejo', '+52 1 33 1587 8855', NULL, NULL, '2025-09-27', '2025-09-27');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (86, 'Sarai Murillo Sandoval', 'Sarai Murillo Sandoval', '+52 1 33 1436 9940', NULL, NULL, '2025-10-31', '2025-10-31');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (87, 'Sarape Films', 'Marisol Sarape Films', '+52 1 33 3505 0039', NULL, NULL, '2025-07-09', '2025-07-09');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (88, 'Saúl Moreno Paz', 'Saúl Moreno Paz', '+52 1 33 1177 9856', NULL, NULL, '2025-10-04', '2025-10-04');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (89, 'Sebastián Alfaro', NULL, '+52 1 624 226 0300', NULL, NULL, '2025-05-17', '2025-05-17');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (90, 'Sergio Vázquez Ornelas', 'Sergio Vázquez Ornelas', '+52 1 33 1845 9728', NULL, NULL, '2025-11-28', '2025-11-28');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (91, 'SETEG', 'Eduardo Favio', '+52 867 735 9890', NULL, NULL, '2025-11-20', '2025-11-20');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (92, 'SETEG', 'David Seteg', '+52 1 33 1241 7453', NULL, NULL, '2025-11-01', '2025-11-01');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (93, 'SETEG', 'Jorge Alberto Covarrubias', '+52 1 33 2239 7741', NULL, NULL, '2025-07-27', '2025-07-27');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (94, 'Soudeira', 'Ana Quintana', '+52 1 33 3370 9435', NULL, NULL, '2025-10-25', '2025-10-25');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (95, 'Stephany barraza', NULL, '+1 (720) 762-1766', NULL, NULL, '2025-06-06', '2025-06-06');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (96, 'Stuart Hicks', 'Stuart Hicks', NULL, NULL, NULL, '2025-10-12', '2025-10-12');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (97, 'Taxa', 'Miguel valtierra', '+52 1 33 1774 8490', 'taxagdl@gmail.com', NULL, '2025-03-28', '2025-03-28');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (98, 'Teresita de Jesús Lora Vivar', 'Teresita de Jesús Lora Vivar', '+52 1 33 1095 6217', NULL, NULL, '2025-10-18', '2025-10-18');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (99, 'Tio Rubén', 'Tio Rubén', '+52 1 33 1323 6322', NULL, NULL, '2025-11-28', '2025-11-28');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (100, 'Trento', 'Rosy Castro Trento', '+52 1 33 3361 7462', NULL, NULL, '2025-12-12', '2025-12-12');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (101, 'Vecino enfrente', NULL, NULL, NULL, NULL, '2025-04-12', '2025-04-12');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (102, 'Victor', NULL, NULL, NULL, NULL, '2025-03-28', '2025-03-28');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (103, 'Wina Cueriel', NULL, '+52 8181877436', NULL, NULL, '2025-05-24', '2025-05-24');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (104, 'Yesenia Guadalupe Arreola Angulo ', 'Yessenia Guadalupe Arreola Angulo ', '+52 33 1466 5229', NULL, NULL, '2025-11-01', '2025-11-01');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (105, 'Zenith Adventure Media', 'Angie del Río', '+52 1 33 1362 1472', 'admon@zet4media.com,angelicadelriogtz@gmail.com', NULL, '2025-10-14', '2025-10-14');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (106, 'Zenith Adventure Media', 'Luis Eduardo Rodríguez', '+52 1 33 1291 6837', 'admon@zet4media.com', NULL, NULL, NULL);
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (107, 'Zeppel', 'Adan', '+52 1 33 1603 6342', NULL, NULL, '2025-07-14', '2025-07-14');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (108, 'Paola Garcia', 'Paola Garcia', '+52 1 33 1622 8936', NULL, NULL, '2026-01-14', '2026-01-14');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (109, 'Ana Montes de Oca', 'Ana Montes de Oca', '+52 1 33 1185 5626', NULL, NULL, '2026-01-17', '2026-01-17');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (110, 'Sebastián Alfaro', 'Sebastián Alfaro', '+6242260300', NULL, NULL, '2026-01-17', '2026-01-17');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (111, 'Ana Montes de Oca', 'Cecilia Montaño', '+52 1 33 3058 3286', NULL, NULL, '2026-01-17', '2026-01-17');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (112, 'Hector giovanni hernandez', 'Hector giovanni hernandez', '+52 1 33 2668 8319', NULL, NULL, '2026-01-17', '2026-01-17');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (113, 'Santiago Villaseñor', 'Montze', '+52 1 33 3245 2629', NULL, NULL, '2026-01-21', '2026-01-21');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (114, 'Zenith Adventure Media', 'Benjamin', '+52 1 33 3661 4036', NULL, NULL, '2026-01-20', '2026-01-20');
INSERT INTO clients (id, name, contact_person, phone, email, address, created_at, updated_at) VALUES (115, 'Alejandrina Mendoza Arce', 'Alejandrina Mendoza Arce', '+52 1 33 1991 8825', NULL, NULL, '2026-01-23', '2026-01-23');
SELECT setval(pg_get_serial_sequence('clients', 'id'), (SELECT MAX(id) FROM clients));

-- Insert data into quotes
INSERT INTO quotes (id, quote_number, client_id, start_date, end_date, origin, destination, event_type, itinerary, num_units, passenger_count, total_amount, status, valid_until, notes, created_at, updated_at) VALUES (1, 0, 25, '2026-01-01', '2026-01-01', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-01', '2026-01-01');
INSERT INTO quotes (id, quote_number, client_id, start_date, end_date, origin, destination, event_type, itinerary, num_units, passenger_count, total_amount, status, valid_until, notes, created_at, updated_at) VALUES (2, 1, 43, '2026-01-01', '2026-01-01', 'GDL', 'Tepic', 'Turismo', 'Mayo 04 - Pick up aeropuerto GDL - Traslado a Tequila ( tour - comida) - Traslado a Tepic Nayarit
$8500 solo ida terminando en tepic
5 Mayo tepic - punta mita - tepic - $7000 

15500', 1, 20, 15500, 'SENT', NULL, NULL, '2026-01-01', '2026-01-01');
INSERT INTO quotes (id, quote_number, client_id, start_date, end_date, origin, destination, event_type, itinerary, num_units, passenger_count, total_amount, status, valid_until, notes, created_at, updated_at) VALUES (3, 2, 43, '2026-01-01', '2026-01-01', 'GDL', 'Huasteca', 'Turismo', '25 marzo 5:00 am GDL - El Naranjo (alojamiento en Huasteca Secreta)
26 marzo El Naranjo - Cascada de Minas Viejas- Cascada de Micos- Cd Valles
27 marzo  Puente de Dios - Tamasopo - Cd Valles
28 marzo  Cascada de Tamul - cueva del agua - alojamiento en Tanchachi
29 marzo 09:30 Regreso a Guadalajara con parada en centro de san luis', 1, 20, 33295, 'SENT', NULL, NULL, '2026-01-01', '2026-01-01');
INSERT INTO quotes (id, quote_number, client_id, start_date, end_date, origin, destination, event_type, itinerary, num_units, passenger_count, total_amount, status, valid_until, notes, created_at, updated_at) VALUES (4, 3, 43, '2026-01-01', '2026-01-01', 'GDL', 'Huasteca', 'Turismo', '25 marzo 5:00 am GDL - El Naranjo (alojamiento en Huasteca Secreta)
26 marzo El Naranjo - Cascada de Minas Viejas- Cascada de Micos- Cd Valles
27 marzo  Puente de Dios - Tamasopo - Cd Valles
28 marzo  Cascada de Tamul - cueva del agua - alojamiento en Tanchachi
29 marzo 09:30 Regreso a Guadalajara con parada en centro de san luis', 1, 14, 30170, 'SENT', NULL, NULL, '2026-01-01', '2026-01-01');
INSERT INTO quotes (id, quote_number, client_id, start_date, end_date, origin, destination, event_type, itinerary, num_units, passenger_count, total_amount, status, valid_until, notes, created_at, updated_at) VALUES (5, 4, 24, '2026-01-01', '2026-01-01', 'GDL', 'Talpa', 'Turismo', '1 día de servicio ', 1, 14, 8500, 'DRAFT', NULL, NULL, '2026-01-01', '2026-01-01');
INSERT INTO quotes (id, quote_number, client_id, start_date, end_date, origin, destination, event_type, itinerary, num_units, passenger_count, total_amount, status, valid_until, notes, created_at, updated_at) VALUES (6, 5, 24, '2026-01-01', '2026-01-01', 'GDL', 'Talpa', 'Turismo', '1 día de servicio ', 1, 20, 10000, 'DRAFT', NULL, NULL, '2026-01-01', '2026-01-01');
INSERT INTO quotes (id, quote_number, client_id, start_date, end_date, origin, destination, event_type, itinerary, num_units, passenger_count, total_amount, status, valid_until, notes, created_at, updated_at) VALUES (7, 6, 24, '2026-01-01', '2026-01-01', 'GDL', 'Talpa', 'Turismo', '2 días de servicio', 1, 14, 12500, 'DRAFT', NULL, NULL, '2026-01-01', '2026-01-01');
INSERT INTO quotes (id, quote_number, client_id, start_date, end_date, origin, destination, event_type, itinerary, num_units, passenger_count, total_amount, status, valid_until, notes, created_at, updated_at) VALUES (8, 7, 24, '2026-01-01', '2026-01-01', 'GDL', 'Talpa', 'Turismo', '2 días de servicio', 1, 20, 13500, 'DRAFT', NULL, NULL, '2026-01-01', '2026-01-01');
INSERT INTO quotes (id, quote_number, client_id, start_date, end_date, origin, destination, event_type, itinerary, num_units, passenger_count, total_amount, status, valid_until, notes, created_at, updated_at) VALUES (9, 8, 24, '2026-01-01', '2026-01-01', 'GDL', 'Talpa', 'Turismo', '3 días de servicio', 1, 14, 16000, 'DRAFT', NULL, NULL, '2026-01-01', '2026-01-01');
INSERT INTO quotes (id, quote_number, client_id, start_date, end_date, origin, destination, event_type, itinerary, num_units, passenger_count, total_amount, status, valid_until, notes, created_at, updated_at) VALUES (10, 9, 24, '2026-01-01', '2026-01-01', 'GDL', 'Talpa', 'Turismo', '3 días de servicio', 1, 20, 18000, 'DRAFT', NULL, NULL, '2026-01-01', '2026-01-01');
INSERT INTO quotes (id, quote_number, client_id, start_date, end_date, origin, destination, event_type, itinerary, num_units, passenger_count, total_amount, status, valid_until, notes, created_at, updated_at) VALUES (11, 10, 24, '2026-01-01', '2026-01-01', 'GDL', 'Talpa', 'Turismo', '4 días de servicio', 1, 14, 19000, 'DRAFT', NULL, NULL, '2026-01-01', '2026-01-01');
INSERT INTO quotes (id, quote_number, client_id, start_date, end_date, origin, destination, event_type, itinerary, num_units, passenger_count, total_amount, status, valid_until, notes, created_at, updated_at) VALUES (12, 11, 24, '2026-01-01', '2026-01-01', 'GDL', 'Talpa', 'Turismo', '4 días de servicio', 1, 20, 21500, 'DRAFT', NULL, NULL, '2026-01-01', '2026-01-01');
INSERT INTO quotes (id, quote_number, client_id, start_date, end_date, origin, destination, event_type, itinerary, num_units, passenger_count, total_amount, status, valid_until, notes, created_at, updated_at) VALUES (13, 12, 24, '2026-01-01', '2026-01-01', 'GDL', 'Cantaritos', 'Turismo', '10 horas', 1, 8, 3800, 'DRAFT', NULL, NULL, '2026-01-01', '2026-01-01');
INSERT INTO quotes (id, quote_number, client_id, start_date, end_date, origin, destination, event_type, itinerary, num_units, passenger_count, total_amount, status, valid_until, notes, created_at, updated_at) VALUES (14, 13, 24, '2026-01-01', '2026-01-01', 'GDL', 'Cantaritos', 'Turismo', '10 horas', 1, 14, 4600, 'DRAFT', NULL, NULL, '2026-01-01', '2026-01-01');
INSERT INTO quotes (id, quote_number, client_id, start_date, end_date, origin, destination, event_type, itinerary, num_units, passenger_count, total_amount, status, valid_until, notes, created_at, updated_at) VALUES (15, 14, 24, '2026-01-01', '2026-01-01', 'GDL', 'Cantaritos', 'Turismo', '10 horas', 1, 20, 5900, 'DRAFT', NULL, NULL, '2026-01-01', '2026-01-01');
INSERT INTO quotes (id, quote_number, client_id, start_date, end_date, origin, destination, event_type, itinerary, num_units, passenger_count, total_amount, status, valid_until, notes, created_at, updated_at) VALUES (16, 15, 64, '2026-01-01', '2026-01-01', 'GDL', 'Talpa', 'Turismo', 'Seria a Talpa 
- Saliendo el viernes 20 de Marzo a las 2 am de GDL - torres amarillas 
- Regresamos el 21 marzo a GDL después de comer 
- 
- la camioneta que nos vaya esperando como la vez pasada 
- pasamos la noche en atenguillo 
- salimos a la tirada final a talpa  llegando alla por el medio dia', 2, 20, 27000, 'ACCEPTED', NULL, NULL, '2026-01-01', '2026-01-01');
INSERT INTO quotes (id, quote_number, client_id, start_date, end_date, origin, destination, event_type, itinerary, num_units, passenger_count, total_amount, status, valid_until, notes, created_at, updated_at) VALUES (17, 16, 64, '2026-01-01', '2026-01-01', 'GDL', 'Talpa', 'Turismo', 'Seria a Talpa 
- Saliendo el viernes 20 de Marzo a las 2 am de GDL - torres amarillas 
- Regresamos el 21 marzo a GDL después de comer 
- 
- la camioneta que nos vaya esperando como la vez pasada 
- pasamos la noche en atenguillo 
- salimos a la tirada final a talpa  llegando alla por el medio dia', NULL, 14, 12500, 'ACCEPTED', NULL, NULL, '2026-01-01', '2026-01-01');
INSERT INTO quotes (id, quote_number, client_id, start_date, end_date, origin, destination, event_type, itinerary, num_units, passenger_count, total_amount, status, valid_until, notes, created_at, updated_at) VALUES (18, 17, 82, '2026-01-01', '2026-01-01', 'GDL', 'Boda', 'Evento social', 'Inicia en templo San Juan Macias y llevar a invitados a Grandala (Dirección: Av. Ramón Corona, Av. Cucba 437, 45220 Zapopan, Jal.) 

y en los horarios de 1:30 am a 3:00 am que este a disposición para llevar a invitados o niños a su hotel que seguro es por la zona de Andares)', NULL, 20, 5800, 'DRAFT', NULL, NULL, '2026-01-01', '2026-01-01');
INSERT INTO quotes (id, quote_number, client_id, start_date, end_date, origin, destination, event_type, itinerary, num_units, passenger_count, total_amount, status, valid_until, notes, created_at, updated_at) VALUES (19, 18, 44, '2026-01-01', '2026-01-01', 'GDL', 'Aeropuerto vallarta - Tequila', 'Turismo', 'Traslado sencillo Aeropuerto PVR - Casa Salles tentativo 18 o 19 ene', NULL, 20, 11921, 'SENT', NULL, NULL, '2026-01-01', '2026-01-01');
INSERT INTO quotes (id, quote_number, client_id, start_date, end_date, origin, destination, event_type, itinerary, num_units, passenger_count, total_amount, status, valid_until, notes, created_at, updated_at) VALUES (20, 19, 108, '2026-01-01', '2026-01-01', 'GDL', 'Xochitepec', 'Turismo', NULL, NULL, 7, 22600, 'ACCEPTED', NULL, NULL, '2026-01-01', '2026-01-01');
INSERT INTO quotes (id, quote_number, client_id, start_date, end_date, origin, destination, event_type, itinerary, num_units, passenger_count, total_amount, status, valid_until, notes, created_at, updated_at) VALUES (21, 20, 26, '2026-01-01', '2026-01-01', 'GDL', 'boda benazuza', 'Turismo', NULL, 3, 20, 13500, 'SENT', NULL, NULL, '2026-01-01', '2026-01-01');
INSERT INTO quotes (id, quote_number, client_id, start_date, end_date, origin, destination, event_type, itinerary, num_units, passenger_count, total_amount, status, valid_until, notes, created_at, updated_at) VALUES (22, 21, 3, '2026-01-01', '2026-01-01', 'GDL', 'Xochitepec', 'Turismo', 'GDL - Hotel Jardines cerritos Xochitepec SIN MOVIMIENTOS', 1, 14, 21000, 'ACCEPTED', NULL, NULL, '2026-01-01', '2026-01-01');
INSERT INTO quotes (id, quote_number, client_id, start_date, end_date, origin, destination, event_type, itinerary, num_units, passenger_count, total_amount, status, valid_until, notes, created_at, updated_at) VALUES (23, 22, 100, '2026-04-17', '2026-04-17', 'GDL', 'Hacienda de tequila cuadra', 'Empresarial', 'GDL - Tepa - GDL', 1, 14, 4800, 'SENT', NULL, NULL, '2026-04-17', '2026-04-17');
INSERT INTO quotes (id, quote_number, client_id, start_date, end_date, origin, destination, event_type, itinerary, num_units, passenger_count, total_amount, status, valid_until, notes, created_at, updated_at) VALUES (24, 23, 100, '2026-04-18', '2026-04-18', 'GDL', 'Hacienda de tequila cuadra', 'Empresarial', 'GDL - Tepa - GDL', 3, 60, 16800, 'SENT', NULL, NULL, '2026-04-18', '2026-04-18');
INSERT INTO quotes (id, quote_number, client_id, start_date, end_date, origin, destination, event_type, itinerary, num_units, passenger_count, total_amount, status, valid_until, notes, created_at, updated_at) VALUES (25, 24, 60, '2026-01-24', '2026-01-24', 'GDL', 'Tequila', 'Turismo', 'Itinerario Tequila 🍾🥃
🥃 8:30 AM salida clínica 93 
🥃 8:50 AM gasolinera autopista Zapotlanejo frente a burger king ( cerca de la central nueva)
🥃 9:20 AM Burger king colón y Lázaro cárdenas 
🥃 10:00 AM llegada a casa 3 mujeres 
🥃 12:30 PM llegada complejo paraíso azul 
🥃 2:20 PM llegada centro de tequila 
🥃4:40 PM salida a cantaritos el Cheche 
🥃5:10 PM llegada a cantaritos 
🥃8:30 PM regreso a GDL', 1, 20, 6300, 'SENT', NULL, NULL, '2026-04-13', '2026-04-13');
INSERT INTO quotes (id, quote_number, client_id, start_date, end_date, origin, destination, event_type, itinerary, num_units, passenger_count, total_amount, status, valid_until, notes, created_at, updated_at) VALUES (26, 25, 60, '2026-01-24', '2026-01-24', 'GDL', 'Evento social', 'Evento social', 'La salida sería de patria y vallarta tipo 3/4 pm y la recogida sería a la altura de bugambilias entre 2 y 3 am', 1, 10, 4300, 'SENT', NULL, NULL, '2026-01-21', '2026-01-21');
INSERT INTO quotes (id, quote_number, client_id, start_date, end_date, origin, destination, event_type, itinerary, num_units, passenger_count, total_amount, status, valid_until, notes, created_at, updated_at) VALUES (27, 26, 113, '2026-05-09', '2026-05-09', 'GDL', 'Boda', 'Evento social', 'Hotel fiesta americana a Hacienda Benazuza y regreso, igual escalonado', 10, 200, 56000, 'SENT', NULL, NULL, '2026-01-21', '2026-01-21');
INSERT INTO quotes (id, quote_number, client_id, start_date, end_date, origin, destination, event_type, itinerary, num_units, passenger_count, total_amount, status, valid_until, notes, created_at, updated_at) VALUES (28, 27, 84, '2026-01-25', '2026-01-25', 'GDL', 'Tornaboda', 'Evento social', 'Suburbans para el domingo 11:45 - 8:00 pm', 3, 21, 26100, 'ACCEPTED', NULL, NULL, '2026-01-21', '2026-01-21');
INSERT INTO quotes (id, quote_number, client_id, start_date, end_date, origin, destination, event_type, itinerary, num_units, passenger_count, total_amount, status, valid_until, notes, created_at, updated_at) VALUES (29, 28, 49, '2026-02-07', '2026-02-08', 'GDL', 'Boda', 'Evento social', 'Sería a las 8 llevarnos a la fiesta, empieza a las a las 9
Y sería recogernos a las 3 am en el salón
Dirección 
Prol. Río Blanco 1676-interior 362, Los Almendros, 45135 Zapopan, Jal.
https://maps.app.goo.gl/3PvCd7CnZoWd5ANG9?g_st=iw', 1, 20, 4000, 'ACCEPTED', NULL, NULL, '2026-01-21', '2026-01-21');
INSERT INTO quotes (id, quote_number, client_id, start_date, end_date, origin, destination, event_type, itinerary, num_units, passenger_count, total_amount, status, valid_until, notes, created_at, updated_at) VALUES (30, 29, 114, '2026-02-21', '2026-02-21', 'GDL', 'Aeropuerto', 'Traslado', 'aeropuerto a mi Oficina en la Seattle 8 personas', 1, 14, 1800, 'SENT', NULL, NULL, '2026-01-20', '2026-01-20');
INSERT INTO quotes (id, quote_number, client_id, start_date, end_date, origin, destination, event_type, itinerary, num_units, passenger_count, total_amount, status, valid_until, notes, created_at, updated_at) VALUES (31, 30, 76, NULL, NULL, 'GDL', 'CDMX', 'Turismo', '1 dia cdmx proyecto cero No incluye estacionamientos y Ni segundo piso', 1, 14, 18500, 'SENT', NULL, NULL, '2026-01-20', '2026-01-20');
INSERT INTO quotes (id, quote_number, client_id, start_date, end_date, origin, destination, event_type, itinerary, num_units, passenger_count, total_amount, status, valid_until, notes, created_at, updated_at) VALUES (32, 31, 76, NULL, NULL, 'GDL', 'CDMX', 'Turismo', '2 dia cdmx proyecto cero No incluye estacionamientos y Ni segundo piso', 1, 14, 22500, 'SENT', NULL, NULL, '2026-01-20', '2026-01-20');
INSERT INTO quotes (id, quote_number, client_id, start_date, end_date, origin, destination, event_type, itinerary, num_units, passenger_count, total_amount, status, valid_until, notes, created_at, updated_at) VALUES (33, 32, 76, NULL, NULL, 'GDL', 'Punta mita', 'Turismo', '1 dia punta mita proyecto cero No incluye estacionamientos y Ni segundo piso', 1, 20, 11500, 'SENT', NULL, NULL, '2026-01-20', '2026-01-20');
INSERT INTO quotes (id, quote_number, client_id, start_date, end_date, origin, destination, event_type, itinerary, num_units, passenger_count, total_amount, status, valid_until, notes, created_at, updated_at) VALUES (34, 33, 76, NULL, NULL, 'GDL', 'Punta mita', 'Turismo', '2 dia punta mita proyecto cero No incluye estacionamientos y Ni segundo piso', 1, 20, 16000, 'SENT', NULL, NULL, '2026-01-20', '2026-01-20');
INSERT INTO quotes (id, quote_number, client_id, start_date, end_date, origin, destination, event_type, itinerary, num_units, passenger_count, total_amount, status, valid_until, notes, created_at, updated_at) VALUES (35, 34, 23, '2026-02-24', '2026-02-24', 'GDL', 'Nevado colima', 'Turismo', 'Nevado colima saliendo de tonala, macrolibramirento es aparte', 1, 14, 11000, 'SENT', NULL, NULL, '2026-01-20', '2026-01-20');
INSERT INTO quotes (id, quote_number, client_id, start_date, end_date, origin, destination, event_type, itinerary, num_units, passenger_count, total_amount, status, valid_until, notes, created_at, updated_at) VALUES (36, 35, 109, '2026-02-06', '2026-02-08', 'GDL', 'CDMX', 'Turismo', 'Para marzo salir el dia 6 por la noche, 7 y regresar el domingo. Es a villa, plaza de las 3 culturas,  banco de mexico museo, museo correos de mexico, garibaldi,  tepozotlan.', 1, 20, 27100, 'SENT', NULL, NULL, '2026-01-19', '2026-01-19');
INSERT INTO quotes (id, quote_number, client_id, start_date, end_date, origin, destination, event_type, itinerary, num_units, passenger_count, total_amount, status, valid_until, notes, created_at, updated_at) VALUES (37, 36, 109, '2026-04-17', '2026-04-20', 'GDL', 'Los ayala', 'Turismo', 'los aya Nayarit del 17 al 20 de abril saliendo del salto', 1, 20, 15000, 'SENT', NULL, NULL, '2026-01-19', '2026-01-19');
INSERT INTO quotes (id, quote_number, client_id, start_date, end_date, origin, destination, event_type, itinerary, num_units, passenger_count, total_amount, status, valid_until, notes, created_at, updated_at) VALUES (38, 37, 109, '2026-01-25', '2026-01-25', 'GDL', 'Santa anita', 'Evento social', 'Domingo de la villa de Guadalupe por la mesa Colorada a Santa Anita', 1, 20, 4000, 'SENT', NULL, NULL, '2026-01-19', '2026-01-19');
INSERT INTO quotes (id, quote_number, client_id, start_date, end_date, origin, destination, event_type, itinerary, num_units, passenger_count, total_amount, status, valid_until, notes, created_at, updated_at) VALUES (39, 38, 97, '2026-02-20', '2026-02-22', 'GDL', 'CDMX', 'Turismo', 'Viernes 20 GDL - CDMX hotel (plaza Universidad) ahí dormir 
Sábado 21 Hotel - salón Gran Forum calle cerro del músico 22 campestre Churubusco Coyoacán - hotel 
( el evento en el salón es de 10 am a 7pm) estamos buscando hotel y aproximadamente no mayor a 45 minutos de distancia con tráfico.

Domingo 22 salida temprano después de desayuno, hotel CDMX - GDL', 1, 20, 28000, 'SENT', NULL, NULL, '2026-01-21', '2026-01-21');
INSERT INTO quotes (id, quote_number, client_id, start_date, end_date, origin, destination, event_type, itinerary, num_units, passenger_count, total_amount, status, valid_until, notes, created_at, updated_at) VALUES (40, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO quotes (id, quote_number, client_id, start_date, end_date, origin, destination, event_type, itinerary, num_units, passenger_count, total_amount, status, valid_until, notes, created_at, updated_at) VALUES (41, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO quotes (id, quote_number, client_id, start_date, end_date, origin, destination, event_type, itinerary, num_units, passenger_count, total_amount, status, valid_until, notes, created_at, updated_at) VALUES (42, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO quotes (id, quote_number, client_id, start_date, end_date, origin, destination, event_type, itinerary, num_units, passenger_count, total_amount, status, valid_until, notes, created_at, updated_at) VALUES (43, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO quotes (id, quote_number, client_id, start_date, end_date, origin, destination, event_type, itinerary, num_units, passenger_count, total_amount, status, valid_until, notes, created_at, updated_at) VALUES (44, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO quotes (id, quote_number, client_id, start_date, end_date, origin, destination, event_type, itinerary, num_units, passenger_count, total_amount, status, valid_until, notes, created_at, updated_at) VALUES (45, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO quotes (id, quote_number, client_id, start_date, end_date, origin, destination, event_type, itinerary, num_units, passenger_count, total_amount, status, valid_until, notes, created_at, updated_at) VALUES (46, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO quotes (id, quote_number, client_id, start_date, end_date, origin, destination, event_type, itinerary, num_units, passenger_count, total_amount, status, valid_until, notes, created_at, updated_at) VALUES (47, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO quotes (id, quote_number, client_id, start_date, end_date, origin, destination, event_type, itinerary, num_units, passenger_count, total_amount, status, valid_until, notes, created_at, updated_at) VALUES (48, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO quotes (id, quote_number, client_id, start_date, end_date, origin, destination, event_type, itinerary, num_units, passenger_count, total_amount, status, valid_until, notes, created_at, updated_at) VALUES (49, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
SELECT setval(pg_get_serial_sequence('quotes', 'id'), (SELECT MAX(id) FROM quotes));

-- Insert data into contracts
INSERT INTO contracts (id, contract_number, quote_id, client_id, start_date, end_date, origin, destination, itinerary, passenger_count, total_amount, status, created_at, updated_at) VALUES (1, '2691052301', 16, 63, '2026-03-20', '2026-03-21', 'GDL', 'Tapalpa', 'Seria a Talpa 
- Saliendo el viernes 20 de Marzo a las 2 am de GDL - torres amarillas 
- Regresamos el 21 marzo a GDL después de comer 
- 
- la camioneta que nos vaya esperando como la vez pasada 
- pasamos la noche en atenguillo 
- salimos a la tirada final a talpa  llegando alla por el medio dia', 40, 27000, 'Agendado', '2026-01-13', '2026-01-13');
INSERT INTO contracts (id, contract_number, quote_id, client_id, start_date, end_date, origin, destination, itinerary, passenger_count, total_amount, status, created_at, updated_at) VALUES (2, '266BC83601', 19, 108, '2026-02-06', '2026-02-09', 'GDL', 'Xochitepec', NULL, 7, 22600, 'Agendado', '2026-01-13', '2026-01-13');
INSERT INTO contracts (id, contract_number, quote_id, client_id, start_date, end_date, origin, destination, itinerary, passenger_count, total_amount, status, created_at, updated_at) VALUES (3, '255F211A12', 21, 3, '2026-02-06', '2026-02-08', 'GDL', 'Xochitepec', NULL, 14, 21000, 'Agendado', '2025-12-22', '2025-12-22');
INSERT INTO contracts (id, contract_number, quote_id, client_id, start_date, end_date, origin, destination, itinerary, passenger_count, total_amount, status, created_at, updated_at) VALUES (4, '2617219B01', NULL, 92, '2026-01-07', '2026-01-07', 'Molex', 'Jona', NULL, 20, 900, 'Realizado', '2026-01-07', '2026-01-07');
INSERT INTO contracts (id, contract_number, quote_id, client_id, start_date, end_date, origin, destination, itinerary, passenger_count, total_amount, status, created_at, updated_at) VALUES (5, '261755B101', NULL, 92, '2026-01-07', '2026-01-07', 'Molex', 'Alex', NULL, 20, 900, 'Realizado', '2026-01-07', '2026-01-07');
INSERT INTO contracts (id, contract_number, quote_id, client_id, start_date, end_date, origin, destination, itinerary, passenger_count, total_amount, status, created_at, updated_at) VALUES (6, '2617AE9D01', NULL, 92, '2026-01-13', '2026-01-13', 'Molex', 'Jona', NULL, 20, 900, 'Realizado', '2026-01-13', '2026-01-13');
INSERT INTO contracts (id, contract_number, quote_id, client_id, start_date, end_date, origin, destination, itinerary, passenger_count, total_amount, status, created_at, updated_at) VALUES (7, '2611BD0201', NULL, 105, '2026-01-12', '2026-01-12', 'GDL', 'Casa azul tepa', NULL, 20, 6500, 'Realizado', '2026-01-15', '2026-01-15');
INSERT INTO contracts (id, contract_number, quote_id, client_id, start_date, end_date, origin, destination, itinerary, passenger_count, total_amount, status, created_at, updated_at) VALUES (8, '2612870201', NULL, 105, '2026-01-14', '2026-01-14', 'GDL', 'Casa azul tepa', NULL, 20, 6500, 'Realizado', '2026-01-15', '2026-01-15');
INSERT INTO contracts (id, contract_number, quote_id, client_id, start_date, end_date, origin, destination, itinerary, passenger_count, total_amount, status, created_at, updated_at) VALUES (9, '2617D9B701', NULL, 92, '2026-01-15', '2026-01-15', 'Molex', 'Jona', NULL, 20, 900, 'Realizado', '2026-01-13', '2026-01-13');
INSERT INTO contracts (id, contract_number, quote_id, client_id, start_date, end_date, origin, destination, itinerary, passenger_count, total_amount, status, created_at, updated_at) VALUES (10, '261B353101', NULL, 49, '2025-12-30', '2025-12-03', 'GDL', 'Cosautlan de carvajal', 'Rosco ida y regreso', 20, 27000, 'Realizado', '2025-12-30', '2025-12-30');
INSERT INTO contracts (id, contract_number, quote_id, client_id, start_date, end_date, origin, destination, itinerary, passenger_count, total_amount, status, created_at, updated_at) VALUES (11, '261D018901', NULL, 49, '2025-12-27', '2025-12-29', 'GDL', 'Cosautlan de carvajal', 'Alex ida y regreso', 20, 25000, 'Realizado', '2025-12-30', '2025-12-30');
INSERT INTO contracts (id, contract_number, quote_id, client_id, start_date, end_date, origin, destination, itinerary, passenger_count, total_amount, status, created_at, updated_at) VALUES (12, '261E2F6C01', NULL, 49, '2026-01-03', '2026-01-03', 'GDL', 'Cosautlan de carvajal', 'Alex y carreon regreso', 20, 15000, 'Realizado', '2025-12-30', '2025-12-30');
INSERT INTO contracts (id, contract_number, quote_id, client_id, start_date, end_date, origin, destination, itinerary, passenger_count, total_amount, status, created_at, updated_at) VALUES (13, '2581C07712', NULL, 49, '2025-12-28', '2026-01-03', 'GDL', 'Papantla', 'Rosco ida y carreon y alex regreso', 14, 38000, 'Realizado', '2025-12-30', '2025-12-30');
INSERT INTO contracts (id, contract_number, quote_id, client_id, start_date, end_date, origin, destination, itinerary, passenger_count, total_amount, status, created_at, updated_at) VALUES (14, '2630514801', NULL, 25, '2026-01-10', '2026-01-11', 'GDL', 'Mazamitla', 'Mazamilta con movimientos', 20, 9500, 'Realizado', '2026-01-10', '2026-01-10');
INSERT INTO contracts (id, contract_number, quote_id, client_id, start_date, end_date, origin, destination, itinerary, passenger_count, total_amount, status, created_at, updated_at) VALUES (15, '26370E1B01', NULL, 49, '2026-01-13', '2026-01-13', 'GDL', 'Tala', NULL, 20, 2000, 'Realizado', '2026-01-12', '2026-01-12');
INSERT INTO contracts (id, contract_number, quote_id, client_id, start_date, end_date, origin, destination, itinerary, passenger_count, total_amount, status, created_at, updated_at) VALUES (16, '269DFBEB01', NULL, 49, '2026-01-11', '2026-01-11', 'GDL', 'san luis soyotlan', NULL, 20, 2800, 'Realizado', '2026-01-11', '2026-01-11');
INSERT INTO contracts (id, contract_number, quote_id, client_id, start_date, end_date, origin, destination, itinerary, passenger_count, total_amount, status, created_at, updated_at) VALUES (17, '269C48AF01', NULL, 49, '2026-01-03', '2026-01-03', 'GDL', 'Transit cosautlan a GDL', 'renta unidad ', 14, 4000, 'Realizado', '2026-01-03', '2026-01-03');
INSERT INTO contracts (id, contract_number, quote_id, client_id, start_date, end_date, origin, destination, itinerary, passenger_count, total_amount, status, created_at, updated_at) VALUES (18, '269497D901', NULL, 112, '2026-01-18', '2026-01-18', NULL, 'nevado colima', NULL, 14, 9500, 'Realizado', '2026-01-12', '2026-01-12');
INSERT INTO contracts (id, contract_number, quote_id, client_id, start_date, end_date, origin, destination, itinerary, passenger_count, total_amount, status, created_at, updated_at) VALUES (19, '265D48A001', NULL, 111, '2026-01-17', '2026-01-17', 'GDL', 'Tequila', NULL, 8, 3600, 'Realizado', '2026-01-17', '2026-01-17');
INSERT INTO contracts (id, contract_number, quote_id, client_id, start_date, end_date, origin, destination, itinerary, passenger_count, total_amount, status, created_at, updated_at) VALUES (20, '2673DEA301', NULL, 110, '2026-01-17', '2026-01-17', 'GDL', 'Tequila', NULL, 20, 5900, 'Realizado', '2026-01-17', '2026-01-17');
INSERT INTO contracts (id, contract_number, quote_id, client_id, start_date, end_date, origin, destination, itinerary, passenger_count, total_amount, status, created_at, updated_at) VALUES (21, '26A1FEA501', NULL, 84, '2026-01-24', '2026-01-24', 'GDL', 'Bellaterra', 'Julia y Diego 
6 unidades 20 pasajeros Bellaterra 
30 mil
hotel (jw marrior y city express) - josemaria escriva - bellaterra - hotel
llegar al hotel a las 4:00 pm', 60, 15000, 'Agendado', '2026-01-01', '2026-01-01');
INSERT INTO contracts (id, contract_number, quote_id, client_id, start_date, end_date, origin, destination, itinerary, passenger_count, total_amount, status, created_at, updated_at) VALUES (22, '26A2D69101', NULL, 84, '2026-01-24', '2026-01-24', 'GDL', 'Bellaterra', 'Julia y Diego 
6 unidades 20 pasajeros Bellaterra 
30 mil
hotel (jw marrior y city express) - josemaria escriva - bellaterra - hotel
llegar al hotel a las 4:00 pm', 60, 15000, 'Agendado', '2026-01-01', '2026-01-01');
INSERT INTO contracts (id, contract_number, quote_id, client_id, start_date, end_date, origin, destination, itinerary, passenger_count, total_amount, status, created_at, updated_at) VALUES (23, '26BB0FE501', NULL, 84, '2026-01-24', '2026-01-24', 'GDL', 'Bellaterra Suburban', 'Julia y Diego 
3 Suburban de 10 am a 3 am del 25 enero
33750 y se cobro 38 mil 100 
lugar: jw marriott
porfis que me avisen cuando ya esten ahi porfa y que me pasen el contacto de los 3 choferes please
10:00 am 
regresos apartir de las 12:00 cada hora porfa', 21, 38000, 'Agendado', '2026-01-01', '2026-01-01');
INSERT INTO contracts (id, contract_number, quote_id, client_id, start_date, end_date, origin, destination, itinerary, passenger_count, total_amount, status, created_at, updated_at) VALUES (24, '262088A601', NULL, 75, '2026-01-19', '2026-01-19', 'GDL', 'Local', '1) Rose-John, Gillian – Vuelo American Airlines 3267 – Aeropuerto a Hilton Midtown 3:25 pm. ', 7, NULL, 'Realizado', '2026-01-18', '2026-01-18');
INSERT INTO contracts (id, contract_number, quote_id, client_id, start_date, end_date, origin, destination, itinerary, passenger_count, total_amount, status, created_at, updated_at) VALUES (25, '2679C48E01', NULL, 75, '2026-01-19', '2026-01-19', 'GDL', 'Local', '2) Jennifer Landgren y Nate Lonski – Vuelo Volaris 1761 – Aeropuerto a Hilton Midtown 4:25 pm.', 7, NULL, 'Realizado', '2026-01-18', '2026-01-18');
INSERT INTO contracts (id, contract_number, quote_id, client_id, start_date, end_date, origin, destination, itinerary, passenger_count, total_amount, status, created_at, updated_at) VALUES (26, '262278D501', NULL, 75, '2026-01-20', '2026-01-20', 'GDL', 'Local', 'Midtown a Arrow - Arrow a Midtown - Midtown – Tlaquepaque Parían – Arena Coliseo – Midtown', 7, NULL, 'Realizado', '2026-01-19', '2026-01-19');
INSERT INTO contracts (id, contract_number, quote_id, client_id, start_date, end_date, origin, destination, itinerary, passenger_count, total_amount, status, created_at, updated_at) VALUES (27, '262452D001', NULL, 75, '2026-01-21', '2026-01-21', 'GDL', 'Local', '1) Jennifer Landgren y Nate Lonski – Midtown a Aeropuerto 5:00 am. 2) Rose-John Gillian – Midtown a Arrow 8:00 am. 3) Rose-John Gillian – Arrow a Midtown 3:00 pm.', 7, NULL, 'Realizado', '2026-01-20', '2026-01-20');
INSERT INTO contracts (id, contract_number, quote_id, client_id, start_date, end_date, origin, destination, itinerary, passenger_count, total_amount, status, created_at, updated_at) VALUES (28, '2625489D01', NULL, 75, '2026-01-22', '2026-01-22', 'GDL', 'Local', 'Traslado Rose-John Gillian de Midtown a Aeropuerto', 7, NULL, 'Agendado', '2026-01-21', '2026-01-21');
INSERT INTO contracts (id, contract_number, quote_id, client_id, start_date, end_date, origin, destination, itinerary, passenger_count, total_amount, status, created_at, updated_at) VALUES (29, '2656084801', NULL, 115, '2026-03-14', '2026-03-15', 'GDL', 'Local', 'Evento social en terraza jardín. Traslado de 14 personas. Servicio nocturno', 14, NULL, 'Agendado', '2026-01-23', '2026-01-23');
INSERT INTO contracts (id, contract_number, quote_id, client_id, start_date, end_date, origin, destination, itinerary, passenger_count, total_amount, status, created_at, updated_at) VALUES (30, '26DAB0F601', NULL, 83, '2026-03-07', '2026-03-08', 'GDL', 'Local', 'Evento social Inicia en templo San Juan Macias y llevar a invitados a Grandala (Dirección: Av. Ramón Corona, Av. Cucba 437, 45220 Zapopan, Jal.) 

y en los horarios de 1:30 am a 3:00 am que este a disposición para llevar a invitados o niños a su hotel que seguro es por la zona de Andares)', 20, 5800, 'Agendado', '2026-01-28', '2026-01-28');
SELECT setval(pg_get_serial_sequence('contracts', 'id'), (SELECT MAX(id) FROM contracts));

-- Insert data into payment_accounts
INSERT INTO payment_accounts (id, account_code, account_name, account_type, bank_name, business_unit, status, notes, created_at, updated_at) VALUES (1, 'BBVA', 'BBVA Empresarial Debito', 'Debito', 'BBVA Bancomer', 'GENERAL', 'ACTIVE', 'Cuenta principal', '2026-08-17', '2026-08-17');
INSERT INTO payment_accounts (id, account_code, account_name, account_type, bank_name, business_unit, status, notes, created_at, updated_at) VALUES (2, 'BBVA-001', 'BBVA Empresarial - IMSS', 'Debito', 'BBVA Bancomer', 'IMSS', 'ACTIVE', 'Apartado IMSS', '2026-08-17', '2026-08-17');
INSERT INTO payment_accounts (id, account_code, account_name, account_type, bank_name, business_unit, status, notes, created_at, updated_at) VALUES (3, 'BBVA-002', 'BBVA Empresarial - Transit 2018', 'Debito', 'BBVA Bancomer', 'TRANSIT_2018', 'ACTIVE', 'Apartado Transit 2018', '2026-08-17', '2026-08-17');
INSERT INTO payment_accounts (id, account_code, account_name, account_type, bank_name, business_unit, status, notes, created_at, updated_at) VALUES (4, 'BBVA-003', 'BBVA Empresarial - Sprinter 2026', 'Debito', 'BBVA Bancomer', 'SPRINTER_2026', 'ACTIVE', 'Apartado Sprinter 2026', '2026-08-17', '2026-08-17');
INSERT INTO payment_accounts (id, account_code, account_name, account_type, bank_name, business_unit, status, notes, created_at, updated_at) VALUES (5, 'BBVA-004', 'BBVA Empresarial - Crafter 2024', 'Debito', 'BBVA Bancomer', 'CRAFTER 2024', 'ACTIVE', 'Apartado Crafter 2024', '2026-08-17', '2026-08-17');
INSERT INTO payment_accounts (id, account_code, account_name, account_type, bank_name, business_unit, status, notes, created_at, updated_at) VALUES (6, 'BBVA-005', 'BBVA Empresarial - Crafter 2025', 'Debito', 'BBVA Bancomer', 'CRAFTER 2025', 'ACTIVE', 'Apartado Crafter 2025', '2026-08-17', '2026-08-17');
INSERT INTO payment_accounts (id, account_code, account_name, account_type, bank_name, business_unit, status, notes, created_at, updated_at) VALUES (7, 'BBVA-006', 'BBVA Empresarial - Starex 2019', 'Debito', 'BBVA Bancomer', 'STAREX 2019', 'ACTIVE', 'Apartado Crafter 2026', '2026-08-17', '2026-08-17');
INSERT INTO payment_accounts (id, account_code, account_name, account_type, bank_name, business_unit, status, notes, created_at, updated_at) VALUES (8, 'CASH', 'Efectivo General', 'Efectivo', 'Efectivo', 'GENERAL', 'ACTIVE', 'Cuenta principal', '2026-08-17', '2026-08-17');
INSERT INTO payment_accounts (id, account_code, account_name, account_type, bank_name, business_unit, status, notes, created_at, updated_at) VALUES (9, 'CASH-001', 'Efectivo - IMSS', 'Efectivo', 'Efectivo', 'IMSS', 'ACTIVE', 'Apartado IMSS', '2026-08-17', '2026-08-17');
INSERT INTO payment_accounts (id, account_code, account_name, account_type, bank_name, business_unit, status, notes, created_at, updated_at) VALUES (10, 'CASH-002', 'Efectivo - Transit 2018', 'Efectivo', 'Efectivo', 'TRANSIT_2018', 'ACTIVE', 'Apartado Transit 2018', '2026-08-17', '2026-08-17');
INSERT INTO payment_accounts (id, account_code, account_name, account_type, bank_name, business_unit, status, notes, created_at, updated_at) VALUES (11, 'CASH-003', 'Efectivo - Sprinter 2026', 'Efectivo', 'Efectivo', 'SPRINTER_2026', 'ACTIVE', 'Apartado Sprinter 2026', '2026-08-17', '2026-08-17');
INSERT INTO payment_accounts (id, account_code, account_name, account_type, bank_name, business_unit, status, notes, created_at, updated_at) VALUES (12, 'CASH-004', 'Efectivo - Crafter 2024', 'Efectivo', 'Efectivo', 'CRAFTER 2024', 'ACTIVE', 'Apartado Crafter 2024', '2026-08-17', '2026-08-17');
INSERT INTO payment_accounts (id, account_code, account_name, account_type, bank_name, business_unit, status, notes, created_at, updated_at) VALUES (13, 'CASH-005', 'Efectivo - Crafter 2025', 'Efectivo', 'Efectivo', 'CRAFTER 2025', 'ACTIVE', 'Apartado Crafter 2025', '2026-08-17', '2026-08-17');
INSERT INTO payment_accounts (id, account_code, account_name, account_type, bank_name, business_unit, status, notes, created_at, updated_at) VALUES (14, 'CASH-006', 'Efectivo - Starex 2019', 'Efectivo', 'Efectivo', 'STAREX 2019', 'ACTIVE', 'Apartado Crafter 2026', '2026-08-17', '2026-08-17');
INSERT INTO payment_accounts (id, account_code, account_name, account_type, bank_name, business_unit, status, notes, created_at, updated_at) VALUES (15, 'BANORTE', 'BANORTE Empresarial Debito', 'Debito', 'BANORTE', 'GENERAL', 'ACTIVE', 'Cuenta principal', '2026-08-17', '2026-08-17');
INSERT INTO payment_accounts (id, account_code, account_name, account_type, bank_name, business_unit, status, notes, created_at, updated_at) VALUES (16, 'BANORTE-001', 'BANORTE Empresarial - IMSS', 'Debito', 'BANORTE', 'IMSS', 'ACTIVE', 'Apartado IMSS', '2026-08-17', '2026-08-17');
INSERT INTO payment_accounts (id, account_code, account_name, account_type, bank_name, business_unit, status, notes, created_at, updated_at) VALUES (17, 'BANORTE-002', 'BANORTE Empresarial - Transit 2018', 'Debito', 'BANORTE', 'TRANSIT_2018', 'ACTIVE', 'Apartado Transit 2018', '2026-08-17', '2026-08-17');
INSERT INTO payment_accounts (id, account_code, account_name, account_type, bank_name, business_unit, status, notes, created_at, updated_at) VALUES (18, 'BANORTE-003', 'BANORTE Empresarial - Sprinter 2026', 'Debito', 'BANORTE', 'SPRINTER_2026', 'ACTIVE', 'Apartado Sprinter 2026', '2026-08-17', '2026-08-17');
INSERT INTO payment_accounts (id, account_code, account_name, account_type, bank_name, business_unit, status, notes, created_at, updated_at) VALUES (19, 'BANORTE-004', 'BANORTE Empresarial - Crafter 2024', 'Debito', 'BANORTE', 'CRAFTER 2024', 'ACTIVE', 'Apartado Crafter 2024', '2026-08-17', '2026-08-17');
INSERT INTO payment_accounts (id, account_code, account_name, account_type, bank_name, business_unit, status, notes, created_at, updated_at) VALUES (20, 'BANORTE-005', 'BANORTE Empresarial - Crafter 2025', 'Debito', 'BANORTE', 'CRAFTER 2025', 'ACTIVE', 'Apartado Crafter 2025', '2026-08-17', '2026-08-17');
INSERT INTO payment_accounts (id, account_code, account_name, account_type, bank_name, business_unit, status, notes, created_at, updated_at) VALUES (21, 'BANORTE-006', 'BANORTE Empresarial - Starex 2019', 'Debito', 'BANORTE', 'STAREX 2019', 'ACTIVE', 'Apartado Crafter 2026', '2026-08-17', '2026-08-17');
INSERT INTO payment_accounts (id, account_code, account_name, account_type, bank_name, business_unit, status, notes, created_at, updated_at) VALUES (22, 'CLARA', 'Clara General', 'Credito', 'STP', 'GENERAL', 'ACTIVE', 'Cuenta principal', '2026-08-17', '2026-08-17');
INSERT INTO payment_accounts (id, account_code, account_name, account_type, bank_name, business_unit, status, notes, created_at, updated_at) VALUES (23, 'CLARA-001', 'Clara - IMSS', 'Credito', 'STP', 'IMSS', 'ACTIVE', 'Apartado IMSS', '2026-08-17', '2026-08-17');
INSERT INTO payment_accounts (id, account_code, account_name, account_type, bank_name, business_unit, status, notes, created_at, updated_at) VALUES (24, 'CLARA-002', 'Clara - Transit 2018', 'Credito', 'STP', 'TRANSIT_2018', 'ACTIVE', 'Apartado Transit 2018', '2026-08-17', '2026-08-17');
INSERT INTO payment_accounts (id, account_code, account_name, account_type, bank_name, business_unit, status, notes, created_at, updated_at) VALUES (25, 'CLARA-003', 'Clara - Sprinter 2026', 'Credito', 'STP', 'SPRINTER_2026', 'ACTIVE', 'Apartado Sprinter 2026', '2026-08-17', '2026-08-17');
INSERT INTO payment_accounts (id, account_code, account_name, account_type, bank_name, business_unit, status, notes, created_at, updated_at) VALUES (26, 'CLARA-004', 'Clara - Crafter 2024', 'Credito', 'STP', 'CRAFTER 2024', 'ACTIVE', 'Apartado Crafter 2024', '2026-08-17', '2026-08-17');
INSERT INTO payment_accounts (id, account_code, account_name, account_type, bank_name, business_unit, status, notes, created_at, updated_at) VALUES (27, 'CLARA-005', 'Clara - Crafter 2025', 'Credito', 'STP', 'CRAFTER 2025', 'ACTIVE', 'Apartado Crafter 2025', '2026-08-17', '2026-08-17');
INSERT INTO payment_accounts (id, account_code, account_name, account_type, bank_name, business_unit, status, notes, created_at, updated_at) VALUES (28, 'CLARA-006', 'Clara - Starex 2019', 'Credito', 'STP', 'STAREX 2019', 'ACTIVE', 'Apartado Crafter 2026', '2026-08-17', '2026-08-17');
INSERT INTO payment_accounts (id, account_code, account_name, account_type, bank_name, business_unit, status, notes, created_at, updated_at) VALUES (29, 'BBVA Alan', 'BBVA Alan Empresarial Debito', 'Debito', 'BBVA Bancomer', 'GENERAL', 'ACTIVE', 'Cuenta principal', '2026-08-17', '2026-08-17');
INSERT INTO payment_accounts (id, account_code, account_name, account_type, bank_name, business_unit, status, notes, created_at, updated_at) VALUES (30, 'BBVA Alan-001', 'BBVA Alan Empresarial - IMSS', 'Debito', 'BBVA Bancomer', 'IMSS', 'ACTIVE', 'Apartado IMSS', '2026-08-17', '2026-08-17');
INSERT INTO payment_accounts (id, account_code, account_name, account_type, bank_name, business_unit, status, notes, created_at, updated_at) VALUES (31, 'BBVA Alan-002', 'BBVA Alan Empresarial - Transit 2018', 'Debito', 'BBVA Bancomer', 'TRANSIT_2018', 'ACTIVE', 'Apartado Transit 2018', '2026-08-17', '2026-08-17');
INSERT INTO payment_accounts (id, account_code, account_name, account_type, bank_name, business_unit, status, notes, created_at, updated_at) VALUES (32, 'BBVA Alan-003', 'BBVA Alan Empresarial - Sprinter 2026', 'Debito', 'BBVA Bancomer', 'SPRINTER_2026', 'ACTIVE', 'Apartado Sprinter 2026', '2026-08-17', '2026-08-17');
INSERT INTO payment_accounts (id, account_code, account_name, account_type, bank_name, business_unit, status, notes, created_at, updated_at) VALUES (33, 'BBVA Alan-004', 'BBVA Alan Empresarial - Crafter 2024', 'Debito', 'BBVA Bancomer', 'CRAFTER 2024', 'ACTIVE', 'Apartado Crafter 2024', '2026-08-17', '2026-08-17');
INSERT INTO payment_accounts (id, account_code, account_name, account_type, bank_name, business_unit, status, notes, created_at, updated_at) VALUES (34, 'BBVA Alan-005', 'BBVA Alan Empresarial - Crafter 2025', 'Debito', 'BBVA Bancomer', 'CRAFTER 2025', 'ACTIVE', 'Apartado Crafter 2025', '2026-08-17', '2026-08-17');
INSERT INTO payment_accounts (id, account_code, account_name, account_type, bank_name, business_unit, status, notes, created_at, updated_at) VALUES (35, 'BBVA Alan-006', 'BBVA Alan Empresarial - Starex 2019', 'Debito', 'BBVA Bancomer', 'STAREX 2019', 'ACTIVE', 'Apartado Crafter 2026', '2026-08-17', '2026-08-17');
INSERT INTO payment_accounts (id, account_code, account_name, account_type, bank_name, business_unit, status, notes, created_at, updated_at) VALUES (36, 'BBVA Carreon', 'BBVA Carreon Empresarial Debito', 'Debito', 'BBVA Bancomer', 'GENERAL', 'ACTIVE', 'Cuenta principal', '2026-08-17', '2026-08-17');
INSERT INTO payment_accounts (id, account_code, account_name, account_type, bank_name, business_unit, status, notes, created_at, updated_at) VALUES (37, 'BBVA Carreon-001', 'BBVA Carreon Empresarial - IMSS', 'Debito', 'BBVA Bancomer', 'IMSS', 'ACTIVE', 'Apartado IMSS', '2026-08-17', '2026-08-17');
INSERT INTO payment_accounts (id, account_code, account_name, account_type, bank_name, business_unit, status, notes, created_at, updated_at) VALUES (38, 'BBVA Carreon-002', 'BBVA Carreon Empresarial - Transit 2018', 'Debito', 'BBVA Bancomer', 'TRANSIT_2018', 'ACTIVE', 'Apartado Transit 2018', '2026-08-17', '2026-08-17');
INSERT INTO payment_accounts (id, account_code, account_name, account_type, bank_name, business_unit, status, notes, created_at, updated_at) VALUES (39, 'BBVA Carreon-003', 'BBVA Carreon Empresarial - Sprinter 2026', 'Debito', 'BBVA Bancomer', 'SPRINTER_2026', 'ACTIVE', 'Apartado Sprinter 2026', '2026-08-17', '2026-08-17');
INSERT INTO payment_accounts (id, account_code, account_name, account_type, bank_name, business_unit, status, notes, created_at, updated_at) VALUES (40, 'BBVA Carreon-004', 'BBVA Carreon Empresarial - Crafter 2024', 'Debito', 'BBVA Bancomer', 'CRAFTER 2024', 'ACTIVE', 'Apartado Crafter 2024', '2026-08-17', '2026-08-17');
INSERT INTO payment_accounts (id, account_code, account_name, account_type, bank_name, business_unit, status, notes, created_at, updated_at) VALUES (41, 'BBVA Carreon-005', 'BBVA Carreon Empresarial - Crafter 2025', 'Debito', 'BBVA Bancomer', 'CRAFTER 2025', 'ACTIVE', 'Apartado Crafter 2025', '2026-08-17', '2026-08-17');
INSERT INTO payment_accounts (id, account_code, account_name, account_type, bank_name, business_unit, status, notes, created_at, updated_at) VALUES (42, 'BBVA Carreon-006', 'BBVA Carreon Empresarial - Starex 2019', 'Debito', 'BBVA Bancomer', 'STAREX 2019', 'ACTIVE', 'Apartado Crafter 2026', '2026-08-17', '2026-08-17');
SELECT setval(pg_get_serial_sequence('payment_accounts', 'id'), (SELECT MAX(id) FROM payment_accounts));

-- Insert data into payments
INSERT INTO payments (id, contract_id, contract_number, payment_type, amount, payment_method, payment_account_id, payment_date, invoice_number, iva_amount, notes, created_at, updated_at) VALUES (1, 1, '26A3DE9A01', 'ADVANCE', 3000, 'TRANSFERENCIA', 1, '2026-01-13', NULL, NULL, NULL, '2026-01-13', '2026-01-13');
INSERT INTO payments (id, contract_id, contract_number, payment_type, amount, payment_method, payment_account_id, payment_date, invoice_number, iva_amount, notes, created_at, updated_at) VALUES (2, 2, '266BC83601', 'ADVANCE', 5000, 'TRANSFERENCIA', 1, '2026-01-06', NULL, NULL, NULL, '2026-01-06', '2026-01-06');
INSERT INTO payments (id, contract_id, contract_number, payment_type, amount, payment_method, payment_account_id, payment_date, invoice_number, iva_amount, notes, created_at, updated_at) VALUES (3, 3, '255F211A12', 'ADVANCE', 1000, 'TRANSFERENCIA', 1, '2025-12-22', NULL, NULL, NULL, '2025-12-22', '2025-12-22');
INSERT INTO payments (id, contract_id, contract_number, payment_type, amount, payment_method, payment_account_id, payment_date, invoice_number, iva_amount, notes, created_at, updated_at) VALUES (4, 13, '2581C07712', 'PARTIAL', 19000, 'EFECTIVO', 8, '2025-12-28', NULL, NULL, NULL, '2025-12-28', '2025-12-28');
INSERT INTO payments (id, contract_id, contract_number, payment_type, amount, payment_method, payment_account_id, payment_date, invoice_number, iva_amount, notes, created_at, updated_at) VALUES (5, 13, '2581C07712', 'PARTIAL', 19000, 'EFECTIVO', 8, '2026-01-04', NULL, NULL, NULL, '2026-01-04', '2026-01-04');
INSERT INTO payments (id, contract_id, contract_number, payment_type, amount, payment_method, payment_account_id, payment_date, invoice_number, iva_amount, notes, created_at, updated_at) VALUES (6, 14, '2630514801', 'FINAL', 9500, 'TRANSFERENCIA', 6, '2026-01-09', 'A2069', 1520, NULL, '2026-01-09', '2026-01-09');
INSERT INTO payments (id, contract_id, contract_number, payment_type, amount, payment_method, payment_account_id, payment_date, invoice_number, iva_amount, notes, created_at, updated_at) VALUES (7, 18, '269497D901', 'PARTIAL', 1000, 'TRANSFERENCIA', 38, '2026-01-18', NULL, NULL, NULL, '2026-01-18', '2026-01-18');
INSERT INTO payments (id, contract_id, contract_number, payment_type, amount, payment_method, payment_account_id, payment_date, invoice_number, iva_amount, notes, created_at, updated_at) VALUES (8, 18, '269497D901', 'PARTIAL', 6800, 'TRANSFERENCIA', 38, '2026-01-18', NULL, NULL, NULL, '2026-01-18', '2026-01-18');
INSERT INTO payments (id, contract_id, contract_number, payment_type, amount, payment_method, payment_account_id, payment_date, invoice_number, iva_amount, notes, created_at, updated_at) VALUES (9, 18, '269497D901', 'PARTIAL', 1700, 'EFECTIVO', 10, '2026-01-18', NULL, NULL, NULL, '2026-01-18', '2026-01-18');
INSERT INTO payments (id, contract_id, contract_number, payment_type, amount, payment_method, payment_account_id, payment_date, invoice_number, iva_amount, notes, created_at, updated_at) VALUES (10, 19, '265D48A001', 'PARTIAL', 400, 'TRANSFERENCIA', 31, '2026-01-17', NULL, NULL, NULL, '2026-01-17', '2026-01-17');
INSERT INTO payments (id, contract_id, contract_number, payment_type, amount, payment_method, payment_account_id, payment_date, invoice_number, iva_amount, notes, created_at, updated_at) VALUES (11, 19, '265D48A001', 'PARTIAL', 3700, 'EFECTIVO', 10, '2026-01-17', NULL, NULL, NULL, '2026-01-17', '2026-01-17');
SELECT setval(pg_get_serial_sequence('payments', 'id'), (SELECT MAX(id) FROM payments));

-- Insert data into expenses
INSERT INTO expenses (id, contract_id, expense_type, amount, payment_account_id, business_unit, expense_date, notes, created_at, updated_at) VALUES (1, 9, 'Combustible', 900, 34, NULL, '2026-01-15', 'mazamilta', '2026-01-15', '2026-01-15');
INSERT INTO expenses (id, contract_id, expense_type, amount, payment_account_id, business_unit, expense_date, notes, created_at, updated_at) VALUES (2, 15, 'Combustible', 400, 34, NULL, '2026-01-15', 'tala', '2026-01-15', '2026-01-15');
INSERT INTO expenses (id, contract_id, expense_type, amount, payment_account_id, business_unit, expense_date, notes, created_at, updated_at) VALUES (3, 6, 'Combustible', 200, 34, NULL, '2026-01-15', 'molex martes', '2026-01-15', '2026-01-15');
INSERT INTO expenses (id, contract_id, expense_type, amount, payment_account_id, business_unit, expense_date, notes, created_at, updated_at) VALUES (4, 19, 'Combustible', 1592, 10, NULL, '2026-01-17', 'Tequila Ana turismo', '2026-01-17', '2026-01-17');
SELECT setval(pg_get_serial_sequence('expenses', 'id'), (SELECT MAX(id) FROM expenses));

-- Insert data into drivers
INSERT INTO drivers (id, name, license_number, documents, phone, email, status, created_at, updated_at) VALUES (1, 'Christian Carreon Cisneros', NULL, 'https://drive.google.com/drive/folders/1FmJKpjVUdIqbEFL77-BJ-g2D74qlyXaz?usp=drive_link', '+52 1 33 2255 3662', NULL, 'Active', '2018-08-17', '2018-08-17');
INSERT INTO drivers (id, name, license_number, documents, phone, email, status, created_at, updated_at) VALUES (2, 'Alexandro Zazueta', NULL, 'https://drive.google.com/drive/folders/1vL3WZxujDOskexja-2x4XPADIhEszhGP?usp=drive_link', '+52 1 33 2361 4626', NULL, 'Active', '2018-08-17', '2018-08-17');
INSERT INTO drivers (id, name, license_number, documents, phone, email, status, created_at, updated_at) VALUES (3, 'Jonathan Ventura', NULL, 'https://drive.google.com/drive/folders/1vam1qkw2Iw91NHOmC4o1CGotYs2-s6G5?usp=drive_link', '+52 1 33 3971 9649', NULL, 'Active', '2018-08-17', '2018-08-17');
INSERT INTO drivers (id, name, license_number, documents, phone, email, status, created_at, updated_at) VALUES (4, 'Juan Ignacio', NULL, 'https://drive.google.com/drive/folders/1PjJIkSj4mcq2cl3Xy5YmhxrB3sJSd_XI?usp=drive_link', '+52 1 33 3781 8245', NULL, 'Active', '2018-08-17', '2018-08-17');
SELECT setval(pg_get_serial_sequence('drivers', 'id'), (SELECT MAX(id) FROM drivers));

-- Insert data into vehicles
INSERT INTO vehicles (id, vehicle_code, brand, model, year, vehicle_type, license_plate, vin_number, motor, acquisition_date, acquisition_cost, sale_date, sale_price, insurance_policy, insurance_company, insurance_expiry, passenger_capacity, fuel_type, drivedocs, status, notes, created_at, updated_at) VALUES (1, 'TRANSIT-2018', 'Ford', 'Transit', 2018, 'Van', '30-RC-2X', 'WF0SS4KT8JTB88316', NULL, '2022-09-07', 595000, NULL, NULL, 971436673, 'Qualitas', '2026-09-11', 14, 'Diesel', 'https://drive.google.com/drive/folders/1-Em1DKip2EOHiATqQ7Z6zO9me5QgJJsq?usp=drive_link', 'ACTIVE', NULL, '2022-09-07', '2025-09-11');
INSERT INTO vehicles (id, vehicle_code, brand, model, year, vehicle_type, license_plate, vin_number, motor, acquisition_date, acquisition_cost, sale_date, sale_price, insurance_policy, insurance_company, insurance_expiry, passenger_capacity, fuel_type, drivedocs, status, notes, created_at, updated_at) VALUES (2, 'SPRINTER-2026', 'Mercedes-Benz', 'Sprinter', 2025, 'Van', '28-RE-2Y', 'W1Y5KD3Z3SP749818', '65492082206777', '2026-01-05', 1850000, NULL, NULL, 971481950, 'Qualitas', '2026-12-21', 20, 'Diesel', NULL, 'ACTIVE', NULL, '2026-01-10', '2026-01-10');
INSERT INTO vehicles (id, vehicle_code, brand, model, year, vehicle_type, license_plate, vin_number, motor, acquisition_date, acquisition_cost, sale_date, sale_price, insurance_policy, insurance_company, insurance_expiry, passenger_capacity, fuel_type, drivedocs, status, notes, created_at, updated_at) VALUES (3, 'CRAFTER-2024', 'Volkswagen', 'Crafter', 2024, 'Van', '35-RD-7Z', 'WV1GRNSY0R9006223', 'DAW0033780', '2023-10-27', 1478800, NULL, NULL, 971181232, 'Qualitas', '2026-10-13', 20, 'Diesel', 'https://drive.google.com/drive/folders/1cGI6taa-0jSmCafm6PX93yK-kcx8sZ_7?usp=drive_link', 'ACTIVE', NULL, '2024-04-05', '2024-04-05');
INSERT INTO vehicles (id, vehicle_code, brand, model, year, vehicle_type, license_plate, vin_number, motor, acquisition_date, acquisition_cost, sale_date, sale_price, insurance_policy, insurance_company, insurance_expiry, passenger_capacity, fuel_type, drivedocs, status, notes, created_at, updated_at) VALUES (4, 'CRAFTER-2025', 'Volkswagen', 'Crafter', 2025, 'Van', '86-RE-8L', 'WV1GRNSY1R9043958', 'DAW-034637', '2026-08-12', 1553000, NULL, NULL, 4923587, 'Ana Seguros', '2026-08-12', 20, 'Diesel', 'https://drive.google.com/drive/folders/1LvJ81fn2ZFwMmM2RDmWcMeBJbV2HGogX?usp=drive_link', 'ACTIVE', NULL, '2025-01-20', '2025-01-20');
INSERT INTO vehicles (id, vehicle_code, brand, model, year, vehicle_type, license_plate, vin_number, motor, acquisition_date, acquisition_cost, sale_date, sale_price, insurance_policy, insurance_company, insurance_expiry, passenger_capacity, fuel_type, drivedocs, status, notes, created_at, updated_at) VALUES (5, 'STAREX-2019', 'Hyundai', 'Starex', 2019, 'Van', '98-RE-7E', 'KMFWB3WR9KU018203', 'G4KGJD043081', '2024-02-11', 250000, NULL, NULL, 971352947, 'Qualitas', '2026-02-09', 10, 'Gasolina', 'https://drive.google.com/drive/folders/1v505rOwiMzLqlTwfPp_F5RLEgOsk4zht?usp=drive_link', 'ACTIVE', NULL, '2019-07-10', '2019-07-10');
INSERT INTO vehicles (id, vehicle_code, brand, model, year, vehicle_type, license_plate, vin_number, motor, acquisition_date, acquisition_cost, sale_date, sale_price, insurance_policy, insurance_company, insurance_expiry, passenger_capacity, fuel_type, drivedocs, status, notes, created_at, updated_at) VALUES (6, 'HIACE-2018', 'Toyota', 'Hiace', 2018, 'Van', '-', 'JTGSX23P0J6184435', '22TR 9137748', '2019-08-14', 480000, '2024-07-19', 470000, 971323870, 'Qualitas', '2025-11-23', 14, 'Gasolina', NULL, 'ACTIVE', NULL, '2020-05-15', '2025-01-13');
SELECT setval(pg_get_serial_sequence('vehicles', 'id'), (SELECT MAX(id) FROM vehicles));

-- Insert data into assignments
INSERT INTO assignments (id, contract_id, driver_id, vehicle_id, assigned_date, driving_date, external_company_id, notes, created_at, updated_at) VALUES (1, 4, 3, 4, '2026-01-07 00:00:00', '2026-01-07 00:00:00', NULL, NULL, '2026-01-07', '2026-01-07');
INSERT INTO assignments (id, contract_id, driver_id, vehicle_id, assigned_date, driving_date, external_company_id, notes, created_at, updated_at) VALUES (2, 5, 2, 4, '2026-01-07 00:00:00', '2026-01-07 00:00:00', NULL, NULL, '2026-01-07', '2026-01-07');
INSERT INTO assignments (id, contract_id, driver_id, vehicle_id, assigned_date, driving_date, external_company_id, notes, created_at, updated_at) VALUES (3, 6, 3, 4, '2026-01-13 00:00:00', '2026-01-13 00:00:00', NULL, NULL, '2026-01-07', '2026-01-07');
INSERT INTO assignments (id, contract_id, driver_id, vehicle_id, assigned_date, driving_date, external_company_id, notes, created_at, updated_at) VALUES (4, 7, 1, 2, '2026-01-12 00:00:00', '2026-01-12 00:00:00', NULL, NULL, '2026-01-12', '2026-01-12');
INSERT INTO assignments (id, contract_id, driver_id, vehicle_id, assigned_date, driving_date, external_company_id, notes, created_at, updated_at) VALUES (5, 8, 1, 2, '2026-01-12 00:00:00', '2026-01-14 00:00:00', NULL, NULL, '2026-01-12', '2026-01-12');
INSERT INTO assignments (id, contract_id, driver_id, vehicle_id, assigned_date, driving_date, external_company_id, notes, created_at, updated_at) VALUES (6, 9, 3, 4, '2026-01-15 00:00:00', '2026-01-15 00:00:00', NULL, NULL, '2026-01-15', '2026-01-15');
INSERT INTO assignments (id, contract_id, driver_id, vehicle_id, assigned_date, driving_date, external_company_id, notes, created_at, updated_at) VALUES (7, 10, 4, 3, '2025-12-30 00:00:00', '2025-12-30 00:00:00', NULL, NULL, '2025-12-30', '2025-12-30');
INSERT INTO assignments (id, contract_id, driver_id, vehicle_id, assigned_date, driving_date, external_company_id, notes, created_at, updated_at) VALUES (8, 10, 4, 3, '2025-12-30 00:00:00', '2026-01-03 00:00:00', NULL, NULL, '2025-12-30', '2025-12-30');
INSERT INTO assignments (id, contract_id, driver_id, vehicle_id, assigned_date, driving_date, external_company_id, notes, created_at, updated_at) VALUES (9, 11, 2, 3, '2025-12-27 00:00:00', '2025-12-29 00:00:00', NULL, NULL, '2025-12-27', '2025-12-27');
INSERT INTO assignments (id, contract_id, driver_id, vehicle_id, assigned_date, driving_date, external_company_id, notes, created_at, updated_at) VALUES (10, 11, 2, 3, '2025-12-27 00:00:00', '2025-12-29 00:00:00', NULL, NULL, '2025-12-27', '2025-12-27');
INSERT INTO assignments (id, contract_id, driver_id, vehicle_id, assigned_date, driving_date, external_company_id, notes, created_at, updated_at) VALUES (11, 12, 1, 4, '2026-01-03 00:00:00', '2026-01-03 00:00:00', NULL, NULL, '2026-01-03', '2026-01-03');
INSERT INTO assignments (id, contract_id, driver_id, vehicle_id, assigned_date, driving_date, external_company_id, notes, created_at, updated_at) VALUES (12, 12, 2, 4, '2026-01-03 00:00:00', '2026-01-03 00:00:00', NULL, NULL, '2026-01-03', '2026-01-03');
INSERT INTO assignments (id, contract_id, driver_id, vehicle_id, assigned_date, driving_date, external_company_id, notes, created_at, updated_at) VALUES (13, 13, 4, 1, '2025-12-27 00:00:00', '2025-12-28 00:00:00', NULL, NULL, '2025-12-27', '2025-12-27');
INSERT INTO assignments (id, contract_id, driver_id, vehicle_id, assigned_date, driving_date, external_company_id, notes, created_at, updated_at) VALUES (14, 13, 1, 4, '2026-01-03 00:00:00', '2026-01-03 00:00:00', NULL, NULL, '2026-01-03', '2026-01-03');
INSERT INTO assignments (id, contract_id, driver_id, vehicle_id, assigned_date, driving_date, external_company_id, notes, created_at, updated_at) VALUES (15, 13, 2, 4, '2026-01-03 00:00:00', '2026-01-03 00:00:00', NULL, NULL, '2026-01-03', '2026-01-03');
INSERT INTO assignments (id, contract_id, driver_id, vehicle_id, assigned_date, driving_date, external_company_id, notes, created_at, updated_at) VALUES (16, 14, 3, 4, '2026-01-09 00:00:00', '2026-01-10 00:00:00', NULL, NULL, '2026-01-09', '2026-01-09');
INSERT INTO assignments (id, contract_id, driver_id, vehicle_id, assigned_date, driving_date, external_company_id, notes, created_at, updated_at) VALUES (17, 15, 3, 4, '2026-01-13 00:00:00', '2026-01-13 00:00:00', NULL, NULL, '2026-01-13', '2026-01-13');
INSERT INTO assignments (id, contract_id, driver_id, vehicle_id, assigned_date, driving_date, external_company_id, notes, created_at, updated_at) VALUES (18, 16, 1, 2, '2026-01-11 00:00:00', '2026-01-11 00:00:00', NULL, NULL, '2026-01-11', '2026-01-11');
INSERT INTO assignments (id, contract_id, driver_id, vehicle_id, assigned_date, driving_date, external_company_id, notes, created_at, updated_at) VALUES (19, 17, 5, 1, '2026-01-03 00:00:00', '2026-01-03 00:00:00', NULL, NULL, '2026-01-03', '2026-01-03');
INSERT INTO assignments (id, contract_id, driver_id, vehicle_id, assigned_date, driving_date, external_company_id, notes, created_at, updated_at) VALUES (20, 18, 2, 1, '2026-01-18 00:00:00', '2026-01-18 00:00:00', NULL, NULL, '2026-01-18', '2026-01-18');
INSERT INTO assignments (id, contract_id, driver_id, vehicle_id, assigned_date, driving_date, external_company_id, notes, created_at, updated_at) VALUES (21, 19, 2, 1, '2026-01-17 00:00:00', '2026-01-17 00:00:00', NULL, NULL, '2026-01-17', '2026-01-17');
INSERT INTO assignments (id, contract_id, driver_id, vehicle_id, assigned_date, driving_date, external_company_id, notes, created_at, updated_at) VALUES (22, 20, 3, 4, '2026-01-17 00:00:00', '2026-01-17 00:00:00', NULL, NULL, '2026-01-17', '2026-01-17');
INSERT INTO assignments (id, contract_id, driver_id, vehicle_id, assigned_date, driving_date, external_company_id, notes, created_at, updated_at) VALUES (23, 24, 3, 4, '2026-01-18 00:00:00', '2026-01-18 00:00:00', NULL, NULL, '2026-01-18', '2026-01-18');
INSERT INTO assignments (id, contract_id, driver_id, vehicle_id, assigned_date, driving_date, external_company_id, notes, created_at, updated_at) VALUES (24, 25, 2, 3, '2026-01-18 00:00:00', '2026-01-18 00:00:00', NULL, NULL, '2026-01-18', '2026-01-18');
INSERT INTO assignments (id, contract_id, driver_id, vehicle_id, assigned_date, driving_date, external_company_id, notes, created_at, updated_at) VALUES (25, 26, 3, 4, '2026-01-19 00:00:00', '2026-01-19 00:00:00', NULL, NULL, '2026-01-19', '2026-01-19');
SELECT setval(pg_get_serial_sequence('assignments', 'id'), (SELECT MAX(id) FROM assignments));


-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for all tables
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON quotes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON contracts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_accounts_updated_at BEFORE UPDATE ON payment_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- End of dump
