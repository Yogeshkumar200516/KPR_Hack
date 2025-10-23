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

export default function RecentStockMovementsTable({
  stockMovements,
  safeToLocaleString,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const primaryColor = theme.palette.primary.main;

  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Handle pagination page change
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Slice paginated data for current page
  const paginatedStockMovements = stockMovements.slice(
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
          maxHeight: 420, // slightly increased for pagination usability
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
                "Type",
                "Qty Changed",
                "Old Stock",
                "New Stock",
                "Updated By",
                "Date",
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
                    textAlign: [
                      "Qty Changed",
                      "Old Stock",
                      "New Stock",
                    ].includes(header)
                      ? "right"
                      : header === "S.No"
                      ? "center"
                      : "left",
                  }}
                  align={
                    ["Qty Changed", "Old Stock", "New Stock"].includes(header)
                      ? "right"
                      : header === "S.No"
                      ? "center"
                      : "left"
                  }
                >
                  {header}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {paginatedStockMovements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <Typography
                    align="center"
                    sx={{ color: theme.palette.text.secondary }}
                  >
                    No data found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedStockMovements.map((sm, index) => (
                <TableRow
                  key={sm.movement_id}
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

                  <TableCell>{sm.product_name}</TableCell>
                  <TableCell>{sm.change_type}</TableCell>

                  <TableCell align="center">
                    {safeToLocaleString(sm.quantity_changed)}
                  </TableCell>
                  <TableCell align="center">
                    {safeToLocaleString(sm.old_stock)}
                  </TableCell>
                  <TableCell align="center">
                    {safeToLocaleString(sm.new_stock)}
                  </TableCell>

                  <TableCell>{sm.updated_by_name || "-"}</TableCell>

                  <TableCell>
                    {new Date(sm.created_at).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={stockMovements.length}
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
