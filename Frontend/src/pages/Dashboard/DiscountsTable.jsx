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

export default function DiscountsByProductTable({
  discountsByProduct,
  safeToFixed,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const primaryColor = theme.palette.primary.main;

  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Slice data for current page
  const paginatedDiscounts = discountsByProduct.slice(
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
                "Product",
                "Avg. Discount (₹)",
                "Min. Discount (₹)",
                "Max. Discount (₹)",
                "Total Discount (₹)",
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
                    textAlign: header === "Product" ? "left" : "right",
                  }}
                  align={header === "Product" ? "left" : "right"}
                >
                  {header}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {paginatedDiscounts.length === 0 ? (
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
              paginatedDiscounts.map((disc, index) => (
                <TableRow
                  key={disc.product_name}
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
                  <TableCell>{disc.product_name}</TableCell>
                  <TableCell align="right">
                    {safeToFixed(disc.avg_discount)}
                  </TableCell>
                  <TableCell align="right">
                    {safeToFixed(disc.min_discount)}
                  </TableCell>
                  <TableCell align="right">
                    {safeToFixed(disc.max_discount)}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ fontWeight: "bold", color: primaryColor }}
                  >
                    {safeToFixed(disc.total_discount_amount)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={discountsByProduct.length}
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
