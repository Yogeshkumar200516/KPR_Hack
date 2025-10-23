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
  useTheme,
  TablePagination,
} from "@mui/material";

export default function GstByUserTable({
  gstByUser,
  safeToFixed,
  safeToLocaleString,
}) {
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

  const paginatedUsers = gstByUser.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Contextual column names and accessors
  const docCreatedLabel = subscriptionType === "bill" ? "Bills Created" : "Invoices Created";
  const docCreatedKey = subscriptionType === "bill" ? "total_bills" : "total_invoices";
  const avgGstKey = subscriptionType === "bill" ? "avg_gst_per_bill" : "avg_gst_per_invoice";

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
          "&::-webkit-scrollbar": { height: 6, width: '4px' },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "#888",
            borderRadius: 4,
          },
        }}
      >
        <Table stickyHeader size="small" sx={{ minWidth: 1000 }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: isDark ? "#1e1e1e" : "#f5f5f5" }}>
              {[
                "S.No",
                "User Name",
                "Role",
                `Avg. GST (₹)`,
                "Total Sales (₹)",
                docCreatedLabel,      // <-- Dynamic
                "GST Collected (₹)",
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
                    textAlign:
                      header === "User Name" || header === "Role"
                        ? "left"
                        : "right",
                  }}
                  align={
                    header === "User Name" || header === "Role"
                      ? "left"
                      : "right"
                  }
                >
                  {header}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {paginatedUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography
                    align="center"
                    sx={{ color: theme.palette.text.secondary }}
                  >
                    No data found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedUsers.map((user, index) => (
                <TableRow
                  key={`${user.first_name}-${user.last_name}`}
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
                  <TableCell>
                    {`${user.first_name} ${user.last_name}`}
                  </TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell align="right">
                    {safeToFixed(user[avgGstKey])}
                  </TableCell>
                  <TableCell align="right">
                    {safeToLocaleString(user.total_sales)}
                  </TableCell>
                  <TableCell align="center">
                    {safeToLocaleString(user[docCreatedKey])}
                  </TableCell>
                  <TableCell align="right">
                    {safeToFixed(user.total_gst_collected)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={gstByUser.length}
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
          "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows":
            {
              fontWeight: "bold",
              fontSize: "0.875rem",
            },
        }}
      />
    </Paper>
  );
}
