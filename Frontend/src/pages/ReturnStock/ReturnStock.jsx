import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Tooltip,
  CircularProgress,
  Snackbar,
  Alert,
} from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
import axios from 'axios';
import API_BASE_URL from '../../Context/Api';

// Utility to get user and token from localStorage
const getUserAndToken = () => {
  const user = localStorage.getItem('user');
  const token = localStorage.getItem('authToken') || (JSON.parse(user || '{}').token);
  return {
    user: user ? JSON.parse(user) : null,
    authToken: token,
  };
};

const initialFormState = {
  address_name: '',
  address: '',
  cell_no1: '',
  cell_no2: '',
  gst_no: '',
  pan_no: '',
  account_name: '',
  bank_name: '',
  branch_name: '',
  ifsc_code: '',
  account_number: '',
  email: '',
  website: '',
};

const BillingAddressManager = ({ companyId, authToken }) => {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState(initialFormState);
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Fetch billing addresses
  const fetchAddresses = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/address/${companyId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setAddresses(res.data);
    } catch (err) {
      console.error('Failed to load billing addresses:', err);
      setSnackbar({ open: true, message: 'Failed to load billing addresses', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, [companyId]);

  // Open modal for new entry
  const handleAdd = () => {
    setFormData(initialFormState);
    setEditId(null);
    setModalOpen(true);
  };

  // Open modal with existing data for edit
  const handleEdit = (address) => {
    setFormData({
      address_name: address.address_name || '',
      address: address.address || '',
      cell_no1: address.cell_no1 || '',
      cell_no2: address.cell_no2 || '',
      gst_no: address.gst_no || '',
      pan_no: address.pan_no || '',
      account_name: address.account_name || '',
      bank_name: address.bank_name || '',
      branch_name: address.branch_name || '',
      ifsc_code: address.ifsc_code || '',
      account_number: address.account_number || '',
      email: address.email || '',
      website: address.website || '',
    });
    setEditId(address.billing_address_id);
    setModalOpen(true);
  };

  // Delete confirmation open
  const handleDeleteClick = (id) => {
    setDeleteId(id);
    setConfirmDeleteOpen(true);
  };

  // Confirm delete
  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/address/${deleteId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setSnackbar({ open: true, message: 'Billing address deleted', severity: 'success' });
      setConfirmDeleteOpen(false);
      setDeleteId(null);
      fetchAddresses();
    } catch (err) {
      console.error('Delete failed:', err);
      setSnackbar({ open: true, message: 'Failed to delete billing address', severity: 'error' });
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((d) => ({ ...d, [name]: value }));
  };

  // Submit create or update
  const handleSubmit = async () => {
    if (!formData.address_name.trim() || !formData.address.trim()) {
      setSnackbar({ open: true, message: 'Address Name and Address are required.', severity: 'warning' });
      return;
    }
    try {
      if (editId) {
        await axios.put(`${API_BASE_URL}/api/address/${editId}`, formData, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        setSnackbar({ open: true, message: 'Billing address updated', severity: 'success' });
      } else {
        await axios.post(
          `${API_BASE_URL}/api/address`,
          { ...formData, company_id: companyId },
          {
            headers: { Authorization: `Bearer ${authToken}` },
          }
        );
        setSnackbar({ open: true, message: 'Billing address added', severity: 'success' });
      }
      setModalOpen(false);
      fetchAddresses();
    } catch (err) {
      console.error('Save failed:', err);
      setSnackbar({ open: true, message: 'Failed to save billing address', severity: 'error' });
    }
  };

  return (
    <Box sx={{ maxWidth: 1000, margin: 'auto', p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Billing Addresses Management
      </Typography>
      <Button variant="contained" color="primary" onClick={handleAdd} sx={{ mb: 2 }}>
        + Add Billing Address
      </Button>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} elevation={6}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Address Name</TableCell>
                <TableCell>Address</TableCell>
                <TableCell>Phone 1</TableCell>
                <TableCell>Phone 2</TableCell>
                <TableCell>GST No.</TableCell>
                <TableCell>PAN No.</TableCell>
                <TableCell>Bank Name</TableCell>
                <TableCell>IFSC Code</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {addresses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 3 }}>
                    No billing addresses found.
                  </TableCell>
                </TableRow>
              ) : (
                addresses.map((addr) => (
                  <TableRow key={addr.billing_address_id}>
                    <TableCell>{addr.address_name}</TableCell>
                    <TableCell
                      sx={{
                        maxWidth: 250,
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                      }}
                      title={addr.address}
                    >
                      {addr.address}
                    </TableCell>
                    <TableCell>{addr.cell_no1}</TableCell>
                    <TableCell>{addr.cell_no2}</TableCell>
                    <TableCell>{addr.gst_no}</TableCell>
                    <TableCell>{addr.pan_no}</TableCell>
                    <TableCell>{addr.bank_name}</TableCell>
                    <TableCell>{addr.ifsc_code}</TableCell>
                    <TableCell align="center">
                      <Tooltip title="Edit">
                        <IconButton color="primary" onClick={() => handleEdit(addr)}>
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton color="error" onClick={() => handleDeleteClick(addr.billing_address_id)}>
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Modal for add/edit */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editId ? 'Edit Billing Address' : 'Add Billing Address'}</DialogTitle>
        <DialogContent dividers>
          <Box
            component="form"
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))',
              gap: 2,
            }}
            noValidate
            autoComplete="off"
          >
            <TextField
              label="Address Name *"
              name="address_name"
              value={formData.address_name}
              onChange={handleInputChange}
              required
              fullWidth
            />
            <TextField
              label="Address *"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              required
              multiline
              minRows={2}
              fullWidth
            />
            <TextField label="Cell No 1" name="cell_no1" value={formData.cell_no1} onChange={handleInputChange} />
            <TextField label="Cell No 2" name="cell_no2" value={formData.cell_no2} onChange={handleInputChange} />
            <TextField label="GST No" name="gst_no" value={formData.gst_no} onChange={handleInputChange} />
            <TextField label="PAN No" name="pan_no" value={formData.pan_no} onChange={handleInputChange} />
            <TextField label="Account Name" name="account_name" value={formData.account_name} onChange={handleInputChange} />
            <TextField label="Bank Name" name="bank_name" value={formData.bank_name} onChange={handleInputChange} />
            <TextField label="Branch Name" name="branch_name" value={formData.branch_name} onChange={handleInputChange} />
            <TextField label="IFSC Code" name="ifsc_code" value={formData.ifsc_code} onChange={handleInputChange} />
            <TextField label="Account Number" name="account_number" value={formData.account_number} onChange={handleInputChange} />
            <TextField label="Email" name="email" value={formData.email} onChange={handleInputChange} />
            <TextField label="Website" name="website" value={formData.website} onChange={handleInputChange} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>
            {editId ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={confirmDeleteOpen} onClose={() => setConfirmDeleteOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent dividers>
          <Typography>Are you sure you want to delete this billing address?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDeleteConfirm}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for messages */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

const BillingAddressManagerWrapper = () => {
  const { user, authToken } = getUserAndToken();

  const companyId = user?.tenant_id;

  if (!companyId) {
    return <div>Please login or select a company to manage billing addresses.</div>;
  }

  return <BillingAddressManager companyId={companyId} authToken={authToken} />;
};

export default BillingAddressManagerWrapper;
