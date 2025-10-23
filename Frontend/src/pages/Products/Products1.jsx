import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import DrawIcon from "@mui/icons-material/Draw";
import AddBoxIcon from "@mui/icons-material/AddBox";
import SearchIcon from "@mui/icons-material/Search";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import ProductModal from "./ProductModal";
import logo from "../../assets/images/logo2.svg";
import { ColorModeContext } from "../../Context/ThemeContext.jsx";
import AutoDeleteIcon from "@mui/icons-material/AutoDelete";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import TableChartIcon from "@mui/icons-material/TableChart";
import Tooltip from "@mui/material/Tooltip";
import ClearAllIcon from "@mui/icons-material/ClearAll";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TableContainer,
  Table,
  Paper,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TablePagination,
} from "@mui/material";
import { Snackbar, Alert } from "@mui/material";
import API_BASE_URL from "../../Context/Api.jsx";
import CloseIcon from "@mui/icons-material/Close";
import FlipCameraAndroidOutlinedIcon from "@mui/icons-material/FlipCameraAndroidOutlined";
import AutoModeIcon from '@mui/icons-material/AutoMode';
import CategoryModal from "./CategoryModal.jsx";

// Utility to get current user and token from localStorage
const getUserAndToken = () => {
  const user = localStorage.getItem("user");
  const token = localStorage.getItem("authToken") || (JSON.parse(user || "{}").token);
  return {
    user: user ? JSON.parse(user) : null,
    authToken: token,
  };
};

