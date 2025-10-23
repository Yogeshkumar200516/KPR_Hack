import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  useTheme,
  TablePagination,
} from "@mui/material";

// Utility to safely parse and format date strings
function formatSafeDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    // Fallback: return raw string or "-"
    return dateStr || "-";
  }
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const HighGstInvoicesTable = ({ highGstInvoices, safeToFixed }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const primaryColor = theme.palette.primary.main;
  const subscriptionType = localStorage.getItem("subscriptionType");

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleChangePage = (event, newPage) => setPage(newPage);

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const paginatedInvoices = highGstInvoices.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Dynamic labels and keys based on subscription type
  const docNumberLabel =
    subscriptionType === "bill" ? "Bill Number" : "Invoice Number";
  const docNumberKey =
    subscriptionType === "bill" ? "invoice_number" : "invoice_number";
  const docDateKey = subscriptionType === "bill" ? "invoice_date" : "invoice_date";

  return (
    <Paper
      elevation={3}
      sx={{
        borderRadius: 3,
        overflow: "hidden",
        border: `2px solid ${primaryColor}`,
      }}
    >
      <TableContainer
        sx={{
          maxHeight: 420,
          overflowX: "auto",
          "&::-webkit-scrollbar": { height: 6, width: "4px" },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "#888",
            borderRadius: 4,
          },
        }}
      >
        <Table stickyHeader size="small" sx={{ minWidth: 1000 }}>
          <TableHead>
            <TableRow
              sx={{ backgroundColor: isDark ? "#1e1e1e" : "#f5f5f5" }}
            >
              {[
                "S.No",
                "Customer Name",
                docNumberLabel,
                "Date",
                "GST Amount (₹)",
                "Total Amount (₹)",
              ].map((header) => (
                <TableCell
                  key={header}
                  sx={{
                    color: primaryColor,
                    fontWeight: "bold",
                    fontSize: { xs: "0.85rem", sm: "0.95rem" },
                    whiteSpace: "nowrap",
                    py: 2,
                    backgroundColor: isDark ? "#1e1e1e" : "#f5f5f5",
                  }}
                >
                  {header}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {paginatedInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography
                    align="center"
                    sx={{ color: theme.palette.text.secondary }}
                  >
                    No data found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedInvoices.map((inv, index) => (
                <TableRow
                  key={inv[docNumberKey] || index}
                  hover
                  sx={{
                    transition: "background 0.2s ease",
                    "&:hover": {
                      backgroundColor: isDark ? "#2a2a2a" : "#fafafa",
                    },
                  }}
                >
                  <TableCell align="center" sx={{ fontWeight: "bold" }}>
                    {page * rowsPerPage + index + 1}
                  </TableCell>
                  <TableCell>{inv.customer_name || "-"}</TableCell>
                  <TableCell>{inv[docNumberKey] || "-"}</TableCell>
                  <TableCell>{formatSafeDate(inv[docDateKey])}</TableCell>
                  <TableCell
                    sx={{
                      fontWeight: "bold",
                      color: primaryColor,
                      textAlign: "center",
                    }}
                  >
                    ₹{safeToFixed(inv.gst_amount)}
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: "bold",
                      color: primaryColor,
                      textAlign: "center",
                    }}
                  >
                    ₹{safeToFixed(inv.total_amount)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={highGstInvoices.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[5, 10, 20, 50]}
        sx={{
          "& .MuiTablePagination-toolbar": {
            backgroundColor: isDark ? "#1e1e1e" : "#fafafa",
            color: primaryColor,
          },
          "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
            fontWeight: "bold",
            fontSize: "0.875rem",
          },
        }}
      />
    </Paper>
  );
};

export default HighGstInvoicesTable;
