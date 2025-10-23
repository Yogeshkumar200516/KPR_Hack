import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Box,
  Grid,
  Typography,
  CircularProgress,
  IconButton,
  useMediaQuery,
  Tooltip,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";

import GSTSummaryCards from "./SummaryCards";
import FilterCollapse from "./FilterCollapse";
import MonthlyTrendChart from "./MonthlyTrendChart";
import CategorySalesPieChart from "./CategoryPieChart";
import TopGSTProductsTable from "./TopGstProductsTable";
import GstByUserTable from "./GstByUserTable";
import RecentStockMovementsTable from "./RecentStockTable";
import HighGstInvoicesTable from "./HighGstTable";
import DiscountsByProductTable from "./DiscountsTable";
import AdvanceInvoiceTable from "./AdvanceInvoiceTable";

import { generateTopGSTProductsPDF } from "../../components/PDFGeneration/DownloadTopGst";
import { generateHighGSTInvoicesPDF } from "../../components/PDFGeneration/DownloadTopInvoices";
import { generateDiscountsByProductPDF } from "../../components/PDFGeneration/Discounts";
import { generateGstByUserPDF } from "../../components/PDFGeneration/GstByUser";
import { generateStockMovementsPDF } from "../../components/PDFGeneration/StockMovement";
import { generateAdvanceInvoicesPDF } from "../../components/PDFGeneration/DownloadAdvanceInvoices";

import API_BASE_URL from "../../Context/Api";