const Products = () => {
  const theme = useTheme();
  const { palette } = theme;
  const isDark = palette.mode === "dark";
  const primaryColor = palette.primary.main;
  const colorMode = useContext(ColorModeContext);

  // Snackbar state
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  // Data states
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [currentProduct, setCurrentProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [productIdToDelete, setProductIdToDelete] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [viewMode, setViewMode] = useState("card");
  const [showTracedOnly, setShowTracedOnly] = useState(false);
  const [openCategoryModal, setOpenCategoryModal] = useState(false);

  // Get auth/user context
  const { user, authToken } = getUserAndToken();

  // Snackbar utility
  const showSnackbar = (message, severity = "success") => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Fetch Categories (scoped by tenant at backend)
  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/products/categories`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setCategories(res.data);
    } catch (err) {
      console.error("Failed to fetch categories:", err);
      showSnackbar("Failed to load categories.", "error");
    }
  };

  // Fetch Products (scoped by tenant at backend)
  const fetchProducts = async () => {
    setLoading(true);
    setError("");
    try {
      const url = showTracedOnly
        ? `${API_BASE_URL}/api/products/traced`
        : `${API_BASE_URL}/api/products`;
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setProducts(res.data);
      // Immediately apply filtering on fresh data with current searchTerm
      filterProducts(searchTerm, res.data);
    } catch (err) {
      console.error("Failed to fetch products:", err);
      setError(
        err.response?.data?.message || err.response?.data?.error || "Failed to load products."
      );
      showSnackbar("Failed to load products.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Filter products accepts optional product list parameter (default current products)
  const filterProducts = (search, productList = products) => {
    if (!search) {
      setFilteredProducts(productList);
    } else {
      const lower = search.toLowerCase();
      const filtered = productList.filter(
        (p) =>
          p.product_name.toLowerCase().includes(lower) ||
          p.description?.toLowerCase().includes(lower) ||
          p.category_name.toLowerCase().includes(lower) ||
          p.product_id.toString().includes(lower) ||
          p.price.toString().includes(lower) ||
          p.discount_price?.toString().includes(lower) ||
          p.discount?.toString().includes(lower) ||
          p.stock_quantity?.toString().includes(lower) ||
          p.hsn_code?.toString().includes(lower) ||
          p.gst?.toString().includes(lower)
      );
      setFilteredProducts(filtered);
    }
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    filterProducts(val);
  };

  const handleCloseSearch = () => {
    setSearchTerm("");
    filterProducts("");
  };

  // Utility: Block unauthorized actions
  const checkUserLoggedIn = (customMessage) => {
    if (!user || !authToken) {
      showSnackbar(customMessage || "Please login.", "error");
      return false;
    }
    return true;
  };

  const handleAddProduct = () => {
    if (!checkUserLoggedIn("Please login first to Add Products")) return;
    setModalMode("add");
    setCurrentProduct(null);
    setIsModalOpen(true);
  };

  const handleEdit = (product) => {
    if (!checkUserLoggedIn("Please login first to Edit Products")) return;
    setModalMode("edit");
    setCurrentProduct(product);
    setIsModalOpen(true);
  };

  const openDeleteModal = (id) => {
    if (!checkUserLoggedIn("Please login first to delete products.")) return;
    setProductIdToDelete(id);
    setOpenDeleteDialog(true);
  };

  const closeDeleteModal = () => {
    setOpenDeleteDialog(false);
    setProductIdToDelete(null);
  };

  const handleSaveProduct = async (productData) => {
  if (!authToken) {
    showSnackbar("Unauthorized. Please login.", "error");
    return;
  }

  if (!productData || typeof productData !== "object") {
    showSnackbar("Invalid product data.", "error");
    return;
  }

  const rawHSN = typeof productData.hsn_code === "string" ? productData.hsn_code : "";
  const trimmedHSN = rawHSN.trim();
  const cleanedHSN = trimmedHSN.replace(/[\u200B-\u200D\uFEFF]/g, '');

  console.log('Raw HSN:', rawHSN, 'Trimmed HSN:', trimmedHSN, 'Cleaned HSN:', cleanedHSN);
  console.log('Full productData:', productData);

  let gst = parseFloat(productData.gst);
  if (isNaN(gst)) gst = 0;
  if (gst < 0 || gst > 300) {
    showSnackbar("GST must be a number between 0 and 300.", "error");
    return;
  }

  if (cleanedHSN.length < 4) {
    showSnackbar("HSN code missing or too short (min 4 characters).", "error");
    return;
  }

  const categoryId = parseInt(productData.category_id, 10);
  const priceNum = parseFloat(productData.price);
  const stockNum = parseInt(productData.stock_quantity, 10);

  if (isNaN(categoryId) || isNaN(priceNum) || isNaN(stockNum)) {
    showSnackbar("Category, price, and stock quantity must be valid numbers.", "error");
    return;
  }

  const payload = {
    ...productData,
    hsn_code: cleanedHSN,
    gst,
    c_gst: parseFloat((gst / 2).toFixed(2)),
    s_gst: parseFloat((gst / 2).toFixed(2)),
    category_id: categoryId,
    price: priceNum,
    stock_quantity: stockNum,
  };

  try {
    let response;

    if (modalMode === "add") {
      response = await axios.post(
        `${API_BASE_URL}/api/products/add`,
        payload,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      showSnackbar("Product added successfully.", "success");
    } else {
      if (!productData?.product_id) {
        showSnackbar("Invalid product ID for editing.", "error");
        return;
      }

      response = await axios.put(
        `${API_BASE_URL}/api/products/edit/${productData.product_id}`,
        payload,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      showSnackbar("Product updated successfully.", "success");
    }

    console.log('API Response:', response.data);

    await fetchProducts();

    // ⚡️ DO NOT close modal here. Modal handles its own state.

  } catch (error) {
    console.error('Save Product Error:', error.response?.data || error.message);

    const serverMessage =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      "Failed to save product.";

    showSnackbar(`Error: ${serverMessage}`, "error");
  }
};



  // Delete/trace product (tenant context handled in backend)
  const confirmDelete = async () => {
    if (!authToken) return showSnackbar("Unauthorized. Login first.", "error");
    try {
      const res = await axios.delete(
        `${API_BASE_URL}/api/products/delete/${productIdToDelete}`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      if (res.status === 200) {
        showSnackbar(
          res.data.traced ? "Product marked as traced." : "Product deleted successfully.",
          res.data.traced ? "info" : "success"
        );
        await fetchProducts(); // await fresh data after delete/tracing
      }
    } catch (err) {
      console.error("Error deleting product:", err);
      if (err.response?.status === 400) {
        showSnackbar(err.response.data.error, "error");
      } else {
        showSnackbar("Failed to delete product.", "error");
      }
    } finally {
      closeDeleteModal();
    }
  };

  // Toggle traced status, tenant scoped at backend
  const handleUntraceProduct = async (productId) => {
    if (!authToken) return showSnackbar("Unauthorized. Login first.", "error");
    try {
      await axios.put(
        `${API_BASE_URL}/api/products/${productId}/toggle-trace`,
        {},
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      await fetchProducts(); // refresh UI after toggle-trace
      showSnackbar("Trace status updated", "success");
    } catch (err) {
      console.error("Failed to update trace status:", err);
      showSnackbar("Failed to update trace status", "error");
      await fetchProducts(); // Rollback UI if failed
    }
  };

  // Initial data loading and when showing traced only changes
  useEffect(() => {
    if (!authToken) {
      setError("Unauthorized. Please login to view products.");
      return;
    }
    fetchProducts();
    fetchCategories();
    // eslint-disable-next-line
  }, [authToken]);

  useEffect(() => {
    if (authToken) fetchProducts();
    // eslint-disable-next-line
  }, [showTracedOnly]);


  return (
    <Box sx={{
      minHeight: "100vh",
      px: { xs: 1, sm: 2 },
      py: { xs: 3, sm: 4 },
      fontFamily: "'Inter', sans-serif",
      color: palette.text.primary,
      width: "100%",
      maxWidth: "100vw",
      boxSizing: "border-box",
      overflowX: "hidden",
    }}>
      {/* Header */}
      <Box sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        mb: 4,
        mt: { xs: 2, sm: 0 },
        flexWrap: { xs: "wrap", sm: "wrap", md: "nowrap" },
        gap: { xs: 2, sm: 0 },
      }}>
        <Typography variant="h5" sx={{
          fontWeight: 700, color: primaryColor,
          fontSize: { xs: "1.3rem", sm: "1.5rem" },
        }}>
          Product Management
        </Typography>
        {/* Actions */}
        <Box sx={{
          display: "flex",
          gap: { xs: '0px', sm: '10px' },
          flexDirection: "row",
          "@media (max-width:600px)": {
            flexDirection: "column", width: "100%",
          },
        }}>
          <Button
            variant="outlined"
            color={showTracedOnly ? "secondary" : "primary"}
            onClick={() => setShowTracedOnly((prev) => !prev)}
            startIcon={<FlipCameraAndroidOutlinedIcon />}
            sx={{
              bgcolor: "transparent", mt: "10px", color: primaryColor,
              border: `1px solid ${primaryColor}`, px: 2, py: 1, borderRadius: 3,
              fontWeight: "bold", display: "flex", alignItems: "center",
              textTransform: "none",
              "&:hover": { boxShadow: `0 0 8px ${primaryColor}, 0 0 6px ${primaryColor}`, filter: "brightness(1.1)" }
            }}
          >
            {showTracedOnly ? "Show Active Products" : "Show Traced Products"}
          </Button>
          {!showTracedOnly && (
            <Button
              startIcon={<AutoModeIcon />}
              onClick={() => setOpenCategoryModal(true)}
              sx={{
                bgcolor: "transparent", mt: "10px", color: primaryColor,
                border: `1px solid ${primaryColor}`, px: 2, py: 1, borderRadius: 3,
                fontWeight: "bold", display: "flex", alignItems: "center",
                textTransform: "none",
                "&:hover": { boxShadow: `0 0 8px ${primaryColor}, 0 0 6px ${primaryColor}` },
              }}
            >
              Update Category
            </Button>
          )}
          {!showTracedOnly && (
            <Button
              startIcon={<AddBoxIcon />}
              onClick={handleAddProduct}
              sx={{
                bgcolor: "transparent", mt: "10px", color: primaryColor,
                border: `1px solid ${primaryColor}`, px: 2, py: 1, borderRadius: 3,
                fontWeight: "bold", display: "flex", alignItems: "center",
                textTransform: "none",
                "&:hover": { boxShadow: `0 0 8px ${primaryColor}, 0 0 6px ${primaryColor}` },
              }}
            >
              Add Product
            </Button>
          )}
        </Box>
      </Box>
      {/* Search */}
      <Box sx={{
        display: "flex", justifyContent: "center", mb: 3
      }}>
        <Box sx={{
          display: "flex", alignItems: "center", bgcolor: palette.background.paper,
          borderRadius: "40px", p: "10px 16px", width: "100%", maxWidth: 520,
          boxShadow: `0 0 10px ${primaryColor}66`, border: `2px solid ${primaryColor}`,
          transition: "all 0.3s ease",
          "&:hover": {
            boxShadow: `0 0 8px ${primaryColor}, 0 0 6px ${primaryColor}`,
            filter: "brightness(1.1)", transform: "scale(1.02)", transition: "all 0.3s ease"
          }
        }}>
          <SearchIcon sx={{ color: primaryColor, mr: 1 }} />
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Search for the Products..."
            style={{
              flex: 1, border: "none", outline: "none", backgroundColor: "transparent",
              color: palette.text.primary, fontSize: "1rem", fontFamily: "'Inter', sans-serif"
            }}
          />
          <CloseIcon
            onClick={handleCloseSearch}
            sx={{ color: "gray", fontSize: "20px", cursor: "pointer" }}
          />
        </Box>
      </Box>
      {/* Card/Table toggle */}
      <Box sx={{
        display: "flex", justifyContent: "flex-end", mt: 2, textAlign: "right", gap: "8px", mb: "10px"
      }}>
        <Tooltip
          title={viewMode === "card" ? "Switch to Table View" : "Switch to Card View"}
        >
          <IconButton
            onClick={() => setViewMode(viewMode === "card" ? "table" : "card")}
            sx={{
              color: primaryColor, border: `1.5px solid ${primaryColor}`, borderRadius: 2, alignItems: "center", p: 1.2, mb: { xs: 1, sm: 0 },
              "&:hover": { backgroundColor: primaryColor, color: "#fff", transition: "all 0.3s ease" }
            }}
          >
            {viewMode === "card" ? <TableChartIcon /> : <ViewModuleIcon />}
          </IconButton>
        </Tooltip>
      </Box>
      {/* Product Grid/Table */}
{loading ? (
  <Typography sx={{
    textAlign: "center", mt: 10, fontSize: "1.5rem", color: palette.text.secondary,
  }}>
    Loading...
  </Typography>
) : error ? (
  <Typography sx={{ color: "error.main", textAlign: "center" }}>
    {error}
  </Typography>
) : filteredProducts.length === 0 ? (
  <Box sx={{ textAlign: "center", border: `2px dashed ${primaryColor}`, borderRadius: '20px', pt: 8, pb: 16 }}>
    <HourglassEmptyIcon
      sx={{ fontSize: 48, mb: 1, color: primaryColor, mt: 8 }}
    />
    <Typography variant="subtitle1" fontWeight="bold">
      No products added
    </Typography>
    <Typography variant="body2">
      You're all caught up!
    </Typography>
  </Box>
) : viewMode === "card" ? (
  <Box sx={{
    display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 4,
  }}>
    {filteredProducts.map((product) => (
      <Box key={product.product_id} sx={{
        bgcolor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
        backdropFilter: "blur(8px)", border: 1,
        borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)",
        borderRadius: 2, p: 2, boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        transition: "transform 0.2s ease-in-out, border-color 0.2s ease-in-out",
        "&:hover": { transform: "translateY(-5px) scale(1.02)", borderColor: primaryColor }
      }}>
        <Box
          component="img"
          src={`${API_BASE_URL}/${product.image_url}`}
          alt={product.product_name}
          sx={{
            width: "100%", height: 180, objectFit: "cover", borderRadius: 1, mb: 2
          }}
        />
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h6" sx={{ mb: 0.5, fontWeight: 600 }}>
            {product.product_name}
          </Typography>
          <Typography sx={{ mb: 1, color: primaryColor }}>
            {product.category_name}
          </Typography>
          <Typography sx={{
            fontSize: "0.95rem", color: palette.text.secondary, lineHeight: 1.4,
            maxHeight: "4.2em", overflow: "hidden", textOverflow: "ellipsis",
            display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical"
          }}>
            {product.description || "No description provided."}
          </Typography>
          <Box sx={{
            display: "flex", justifyContent: "space-between", mt: 1,
            fontSize: "0.9rem", color: palette.text.disabled,
          }}>
            <Typography>ID: {product.product_id}</Typography>
            <Typography sx={{ color: primaryColor, fontWeight: "bold" }}>
              ₹{product.discount_price}
            </Typography>
          </Box>
          <Box sx={{
            display: "flex", justifyContent: "space-between", mt: 1, mb: 1,
            fontSize: "0.4rem", color: palette.text.disabled
          }}>
            <Typography sx={{ fontSize: "13px", fontWeight: "bold" }}>
              HSN: {product.hsn_code}
            </Typography>
            <Typography sx={{ fontSize: "13px", fontWeight: "bold" }}>
              GST: {product.gst}%
            </Typography>
          </Box>
          <Box sx={{
            display: "flex", justifyContent: "space-between", mt: 1, mb: 1,
            fontSize: "0.4rem", color: palette.text.disabled
          }}>
            <Typography sx={{ fontSize: "13px", fontWeight: "bold" }}>
              Discount: {product.discount}%
            </Typography>
            <Typography sx={{ fontSize: "13px", fontWeight: "bold" }}>
              Price: ₹{product.price}
            </Typography>
          </Box>
        </Box>
        <Box sx={{
          display: "flex", justifyContent: "space-between", mt: 2,
          alignItems: "center",
        }}>
          <Typography sx={{
            fontWeight: "bold", px: 1.5, py: 0.4, borderRadius: 3,
            color: product.stock_quantity > 0 ? "#298b24" : "#ef5350",
            border: `1px solid ${product.stock_quantity > 0 ? "#298b24" : "#ef5350"}`
          }}>
            {product.stock_quantity > 0
              ? `In Stock (${product.stock_quantity})` : "Out of Stock"}
          </Typography>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <IconButton
              onClick={() => handleEdit(product)}
              sx={{
                border: `1px solid ${primaryColor}`,
                color: primaryColor, p: 1,
                "&:hover": { boxShadow: `0 0 8px ${primaryColor}, 0 0 6px ${primaryColor}` }
              }}>
              <DrawIcon />
            </IconButton>
            {showTracedOnly ? (
              <Tooltip title="Mark as Normal Product">
                <IconButton
                  onClick={() => handleUntraceProduct(product.product_id)}
                  sx={{
                    border: "1px solid #ef5350", color: "#ef5350", p: 1,
                    "&:hover": { boxShadow: "0 0 8px #ef5350, 0 0 6px #df322d" },
                  }}>
                  <ClearAllIcon />
                </IconButton>
              </Tooltip>
            ) : (
              <IconButton
                disabled={product.is_linked}
                onClick={() => openDeleteModal(product.product_id)}
                sx={{
                  border: "1px solid", color: product.is_linked ? "#aaa" : "#ef5350", p: 1,
                  "&:hover": {
                    boxShadow: product.is_linked
                      ? "none"
                      : "0 0 8px #ef5350, 0 0 6px #df322d",
                  },
                  cursor: product.is_linked ? "not-allowed" : "pointer",
                }}>
                <AutoDeleteIcon />
              </IconButton>
            )}
          </Box>
        </Box>
      </Box>
    ))}
  </Box>
) : (
  <Box sx={{ width: "100%" }}>
    <TableContainer component={Paper}
      sx={{
        mt: 2, maxHeight: 600, overflow: "auto", border: `1px solid ${primaryColor}`,
        scrollbarWidth: "none",
      }}>
      <Table stickyHeader size="small" sx={{ minWidth: 1200 }}>
        <TableHead>
          <TableRow sx={{ height: 60, backgroundColor: primaryColor }}>
            {[
              "ID", "Image", "Name", "Category", "Price", "Discount",
              "Rate", "GST", "HSN", "Stock", "Actions"
            ].map((header) => (
              <TableCell key={header} sx={{
                color: primaryColor, fontWeight: "bold", fontSize: "0.95rem",
                backgroundColor: theme.palette.background.default,
              }}>
                {header}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredProducts
            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
            .map((product) => (
              <TableRow key={product.product_id}>
                <TableCell>{product.product_id}</TableCell>
                <TableCell>
                  <img
                    src={`${API_BASE_URL}/${product.image_url}`}
                    alt={product.product_name}
                    style={{
                      width: 60, height: 60,
                      objectFit: "cover",
                      borderRadius: 6,
                    }}
                  />
                </TableCell>
                <TableCell>{product.product_name}</TableCell>
                <TableCell>{product.category_name}</TableCell>
                <TableCell align="right">₹{product.price}</TableCell>
                <TableCell align="right" sx={{ fontWeight: "bold" }}>{product.discount}%</TableCell>
                <TableCell align="right" sx={{ fontWeight: "bold", color: primaryColor }}>₹{product.discount_price}</TableCell>
                <TableCell align="right">{product.gst}%</TableCell>
                <TableCell>{product.hsn_code}</TableCell>
                <TableCell align="center">
                  <Typography sx={{
                    fontWeight: "bold", px: 1.5, py: 0.4,
                    borderRadius: 3,
                    color: product.stock_quantity > 0 ? "#298b24" : "#ef5350",
                    border: `1px solid ${product.stock_quantity > 0 ? "#298b24" : "#ef5350"}`
                  }}>
                    {product.stock_quantity > 0
                      ? `In Stock (${product.stock_quantity})`
                      : "Out of Stock"}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", gap: "10px" }}>
                    <IconButton
                      onClick={() => handleEdit(product)}
                      sx={{
                        color: primaryColor,
                        border: `1px solid ${primaryColor}`,
                        "&:hover": { boxShadow: `0 0 8px ${primaryColor}, 0 0 6px ${primaryColor}` }
                      }}>
                      <DrawIcon />
                    </IconButton>
                    {showTracedOnly ? (
                      <Tooltip title="Mark as Normal Product">
                        <IconButton
                          onClick={() =>
                            handleUntraceProduct(product.product_id)
                          }
                          sx={{
                            border: "1px solid #ef5350",
                            color: "#ef5350", p: 1,
                            "&:hover": { boxShadow: "0 0 8px #ef5350, 0 0 6px #df322d" }
                          }}>
                          <ClearAllIcon />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <IconButton
                        disabled={product.is_linked}
                        onClick={() => openDeleteModal(product.product_id)}
                        sx={{
                          border: "1px solid",
                          color: product.is_linked ? "#aaa" : "#ef5350", p: 1,
                          "&:hover": {
                            boxShadow: product.is_linked
                              ? "none"
                              : "0 0 8px #ef5350, 0 0 6px #df322d",
                          },
                          cursor: product.is_linked ? "not-allowed" : "pointer",
                        }}>
                        <AutoDeleteIcon />
                      </IconButton>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </TableContainer>
    <TablePagination
      component="div"
      count={filteredProducts.length}
      page={page}
      onPageChange={handleChangePage}
      rowsPerPage={rowsPerPage}
      rowsPerPageOptions={[5, 10, 25, 50]}
      onRowsPerPageChange={handleChangeRowsPerPage}
      sx={{
        border: `1px solid ${primaryColor}`,
        borderTop: "none",
        backgroundColor: (theme) => theme.palette.background.paper,
        borderRadius: "0 0 10px 10px",
        boxShadow: (theme) => `0 0 4px ${theme.palette.primary.main}55`,
      }}
    />
  </Box>
)}

      {/* Product modals */}
      <ProductModal
        open={isModalOpen}
        handleClose={() => setIsModalOpen(false)}
        handleSave={handleSaveProduct}
        mode={modalMode}
        initialData={currentProduct}
        categories={categories}
      />
      <CategoryModal open={openCategoryModal} onClose={() => setOpenCategoryModal(false)} />
      {/* Delete confirmation modal */}
      <Dialog
        open={openDeleteDialog}
        onClose={closeDeleteModal}
        PaperProps={{
          sx: {
            backgroundColor: isDark ? "#121212" : "#fff",
            border: `2px solid ${primaryColor}`,
            boxShadow: `0 0 12px ${primaryColor}, 0 0 8px ${primaryColor}`,
            borderRadius: 5,
            padding: 1,
            minWidth: 320,
          },
        }}
      >
        <DialogTitle sx={{ color: primaryColor, fontWeight: "bold" }}>
          Confirm Deletion ?
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this product? The deleted
            product will be marked as traced if used in invoices.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={closeDeleteModal}
            variant="outlined"
            sx={{
              ml: "10px", gap: "8px", textTransform: "none",
              color: isDark ? "#d1cfce" : "gray",
              border: isDark ? "1px solid #d1cfce" : "1px solid gray",
              borderRadius: "40px", backgroundColor: "transparent",
              transition: "all 0.3s ease-in-out",
              "&:hover": {
                color: isDark ? "#fff" : "#000",
                border: isDark ? "1px solid #fff" : "1px solid #000",
              },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmDelete}
            sx={{
              color: "red", border: `1px solid red`,
              borderRadius: "40px",
              textTransform: "none",
              fontWeight: "bold",
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          severity={snackbarSeverity}
          onClose={() => setSnackbarOpen(false)}
          sx={{ width: "100%", marginTop: 15 }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Products;
