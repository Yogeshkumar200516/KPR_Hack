import React from "react";
import {
  Grid,
  Card,
  CardContent,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";

const safeToLocaleString = (value) => {
  const num = Number(value);
  return !isNaN(num) ? num.toLocaleString() : "-";
};

export default function GSTSummaryCards({ summary }) {
  const theme = useTheme();
  const primaryColor = theme.palette.primary.main;
  const isDark = theme.palette.mode === "dark";
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const subscriptionType = localStorage.getItem("subscriptionType");

  // Get subscriptionType from prop, or fallback to localStorage

  if (!summary) {
    return (
      <Grid item xs={12}>
        <Typography align="center" color="text.secondary">
          No summary data found.
        </Typography>
      </Grid>
    );
  }

  // Choose correct singular/plural and field names for bill/invoice
  const totalDocLabel = subscriptionType === "bill" ? "Total Bills" : "Total Invoices";
  const totalDocValue =
    subscriptionType === "bill"
      ? summary.total_bills
      : summary.total_invoices;

  const avgDocLabel =
    subscriptionType === "bill" ? "Avg Bill Value" : "Avg Invoice Value";
  const avgDocValue =
    subscriptionType === "bill"
      ? summary.avg_bill_value
      : summary.avg_invoice_value;

  const cards = [
    { label: "Total Sales", value: summary.total_sales, prefix: "₹" },
    { label: "Total GST", value: summary.total_gst, prefix: "₹" },
    { label: "Total Discounts", value: summary.total_discount, prefix: "₹" },
    { label: "Transport Charges", value: summary.total_transport, prefix: "₹" },
    { label: totalDocLabel, value: totalDocValue },
    { label: "Total Products Sold", value: summary.total_products_sold },
  ];

  return (
    <Grid container spacing={1} mb={4}>
      {cards.map(({ label, value, prefix }, i) => (
        <Grid
          key={i}
          item
          xs={6}
          sm={6}
          md={4}
          lg={3}
          sx={{
            "@media (max-width:500px)": {
              flexBasis: "100%",
              maxWidth: "100%",
            },
            display: "flex",
          }}
        >
          <Card
            elevation={4}
            sx={{
              height: "100%",
              width: { xs: "100%", sm: "180px" },
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              borderRadius: 2,
              backgroundColor: "background.paper",
              border: `1px solid ${primaryColor}`,
              transition: "transform 0.3s ease, box-shadow 0.3s ease",
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: `0 6px 20px ${primaryColor}`,
              },
            }}
          >
            <CardContent>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
                sx={{
                  fontSize: { xs: "0.8rem", sm: "0.9rem" },
                  fontWeight: 500,
                }}
              >
                {label}
              </Typography>
              <Typography
                variant="h6"
                fontWeight="bold"
                sx={{
                  fontSize: { xs: "1.1rem", sm: "1.4rem" },
                  color: isDark ? "#fff" : "#4a4a49",
                }}
              >
                {prefix ?? ""}
                {safeToLocaleString(value)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
