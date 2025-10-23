import React, { useEffect, useState, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  useTheme,
  Box,
  Tooltip,
  Stack,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddAlarmIcon from "@mui/icons-material/AddAlarm";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import {
  fetchReminderData,
  fetchCompanySubscriptionType,
} from "../../utils/reminder.jsx";
import { calculateDayDifference } from "../../utils/dateCalculation";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

// helper to format due dates with labels
const formatDueDate = (dueDateStr) => {
  const { diffInDays, formattedDate, isOverdue } = calculateDayDifference(dueDateStr);

  let label = "";
  if (diffInDays > 0) {
    label = `${diffInDays} day(s) left`;
  } else if (diffInDays === 0) {
    label = "Today";
  } else {
    label = `${Math.abs(diffInDays)} day(s) ago`;
  }

  return (
    <Box component="span">
      {formattedDate}{" "}
      <Box
        component="span"
        sx={{
          color: isOverdue ? "error.main" : "success.main",
          fontWeight: 600,
          fontSize: "0.85rem",
          ml: 0.5,
        }}
      >
        ({label})
      </Box>
    </Box>
  );
};

const ReminderModal = ({ open, onClose, onDataLoaded }) => {
  const theme = useTheme();
  const { palette } = theme;
  const isDark = palette.mode === "dark";
  const primaryColor = palette.primary.main;

  const [data, setData] = useState({ reminders: [], overdues: [] });
  const [tab, setTab] = useState(0);
  const [copiedId, setCopiedId] = useState(null);
  const [dueSortOrder, setDueSortOrder] = useState("asc");
  const [subscriptionType, setSubscriptionType] = useState("invoice");

  const isBill = subscriptionType === "bill";

  useEffect(() => {
    if (!open) return;
    fetchCompanySubscriptionType()
      .then((type) => {
        setSubscriptionType(type);
        return fetchReminderData(type);
      })
      .then(({ reminders = [], overdues = [] }) => {
        const recomputedOverdues = [];
        const recomputedReminders = [];
        [...reminders, ...overdues].forEach((item) => {
          const dueDateField = item.dueDate || item.due_date;
          const { diffInDays } = calculateDayDifference(dueDateField);
          if (diffInDays < 0) recomputedOverdues.push(item);
          else recomputedReminders.push(item);
        });
        setData({ overdues: recomputedOverdues, reminders: recomputedReminders });
        onDataLoaded?.(recomputedReminders, recomputedOverdues);
      })
      .catch((err) => console.error("Error fetching reminders:", err));
  }, [open, onDataLoaded]);

  const handleCopyNumber = (number, id) => {
    navigator.clipboard.writeText(number);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleSortOrder = () => setDueSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));

  const sortedRows = useMemo(() => {
    const rows = tab === 0 ? data.overdues : data.reminders;
    return [...rows].sort((a, b) => {
      const dateA = dayjs.utc(a.dueDate || a.due_date).startOf("day");
      const dateB = dayjs.utc(b.dueDate || b.due_date).startOf("day");
      return dueSortOrder === "asc" ? dateA.valueOf() - dateB.valueOf() : dateB.valueOf() - dateA.valueOf();
    });
  }, [data, tab, dueSortOrder]);

  const renderTable = (rows) => {
    const hasData = rows.length > 0;

    // Columns dynamically based on subscription type
    const headers = ["Action", isBill ? "Bill No" : "Invoice No", "Customer Name"];
    if (!isBill) headers.push("Email", "GST No.");
    headers.push("Phone", "Amount(₹)", "Advance(₹)", "Balance(₹)", "Due Date");

    return (
      <Box
        sx={{
          width: "100%",
          height: { xs: "390px", sm: "320px", md: "300px" },
          border: `2px ${hasData ? "solid" : "dashed"} ${primaryColor}`,
          borderRadius: 2,
          overflowY: hasData ? "auto" : "hidden",
          bgcolor: hasData ? "transparent" : isDark ? "grey.900" : "grey.100",
          display: "flex",
          alignItems: hasData ? "stretch" : "center",
          justifyContent: "start",
          flexDirection: "column",
          "&::-webkit-scrollbar": { width: "2px", height: "8px" },
          "&::-webkit-scrollbar-thumb": { backgroundColor: primaryColor, borderRadius: "10px" },
          "&::-webkit-scrollbar-track": { backgroundColor: isDark ? "#2c2c2c" : "#f0f0f0" },
        }}
      >
        {hasData ? (
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {headers.map((header) => (
                  <TableCell
                    key={header}
                    sx={{
                      backgroundColor: primaryColor,
                      fontWeight: "bold",
                      color: "#fff",
                      minWidth: header === (isBill ? "Bill No" : "Invoice No") || header === "Due Date" ? "160px" : "auto",
                      cursor: header === "Due Date" ? "pointer" : "default",
                    }}
                    align={header === "Action" ? "center" : "left"}
                    onClick={header === "Due Date" ? toggleSortOrder : undefined}
                  >
                    {header}
                    {header === "Due Date" &&
                      (dueSortOrder === "asc" ? (
                        <ArrowDownwardIcon fontSize="inherit" sx={{ ml: 1, fontSize: 16 }} />
                      ) : (
                        <ArrowUpwardIcon fontSize="inherit" sx={{ ml: 1, fontSize: 16 }} />
                      ))}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {rows.map((item) => {
                const key = item.invoice_id ? `inv-${item.invoice_id}` : item.bill_id ? `bill-${item.bill_id}` : Math.random();
                return (
                  <TableRow key={key}>
                    {/* Action */}
                    <TableCell align="center">
                      <Tooltip
                        title={copiedId === (item.invoice_id || item.bill_id) ? "Copied" : `Copy ${isBill ? "Bill" : "Invoice"} Number`}
                        arrow
                      >
                        <IconButton
                          size="small"
                          onClick={() => handleCopyNumber(item.invoice_number || item.bill_number, item.invoice_id || item.bill_id)}
                          sx={{ color: "gray", "&:hover": { color: primaryColor } }}
                        >
                          <ContentCopyIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>

                    {/* Number */}
                    <TableCell sx={{ fontWeight: "bold", minWidth: "160px" }}>{item.invoice_number || item.bill_number}</TableCell>

                    {/* Customer Name */}
                    <TableCell sx={{ fontWeight: "bold", minWidth: "200px" }}>{item.customer_name || "-"}</TableCell>

                    {/* Email & GST No - conditional */}
                    {!isBill && <TableCell>{item.customer_email || "-"}</TableCell>}
                    {!isBill && <TableCell>{item.customer_gst_no || "-"}</TableCell>}

                    {/* Phone */}
                    <TableCell>{item.mobile_no || item.customer_phone_no || "-"}</TableCell>

                    {/* Amount */}
                    <TableCell align="right" sx={{ fontWeight: "bold", color: primaryColor }}>{item.total_amount}</TableCell>

                    {/* Advance */}
                    <TableCell align="right" sx={{ fontWeight: "bold" }}>{item.advance_amount}</TableCell>

                    {/* Balance */}
                    <TableCell align="right" sx={{ fontWeight: "bold", color: "error.main" }}>{(item.total_amount - item.advance_amount).toFixed(2)}</TableCell>

                    {/* Due Date */}
                    <TableCell sx={{ minWidth: "200px" }}>{formatDueDate(item.dueDate || item.due_date)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <>
            <HourglassEmptyIcon sx={{ fontSize: 48, mb: 1, color: primaryColor, mt: 8 }} />
            <Typography variant="subtitle1" fontWeight="bold">No data available</Typography>
            <Typography variant="body2">You're all caught up!</Typography>
          </>
        )}
      </Box>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={false}
      PaperProps={{
        sx: {
          width: { xs: "95%", sm: "90%", md: "85%", lg: "80%" },
          height: { xs: "80vh", sm: "70vh", md: "65vh" },
          display: "flex",
          flexDirection: "column",
          border: `2px solid ${primaryColor}`,
          boxShadow: `0 0 10px ${primaryColor}`,
          borderRadius: "10px",
          backgroundColor: isDark ? "#000" : "#fff",
        },
      }}
    >
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <AddAlarmIcon sx={{ color: primaryColor }} />
          <Typography variant="h6" sx={{ color: primaryColor, fontWeight: "bold" }}>
            {isBill ? "Bill Notifications" : "Invoice Notifications"}
          </Typography>
        </Stack>
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ flexGrow: 1, display: "flex", flexDirection: "column", gap: 2, p: 2 }}>
        <Box sx={{ display: "flex", ml: -5, mt: -1.5 }}>
          <Tabs value={tab} onChange={(e, v) => setTab(v)} variant="scrollable" scrollButtons allowScrollButtonsMobile>
            <Tab label={`Overdues (${data.overdues.length})`} sx={{ fontWeight: "bold", textTransform: "none" }} />
            <Tab label={`Reminders (${data.reminders.length})`} sx={{ fontWeight: "bold", textTransform: "none" }} />
          </Tabs>
        </Box>

        <Typography variant="body2" sx={{ ml: 1, mt: 0, color: "text.secondary" }}>
          (Copy {isBill ? "Bill" : "Invoice"} number and search it in the Party Master page)
        </Typography>

        {renderTable(sortedRows)}
      </DialogContent>
    </Dialog>
  );
};

export default ReminderModal;
