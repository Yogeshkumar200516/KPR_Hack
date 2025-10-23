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

const TopGSTProductsTable = ({
  topProducts,
  safeToFixed,
  safeToLocaleString,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const primaryColor = theme.palette.primary.main;

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const subscriptionType = localStorage.getItem("subscriptionType");
  const docLabel = subscriptionType === "bill" ? "Bill No" : "Invoice No";

  const handleChangePage = (event, newPage) => setPage(newPage);

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const paginatedProducts = topProducts.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Paper
      elevation={3}
      sx={{
        borderRadius: 3,
        overflow: "hidden",
        border: `2px solid ${primaryColor}`,
        boxShadow: `0 0 10px ${primaryColor}66`,
      }}
    >
      <TableContainer
        sx={{
          maxHeight: 430,
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
            <TableRow sx={{ backgroundColor: isDark ? "#1e1e1e" : "#f5f5f5" }}>
              {[
                "S.No",
                "Product Name",
                "HSN",
                "Category",
                "Quantity Sold",
                "Total Sales (₹)",
                "Avg. GST Rate (₹)",
                "Total Discount (₹)",
                "Total GST (₹)",
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
            {paginatedProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9}>
                  <Typography
                    align="center"
                    sx={{ color: theme.palette.text.secondary }}
                  >
                    No data found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedProducts.map((product, index) => (
                <TableRow
                  key={product.product_id}
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
                  <TableCell>{product.product_name}</TableCell>
                  <TableCell>{product.hsn_code}</TableCell>
                  <TableCell>{product.category_name}</TableCell>
                  <TableCell sx={{ textAlign: "center" }}>
                    {safeToLocaleString(product.total_quantity)}
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: "bold",
                      color: primaryColor,
                      textAlign: "right",
                    }}
                  >
                    ₹{safeToFixed(product.total_sales)}
                  </TableCell>
                  <TableCell sx={{ textAlign: "right" }}>
                    ₹{safeToFixed(product.avg_gst_rate)}
                  </TableCell>
                  <TableCell sx={{ textAlign: "right" }}>
                    ₹{safeToFixed(product.total_discount_given)}
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: "bold",
                      color: primaryColor,
                      textAlign: "right",
                    }}
                  >
                    ₹{safeToFixed(product.gst_collected)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={topProducts.length}
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

export default TopGSTProductsTable;
