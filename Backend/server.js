const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./src/config/config.js");

const productRoutes = require("./src/routes/products.js");
const authRoutes = require("./src/routes/authRoutes.js");
const invoiceRoutes = require("./src/routes/invoices.js");
const gstReportsRoutes = require("./src/routes/gstReports.js");
const usersRoutes = require("./src/routes/addUserRoutes.js");
const companyInfoRoutes = require("./src/routes/companyInfoRoutes.js");
const categoriesRoutes = require("./src/routes/categoryRoutes.js");
const invoiceRoute = require("./src/routes/sendInvoice.js");
const adminRoutes = require("./src/routes/adminRoutes.js");
const billsRouter = require("./src/routes/billRoutes.js");
const reminderRouter = require("./src/routes/remiderRoutes.js");
const alertRouter = require("./src/routes/sendAlerts.js");
const billingAddressRoutes = require('./src/routes/addressRoutes.js'); // adjust path if needed


const app = express();
const PORT = 5000;

// Enable CORS
app.use(cors());

// Increase payload size limits
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Global logger
app.use((req, res, next) => {
  console.log(
    `[GLOBAL LOG] ${new Date().toISOString()} ${req.method} ${req.originalUrl}`
  );
  next();
});

// Serve static files
app.use("/invoices", express.static(path.join(__dirname, "public/invoices")));
app.use("/temp", express.static(path.join(__dirname, "temp")));
app.use("/images", express.static(path.join(__dirname, "public", "images")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// API Routes
app.use("/api/users", usersRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/gst-reports", gstReportsRoutes);
app.use("/api/company", companyInfoRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/send", invoiceRoute);
app.use("/api/admin", adminRoutes);
app.use("/api/bills", billsRouter);
app.use("/api/reminder", reminderRouter);
app.use("/api/alert", alertRouter);

app.use('/api/address', billingAddressRoutes);


// Health check endpoint
app.get("/", (req, res) => {
  res.send("✅ Billing API is running");
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
