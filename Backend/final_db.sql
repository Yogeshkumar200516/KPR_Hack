-- Company Info Table (Tenant Registry)
CREATE TABLE company_info (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    company_logo VARCHAR(255),
    address TEXT,
    cell_no1 VARCHAR(15),
    cell_no2 VARCHAR(15),
    gst_no VARCHAR(20),
    pan_no VARCHAR(20),
    account_name VARCHAR(100),
    bank_name VARCHAR(100),
    branch_name VARCHAR(100),
    ifsc_code VARCHAR(20),
    account_number VARCHAR(30),
    email VARCHAR(100),
    website VARCHAR(100),
    subscription_type ENUM('invoice', 'bill', 'both') NOT NULL DEFAULT 'invoice',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Users Table
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NULL,  -- Allow NULL for super_admin only
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    mobile_number VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('super_admin', 'admin', 'cashier', 'sales') NOT NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES company_info(id) ON DELETE CASCADE
);

-- Product Categories Table
CREATE TABLE product_categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    FOREIGN KEY (tenant_id) REFERENCES company_info(id) ON DELETE CASCADE
);

-- Products Table
CREATE TABLE products (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    barcode VARCHAR(50) UNIQUE,
    category_id INT NOT NULL,
    hsn_code varchar(20) NOT NULL,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    stock_quantity INT NOT NULL CHECK (stock_quantity >= 0),
    description TEXT DEFAULT NULL,
    image_url VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    gst DECIMAL(5,2) NOT NULL DEFAULT 0.00 CHECK (gst >= 0 AND gst <= 300),
    c_gst DECIMAL(5,2) NOT NULL DEFAULT 0.00 CHECK (c_gst >= 0 AND c_gst <= 300),
    s_gst DECIMAL(5,2) NOT NULL DEFAULT 0.00 CHECK (s_gst >= 0 AND s_gst <= 300),
    discount DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (discount >= 0 AND discount <= 100),
    discount_price DECIMAL(10,2) AS (ROUND(price - (price * discount / 100), 2)) STORED,
    is_traced BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (category_id) REFERENCES product_categories(category_id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES company_info(id) ON DELETE CASCADE
);

-- Customers Table
CREATE TABLE customers (
    customer_id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    mobile VARCHAR(20),
    whatsapp_number varchar(20) DEFAULT NULL,
    gst_number VARCHAR(20),
    email varchar(255) DEFAULT NULL,
    address TEXT,
    state VARCHAR(100),
    pincode VARCHAR(10),
    place_of_supply VARCHAR(255),
    vehicle_number VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES company_info(id) ON DELETE CASCADE
);

-- Invoices Table
CREATE TABLE invoices (
    invoice_id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_date DATE NOT NULL,
    customer_id INT,
    place_of_supply VARCHAR(255),
    vehicle_number VARCHAR(50),
    subtotal DECIMAL(10,2),
    gst_percentage DECIMAL(5,2),
    gst_amount DECIMAL(10,2),
    cgst_amount DECIMAL(10,2),
    sgst_amount DECIMAL(10,2),
    discount_type ENUM('%', 'flat') DEFAULT '%',
    discount_value DECIMAL(10,2),
    transport_charge DECIMAL(10,2),
    total_amount DECIMAL(10,2),
    created_by INT,
    payment_type ENUM('Cash', 'Card', 'UPI') DEFAULT 'Cash',
    payment_status ENUM('Full Payment', 'Advance') DEFAULT 'Full Payment',
    advance_amount DECIMAL(10,2) DEFAULT 0.00,
    due_date DATE NULL,
    payment_completion_status ENUM('Completed', 'Pending') DEFAULT 'Completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    payment_settlement_date DATE DEFAULT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (tenant_id) REFERENCES company_info(id) ON DELETE CASCADE
);

-- Invoice Items Table
CREATE TABLE invoice_items (
    item_id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    invoice_id INT NOT NULL,
    product_id INT NOT NULL,
    hsn_code VARCHAR(50),
    quantity INT NOT NULL,
    unit VARCHAR(50),
    rate DECIMAL(10,2),
    gst_percentage DECIMAL(5,2),
    base_amount DECIMAL(10,2),
    total_with_gst DECIMAL(10,2),
    FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    FOREIGN KEY (tenant_id) REFERENCES company_info(id) ON DELETE CASCADE
);

-- Bills Table (New Separate Table)
CREATE TABLE bills (
    bill_id INT AUTO_INCREMENT PRIMARY KEY,
    bill_no VARCHAR(100) UNIQUE
    tenant_id INT NOT NULL,
    customer_name VARCHAR(255),
    mobile_no VARCHAR(15),
    bill_number VARCHAR(50) UNIQUE NOT NULL,
    bill_date DATE NOT NULL,
    subtotal DECIMAL(10,2),
    gst_percentage DECIMAL(5,2),
    gst_amount DECIMAL(10,2),
    cgst_amount DECIMAL(10,2),
    sgst_amount DECIMAL(10,2),
    discount_type ENUM('%', 'flat') DEFAULT '%',
    discount_value DECIMAL(10,2),
    transport_charge DECIMAL(10,2),
    total_amount DECIMAL(10,2),
    created_by INT,
    payment_type ENUM('Cash', 'Card', 'UPI') DEFAULT 'Cash',
    payment_status ENUM('Full Payment', 'Advance') DEFAULT 'Full Payment',
    advance_amount DECIMAL(10,2) DEFAULT 0.00,
    due_date DATE NULL,
    payment_completion_status ENUM('Completed', 'Pending') DEFAULT 'Completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    payment_settlement_date DATE DEFAULT NULL,
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (tenant_id) REFERENCES company_info(id) ON DELETE CASCADE
);

-- Bill Items Table (New Separate Table)
CREATE TABLE bill_items (
    bill_item_id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    bill_id INT NOT NULL,
    product_id INT NOT NULL,
    hsn_code VARCHAR(50),
    quantity INT NOT NULL,
    unit VARCHAR(50),
    rate DECIMAL(10,2),
    gst_percentage DECIMAL(5,2),
    base_amount DECIMAL(10,2),
    total_with_gst DECIMAL(10,2),
    FOREIGN KEY (bill_id) REFERENCES bills(bill_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    FOREIGN KEY (tenant_id) REFERENCES company_info(id) ON DELETE CASCADE
);

-- Stock Movements Table
CREATE TABLE stock_movements (
    movement_id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    product_id INT NOT NULL,
    change_type ENUM('IN', 'OUT') NOT NULL,
    quantity_changed INT NOT NULL CHECK (quantity_changed > 0),
    old_stock INT NOT NULL CHECK (old_stock >= 0),
    new_stock INT NOT NULL CHECK (new_stock >= 0),
    reason VARCHAR(255) DEFAULT NULL,
    reference_id VARCHAR(100) DEFAULT NULL,
    updated_by VARCHAR(100) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES company_info(id) ON DELETE CASCADE
);





-- Insert into company_info (Initial Company Created by super_admin)
INSERT INTO company_info (company_name, company_logo, address, cell_no1, cell_no2, gst_no, pan_no, account_name, bank_name, branch_name, ifsc_code, account_number, email, website, subscription_type, is_active)
VALUES 
('Acme Wholesale Ltd.', 'logo.png', '123 Main Street, City, Country', '9876543210', '9123456780', 'GSTIN12345', 'PAN12345', 'Acme Account', 'Acme Bank', 'Acme Branch', 'ACME0001234', '1234567890', 'info@acme.com', 'www.acme.com', 'both', TRUE);

-- Insert super_admin User (tenant_id = 0 because not linked to a company)
INSERT INTO users (tenant_id, first_name, last_name, mobile_number, email, password_hash, role, status)
VALUES
(NULL, 'Super', 'Admin', '9999999999', 'superadmin@platform.com', 'Admin@123', 'super_admin', 'active');

-- Insert initial admin user for the first company (tenant_id = 1)
INSERT INTO users (tenant_id, first_name, last_name, mobile_number, email, password_hash, role, status)
VALUES 
(1, 'John', 'Doe', '8888888888', 'admin@acme.com', 'Admin@123', 'admin', 'active');

-- Insert product categories
INSERT INTO product_categories (tenant_id, category_name, is_active)
VALUES 
(1, 'Electronics', TRUE),
(1, 'Furniture', TRUE);

-- Insert products
INSERT INTO products (tenant_id, product_name, barcode, category_id, hsn_code, price, stock_quantity, description, image_url, gst, c_gst, s_gst, discount, is_traced)
VALUES 
(1, 'LED TV', 'BAR1234567890', 1, 'HSN1001', 50000.00, 10, '42 inch LED TV', 'ledtv.png', 18.00, 9.00, 9.00, 10.00, FALSE),
(1, 'Office Chair', 'BAR0987654321', 2, 'HSN1002', 3000.00, 50, 'Comfortable Office Chair', 'officechair.png', 18.00, 9.00, 9.00, 5.00, FALSE);

-- Insert customers
INSERT INTO customers (tenant_id, name, mobile, whatsapp_number, gst_number, email, address, state, pincode, place_of_supply, vehicle_number)
VALUES
(1, 'Alice Enterprises', '7777777777', '7777777777', 'GSTALICE1234', 'alice@enterprise.com', '456 Business Road, City', 'StateName', '123456', 'PlaceA', 'VEH1234');

-- Insert Invoice
INSERT INTO invoices (tenant_id, invoice_number, invoice_date, customer_id, place_of_supply, vehicle_number, subtotal, gst_percentage, gst_amount, cgst_amount, sgst_amount, discount_type, discount_value, transport_charge, total_amount, created_by, payment_type, payment_status, advance_amount, due_date, payment_completion_status, payment_settlement_date)
VALUES
(1, 'INV001', '2025-09-13', 1, 'PlaceA', 'VEH1234', 50000.00, 18.00, 9000.00, 4500.00, 4500.00, '%', 5.00, 500.00, 53250.00, 2, 'Cash', 'Full Payment', 0.00, '2025-10-13', 'Completed', NULL);

-- Insert Invoice Items
INSERT INTO invoice_items (tenant_id, invoice_id, product_id, hsn_code, quantity, unit, rate, gst_percentage, base_amount, total_with_gst)
VALUES
(1, 1, 1, 'HSN1001', 1, 'pcs', 50000.00, 18.00, 50000.00, 59000.00);

-- Insert Bill
INSERT INTO bills (tenant_id, bill_number, bill_date, subtotal, gst_percentage, gst_amount, cgst_amount, sgst_amount, discount_type, discount_value, transport_charge, total_amount, created_by, payment_type, payment_status, advance_amount, due_date, payment_completion_status, payment_settlement_date)
VALUES
(1, 'BILL001', '2025-09-13', 3000.00, 18.00, 540.00, 270.00, 270.00, '%', 2.00, 100.00, 3600.00, 2, 'Cash', 'Full Payment', 0.00, NULL, 'Completed', NULL);

-- Insert Bill Items
INSERT INTO bill_items (tenant_id, bill_id, product_id, hsn_code, quantity, unit, rate, gst_percentage, base_amount, total_with_gst)
VALUES
(1, 1, 2, 'HSN1002', 1, 'pcs', 3000.00, 18.00, 3000.00, 3540.00);

-- Insert Stock Movement Sample
INSERT INTO stock_movements (tenant_id, product_id, change_type, quantity_changed, old_stock, new_stock, reason, reference_id, updated_by)
VALUES
(1, 1, 'OUT', 1, 10, 9, 'Invoice Sale', 'INV001', 'admin@acme.com'),
(1, 2, 'OUT', 1, 50, 49, 'Bill Sale', 'BILL001', 'admin@acme.com');