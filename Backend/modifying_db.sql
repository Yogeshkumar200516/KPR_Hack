CREATE DATABASE billing_app;
USE billing_app;

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

CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NULL,
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

CREATE TABLE product_categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    FOREIGN KEY (tenant_id) REFERENCES company_info(id) ON DELETE CASCADE
);

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

CREATE TABLE customers (
  customer_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  mobile VARCHAR(20),
  whatsapp_number VARCHAR(20),
  gst_number VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  state VARCHAR(100),
  pincode VARCHAR(10),
  place_of_supply VARCHAR(255),
  vehicle_number VARCHAR(50),
  consignee_name VARCHAR(255),
  consignee_gst_number VARCHAR(20),
  consignee_mobile VARCHAR(20),
  consignee_email VARCHAR(255),
  consignee_address TEXT,
  consignee_state VARCHAR(100),
  consignee_pincode VARCHAR(10),
  consignee_place_of_supply VARCHAR(255),
  consignee_vehicle_number VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES company_info(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;




CREATE TABLE invoices (
    invoice_id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    billing_address_id INT NULL, 
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_date DATE NOT NULL,
    customer_id INT,
    place_of_supply VARCHAR(255),
    place_of_dispatch VARCHAR(255),
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
    payment_type ENUM('Cash', 'Card', 'UPI', 'NEFT', 'IMPS', 'RTGS') DEFAULT 'Cash',
    payment_status ENUM('Full Payment', 'Advance') DEFAULT 'Full Payment',
    advance_amount DECIMAL(10,2) DEFAULT 0.00,
    due_date DATE NULL,
    payment_completion_status ENUM('Completed', 'Pending') DEFAULT 'Completed',
    payment_settlement_date DATE DEFAULT NULL,
    eway_bill_no VARCHAR(50),
    eway_bill_date DATETIME,
    transporter_name VARCHAR(100),
    transporter_gst_number VARCHAR(20),
    transport_mode ENUM('Road', 'Rail', 'Air', 'Ship'),
    transport_distance INT,
    eway_valid_upto DATETIME,

    transaction_type ENUM('Regular', 'Bill To-Ship To', 'Bill From-Dispatch From', 'Combination'),
    supply_type ENUM('Outward', 'Inward'),
    document_type ENUM('Tax Invoice', 'Chalan', 'Purchase Return', 'Sales Return', 'Proforma Invoice', 'Debit Note', 'Credit Note') DEFAULT 'Tax Invoice',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (tenant_id) REFERENCES company_info(id) ON DELETE CASCADE
);


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

CREATE TABLE bills (
    bill_id INT AUTO_INCREMENT PRIMARY KEY,
    bill_no VARCHAR(100) UNIQUE,
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


CREATE TABLE billing_address (
    billing_address_id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    address_name VARCHAR(100),         
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
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES company_info(id) ON DELETE CASCADE
);



INSERT INTO users (
    tenant_id,
    first_name,
    last_name,
    mobile_number,
    email,
    password_hash,
    role,
    status
) VALUES (
    NULL,                    
    'Yogesh Kumar',                 
    'S',                
    '9080901518',            
    'admin@gmail.com',        
    'Admin@123',              
    'super_admin',            
    'active'                  
);