// 🔑 helper to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Data states
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [gstByUser, setGstByUser] = useState([]);
  const [stockMovements, setStockMovements] = useState([]);
  const [highGstInvoices, setHighGstInvoices] = useState([]);
  const [discountsByProduct, setDiscountsByProduct] = useState([]);
  const [categorySales, setCategorySales] = useState([]);
  const [advanceInvoices, setAdvanceInvoices] = useState([]);
  const [summary, setSummary] = useState(null);
  const [subscriptionType, setSubscriptionType] = useState("invoice"); // <--- For switching bill/invoice

  const theme = useTheme();
  const { palette } = theme;
  const primaryColor = palette.primary.main;
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const safeToFixed = (value, decimals = 2) => {
    const num = Number(value);
    return !isNaN(num) ? num.toFixed(decimals) : "-";
  };
  const safeToLocaleString = (value) => {
    const num = Number(value);
    return !isNaN(num) ? num.toLocaleString() : "-";
  };

  // Main data fetcher
  const fetchAllReports = async (month, year) => {
    setLoading(true);
    const params = {};
    if (month) params.month = month;
    if (year) params.year = year;

    try {
      const headers = getAuthHeaders();

      // 1. Get summary first to capture subscriptionType
      const summaryRes = await axios.get(`${API_BASE_URL}/api/gst-reports/summary`, {
        params,
        headers,
      });
      setSummary(summaryRes.data || null);

      // derive subscriptionType from summary or make a dedicated endpoint/field (recommended for future)
      const subType = summaryRes.data?.subscription_type || "invoice";
      setSubscriptionType(subType);

      // 2. Parallel fetch of rest (after subscriptionType is set locally)
      const [
        monthlyRes,
        topProductsRes,
        gstByUserRes,
        stockMovementsRes,
        highGstInvoicesRes,
        discountsByProductRes,
        categorySalesRes,
        advanceInvoicesRes,
      ] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/gst-reports/monthly`, {
          params,
          headers,
        }),
        axios.get(`${API_BASE_URL}/api/gst-reports/top-products`, {
          params,
          headers,
        }),
        axios.get(`${API_BASE_URL}/api/gst-reports/gst-by-user`, {
          params,
          headers,
        }),
        axios.get(`${API_BASE_URL}/api/gst-reports/stock-movements`, {
          params,
          headers,
        }),
        axios.get(`${API_BASE_URL}/api/gst-reports/high-gst-invoices`, {
          params,
          headers,
        }),
        axios.get(`${API_BASE_URL}/api/gst-reports/discounts-by-product`, {
          params,
          headers,
        }),
        axios.get(`${API_BASE_URL}/api/gst-reports/category-sales`, {
          params,
          headers,
        }),
        axios.get(`${API_BASE_URL}/api/gst-reports/advance-invoices`, {
          params,
          headers,
        }),
      ]);

      setMonthlyTrend(monthlyRes.data || []);
      setTopProducts(topProductsRes.data || []);
      setGstByUser(gstByUserRes.data || []);
      setStockMovements(stockMovementsRes.data || []);
      setHighGstInvoices(highGstInvoicesRes.data || []);
      setDiscountsByProduct(discountsByProductRes.data || []);
      setCategorySales(categorySalesRes.data || []);
      setAdvanceInvoices(advanceInvoicesRes.data || []);
    } catch (error) {
      console.error("Error fetching GST reports:", error);
      setSummary(null);
      setMonthlyTrend([]);
      setTopProducts([]);
      setGstByUser([]);
      setStockMovements([]);
      setHighGstInvoices([]);
      setDiscountsByProduct([]);
      setCategorySales([]);
      setAdvanceInvoices([]);
      setSubscriptionType("invoice");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllReports("", ""); // overall data on mount
  }, []);

  useEffect(() => {
    fetchAllReports(selectedMonth, selectedYear);
    // selectedMonth can be "" for 'all'
  }, [selectedMonth, selectedYear]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Terminology helpers
  const docName = subscriptionType === "bill" ? "Bill" : "Invoice";
  const docNamePlural = subscriptionType === "bill" ? "Bills" : "Invoices";
  const docNameLower = docName.toLowerCase();

  // PDF download handlers updated for label
  const handleDownloadPDF = () => {
    generateTopGSTProductsPDF(topProducts, subscriptionType);
  };

  // ── Main render ──────────────────────────────────────────────────────────────
  return (
    <Box
      sx={{
        p: { xs: 2, md: 4 },
        mt: { xs: 2, sm: 1 },
        overflowX: "hidden",
        maxWidth: "100vw",
      }}
    >
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        mb={1}
      >
        {/* Dashboard Title */}
        <Typography
          sx={{
            color: primaryColor,
            mt: { xs: 1, sm: 1, md: 0 },
            fontSize: { xs: "24px", sm: "28px" },
            fontWeight: "bold",
          }}
        >
          Dashboard
        </Typography>

        {/* Filter Button with Tooltip */}
        <Tooltip title="Show Filters" arrow>
          <IconButton
            onClick={() => setShowFilters((prev) => !prev)}
            sx={{
              border: `1px solid ${primaryColor}`,
              color: primaryColor,
              borderRadius: 2,
              transition: "all 0.3s ease",
              "&:hover": {
                boxShadow: `0 0 8px ${primaryColor}`,
                transform: "scale(1.05)",
              },
            }}
          >
            <FilterAltIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <FilterCollapse
        showFilters={showFilters}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        setSelectedMonth={setSelectedMonth}
        setSelectedYear={setSelectedYear}
      />

      <Typography
        fontWeight="bold"
        sx={{
          mb: { xs: 1, sm: 2 },
          fontSize: { xs: "1.1rem", sm: "1.2rem" },
          color: primaryColor,
        }}
      >
        Overall {docName} Summary
      </Typography>

      <GSTSummaryCards summary={summary} subscriptionType={subscriptionType} />

      {/* Responsive Flex Section */}
      <Grid
        sx={{
          display: "flex",
          flexDirection: {
            xs: "column",
            sm: "column",
            md: "column",
            lg: "row",
          },
          gap: "20px",
          width: "100%",
        }}
      >
        <Grid sx={{ width: { md: "100%", lg: "60%" } }}>
          <Typography
            fontWeight="bold"
            sx={{
              mb: { xs: 1, sm: 2 },
              fontSize: { xs: "1.1rem", sm: "1.2rem" },
              color: primaryColor,
            }}
          >
            Monthly GST & Sales Trend
          </Typography>

          <Box sx={{ overflowX: "auto", width: "100%" }}>
            <MonthlyTrendChart
              monthlyTrend={monthlyTrend}
              subscriptionType={subscriptionType}
            />
          </Box>
        </Grid>

        <Grid sx={{ width: { md: "100%", lg: "40%" } }}>
          <Typography
            fontWeight="bold"
            sx={{
              mb: { xs: 1, sm: 2 },
              fontSize: { xs: "1.1rem", sm: "1.2rem" },
              color: primaryColor,
            }}
          >
            Category wise Sales Summary
          </Typography>
          <CategorySalesPieChart
            categorySales={categorySales}
            subscriptionType={subscriptionType}
          />
        </Grid>
      </Grid>

      <Grid sx={{ width: "100%", mb: 4 }}>
        <Grid
          container
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
          sx={{ mb: { xs: 1, sm: 2 }, flexWrap: "wrap" }}
        >
          <Grid item xs="auto">
            <Typography
              fontWeight="bold"
              sx={{
                fontSize: { xs: "1.1rem", sm: "1.3rem" },
                color: primaryColor,
                whiteSpace: "nowrap",
              }}
            >
              Top GST Contributing Products
            </Typography>
          </Grid>

          <Tooltip title={`Download ${docNamePlural} PDF`} arrow>
            <Grid item xs="auto">
              <IconButton
                onClick={handleDownloadPDF}
                sx={{
                  color: primaryColor,
                  border: `2px solid ${primaryColor}`,
                  borderRadius: "50%",
                  "&:hover": {
                    borderColor: primaryColor,
                    boxShadow: `0 0 8px ${primaryColor}, 0 0 6px ${primaryColor}`,
                  },
                }}
              >
                <CloudDownloadIcon
                  sx={{ fontSize: { xs: "18px", sm: "20px" } }}
                />
              </IconButton>
            </Grid>
          </Tooltip>
        </Grid>

        <Box sx={{ overflowX: "auto", width: "100%" }}>
          <TopGSTProductsTable
            topProducts={topProducts}
            safeToFixed={safeToFixed}
            safeToLocaleString={safeToLocaleString}
            subscriptionType={subscriptionType}
          />
        </Box>
      </Grid>

      <Grid
        sx={{
          display: "flex",
          flexDirection: "column",
          flexWrap: { md: "nowrap", lg: "wrap" },
        }}
      >
        <Grid item md={12} lg={6} sx={{ width: "100%" }}>
          <Grid
            container
            alignItems="center"
            justifyContent="space-between"
            spacing={2}
            sx={{ mb: { xs: 1, sm: 2 }, flexWrap: "wrap" }}
          >
            <Grid item xs="auto">
              <Typography
                fontWeight="bold"
                sx={{
                  fontSize: { xs: "1.1rem", sm: "1.3rem" },
                  color: primaryColor,
                  whiteSpace: "nowrap",
                }}
              >
                GST Reported by User
              </Typography>
            </Grid>

            <Tooltip title={`Download by ${docNamePlural} User PDF`} arrow>
              <Grid item xs="auto">
                <IconButton
                  onClick={() => generateGstByUserPDF(gstByUser, subscriptionType)}
                  sx={{
                    color: primaryColor,
                    border: `2px solid ${primaryColor}`,
                    borderRadius: "50%",
                    "&:hover": {
                      borderColor: primaryColor,
                      boxShadow: `0 0 8px ${primaryColor}, 0 0 6px ${primaryColor}`,
                    },
                  }}
                >
                  <CloudDownloadIcon
                    sx={{ fontSize: { xs: "18px", sm: "20px" } }}
                  />
                </IconButton>
              </Grid>
            </Tooltip>
          </Grid>

          <GstByUserTable
            gstByUser={gstByUser}
            safeToFixed={safeToFixed}
            safeToLocaleString={safeToLocaleString}
            subscriptionType={subscriptionType}
          />
        </Grid>

        <Grid item md={12} lg={6} sx={{ width: "100%" }}>
          <Grid
            container
            alignItems="center"
            justifyContent="space-between"
            spacing={2}
            sx={{ mb: { xs: 1, sm: 2 }, flexWrap: "wrap" }}
          >
            <Grid item xs="auto">
              <Typography
                fontWeight="bold"
                sx={{
                  fontSize: { xs: "1.1rem", sm: "1.3rem" },
                  color: primaryColor,
                  whiteSpace: "nowrap",
                }}
              >
                Recent Stock Movements
              </Typography>
            </Grid>

            <Tooltip title={`Download Stock Movement PDF`} arrow>
              <Grid item xs="auto">
                <IconButton
                  onClick={() => generateStockMovementsPDF(stockMovements, subscriptionType)}
                  sx={{
                    color: primaryColor,
                    border: `2px solid ${primaryColor}`,
                    borderRadius: "50%",
                    "&:hover": {
                      borderColor: primaryColor,
                      boxShadow: `0 0 8px ${primaryColor}, 0 0 6px ${primaryColor}`,
                    },
                  }}
                >
                  <CloudDownloadIcon
                    sx={{ fontSize: { xs: "18px", sm: "20px" } }}
                  />
                </IconButton>
              </Grid>
            </Tooltip>
          </Grid>

          <RecentStockMovementsTable
            stockMovements={stockMovements}
            safeToLocaleString={safeToLocaleString}
            subscriptionType={subscriptionType}
          />
        </Grid>
      </Grid>

      <Grid sx={{ width: "100%", mb: 4 }}>
        <Grid
          container
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
          sx={{ mb: { xs: 1, sm: 2 }, flexWrap: "wrap" }}
        >
          <Grid item xs="auto">
            <Typography
              fontWeight="bold"
              sx={{
                fontSize: { xs: "1.1rem", sm: "1.3rem" },
                color: primaryColor,
                whiteSpace: "nowrap",
              }}
            >
              Top GST {docNamePlural}
            </Typography>
          </Grid>

          <Tooltip title={`Download High GST ${docNamePlural} PDF`} arrow>
            <Grid item xs="auto">
              <IconButton
                onClick={() => generateHighGSTInvoicesPDF(highGstInvoices, subscriptionType)}
                sx={{
                  color: primaryColor,
                  border: `2px solid ${primaryColor}`,
                  borderRadius: "50%",
                  "&:hover": {
                    borderColor: primaryColor,
                    boxShadow: `0 0 8px ${primaryColor}, 0 0 6px ${primaryColor}`,
                  },
                }}
              >
                <CloudDownloadIcon
                  sx={{ fontSize: { xs: "18px", sm: "20px" } }}
                />
              </IconButton>
            </Grid>
          </Tooltip>
        </Grid>

        <HighGstInvoicesTable
          highGstInvoices={highGstInvoices}
          safeToFixed={safeToFixed}
          subscriptionType={subscriptionType}
        />
      </Grid>

      <Grid sx={{ width: "100%", mb: 4 }}>
        <Grid
          container
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
          sx={{ mb: { xs: 1, sm: 2 }, flexWrap: "wrap" }}
        >
          <Grid item xs="auto">
            <Typography
              fontWeight="bold"
              sx={{
                fontSize: { xs: "1.1rem", sm: "1.3rem" },
                color: primaryColor,
                whiteSpace: "nowrap",
              }}
            >
              Product wise Discount
            </Typography>
          </Grid>

          <Tooltip title="Download Product Discounts PDF" arrow>
            <Grid item xs="auto">
              <IconButton
                onClick={() =>
                  generateDiscountsByProductPDF(discountsByProduct, subscriptionType)
                }
                sx={{
                  color: primaryColor,
                  border: `2px solid ${primaryColor}`,
                  borderRadius: "50%",
                  "&:hover": {
                    borderColor: primaryColor,
                    boxShadow: `0 0 8px ${primaryColor}, 0 0 6px ${primaryColor}`,
                  },
                }}
              >
                <CloudDownloadIcon
                  sx={{ fontSize: { xs: "18px", sm: "20px" } }}
                />
              </IconButton>
            </Grid>
          </Tooltip>
        </Grid>

        <DiscountsByProductTable
          discountsByProduct={discountsByProduct}
          safeToFixed={safeToFixed}
          subscriptionType={subscriptionType}
        />
      </Grid>

      <Grid sx={{ width: "100%", mb: 4 }}>
        <Grid
          container
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
          sx={{ mb: { xs: 1, sm: 2 }, flexWrap: "wrap" }}
        >
          <Grid item xs="auto">
            <Typography
              fontWeight="bold"
              sx={{
                fontSize: { xs: "1.1rem", sm: "1.3rem" },
                color: primaryColor,
                whiteSpace: "nowrap",
              }}
            >
              Advance Payment Summary
            </Typography>
          </Grid>

          <Tooltip title={`Download Advance ${docNamePlural} PDF`} arrow>
            <Grid item xs="auto">
              <IconButton
                onClick={() =>
                  generateAdvanceInvoicesPDF(advanceInvoices, subscriptionType)
                }
                sx={{
                  color: primaryColor,
                  border: `2px solid ${primaryColor}`,
                  borderRadius: "50%",
                  "&:hover": {
                    borderColor: primaryColor,
                    boxShadow: `0 0 8px ${primaryColor}, 0 0 6px ${primaryColor}`,
                  },
                }}
              >
                <CloudDownloadIcon
                  sx={{ fontSize: { xs: "18px", sm: "20px" } }}
                />
              </IconButton>
            </Grid>
          </Tooltip>
        </Grid>

        <AdvanceInvoiceTable
          advanceInvoices={advanceInvoices}
          safeToFixed={safeToFixed}
          subscriptionType={subscriptionType}
        />
      </Grid>
    </Box>
  );
}
