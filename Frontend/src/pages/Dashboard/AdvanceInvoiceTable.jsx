import React, { useState } from "react";
import {
  Paper,
  Typography,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TablePagination,
  useTheme,
  Chip,
} from "@mui/material";

export default function AdvanceInvoiceTable({
  advanceInvoices,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const primaryColor = theme.palette.primary.main;
   const subscriptionType = localStorage.getItem("subscriptionType");

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleChangePage = (_, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const paginatedInvoices = advanceInvoices.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const formatCurrency = (val) =>
    Number(val || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // Dynamic labels based on subscriptionType
  const docLabel = subscriptionType === "bill" ? "Bill No" : "Invoice No";
  const dateLabel = subscriptionType === "bill" ? "Bill Date" : "Invoice Date"; // if you ever label dates in header
  const numberKey = subscriptionType === "bill" ? "bill_number" : "invoice_number"; // adjust if backend keys differ
  const dateKey = subscriptionType === "bill" ? "bill_date" : "invoice_date"; // adjust key accordingly

  return (
    <Paper
      elevation={3}
      sx={{
        borderRadius: 3,
        overflow: "hidden",
        border: `2px solid ${primaryColor}`,
        mb: 4,
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
        <Table stickyHeader size="small" sx={{ minWidth: 1100 }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: isDark ? "#1e1e1e" : "#f5f5f5" }}>
              {[
                "S.No",
                docLabel,
                "Date",
                "Customer",
                "Mobile",
                "Total (₹)",
                "Advance Paid (₹)",
                "Due (₹)",
                "Due Date",
                "Status",
              ].map((header) => (
                <TableCell
                  key={header}
                  sx={{
                    color: primaryColor,
                    fontWeight: "bold",
                    fontSize: { xs: "0.85rem", sm: "0.95rem" },
                    whiteSpace: "nowrap",
                    py: 2,
                    textAlign: "center",
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
                <TableCell colSpan={10}>
                  <Typography
                    align="center"
                    sx={{ color: theme.palette.text.secondary }}
                  >
                    {`No advance ${subscriptionType === "bill" ? "bills" : "invoices"} found.`}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedInvoices.map((inv, index) => (
                <TableRow
                  key={inv[numberKey] + index}
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
                  <TableCell align="left">{inv[numberKey]}</TableCell>
                  <TableCell>
                    {new Date(inv[dateKey]).toLocaleDateString("en-IN")}
                  </TableCell>
                  <TableCell>{inv.customer_name || "-"}</TableCell>
                  <TableCell>{inv.customer_mobile || "-"}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: "bold" }}>
                    {formatCurrency(inv.total_amount)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: "bold" }}>
                    {formatCurrency(inv.advance_amount)}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ fontWeight: "bold", color: primaryColor }}
                  >
                    {formatCurrency(inv.due_amount)}
                  </TableCell>
                  <TableCell align="center">
                    {inv.due_date
                      ? new Date(inv.due_date).toLocaleDateString("en-IN")
                      : "-"}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={inv.payment_completion_status}
                      size="small"
                      color={
                        inv.payment_completion_status === "Completed"
                          ? "success"
                          : "warning"
                      }
                      sx={{ fontWeight: "bold", textTransform: "capitalize", color: "white" }}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={advanceInvoices.length}
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
}
