// components/FilterCollapse.jsx
import React from "react";
import {
  Box,
  Collapse,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";

export default function FilterCollapse({
  showFilters,
  selectedMonth,
  selectedYear,
  setSelectedMonth,
  setSelectedYear,
}) {
  const theme = useTheme();
  const primaryColor = theme.palette.primary.main;
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Collapse in={showFilters}>
      <Box
        sx={{
          px: isMobile ? 1 : 2,
          py: 2,
          mb: 2,
          border: `1px solid ${primaryColor}`,
          borderRadius: 2,
          backgroundColor: "background.default",
          boxShadow: 1,
        }}
      >
        <Stack
          spacing={2}
          justifyContent="space-between"
          flexWrap="wrap"
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "flex-start", sm: "center" },
          }}
        >
          {/* Left Label */}
          <Box
            sx={{
              minWidth: 120,
              fontWeight: "bold",
              color: primaryColor,
            }}
          >
            Filter Options
          </Box>

          {/* Filters */}
          <Stack
            direction={{ xs: "row", sm: "row" }}
            spacing={1}
            alignItems="center"
            justifyContent="flex-end"
            flexWrap="wrap"
            rowGap={1.5}
          >
            {/* Month Dropdown */}
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel id="month-label">Month</InputLabel>
              <Select
                labelId="month-label"
                value={selectedMonth}
                label="Month"
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                {[
                  "January",
                  "February",
                  "March",
                  "April",
                  "May",
                  "June",
                  "July",
                  "August",
                  "September",
                  "October",
                  "November",
                  "December",
                ].map((m, idx) => (
                  <MenuItem key={idx + 1} value={idx + 1}>
                    {m}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Year Dropdown */}
            <FormControl size="small" sx={{ minWidth: 80 }}>
              <InputLabel id="year-label">Year</InputLabel>
              <Select
                labelId="year-label"
                value={selectedYear}
                label="Year"
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                {Array.from({ length: 5 }, (_, i) => {
                  const yr = new Date().getFullYear() - i;
                  return (
                    <MenuItem key={yr} value={yr}>
                      {yr}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>

            {/* Clear Button */}
            <Button
              variant="outlined"
              onClick={() => setSelectedMonth("")}
              sx={{
                height: 40,
                px: 1,
                whiteSpace: "nowrap",
                borderRadius: 2,
                textTransform: "none",
                fontWeight: "bold",
                alignSelf: { xs: "flex-start", sm: "center" },
                mt: { xs: 1, sm: 0 },
              }}
            >
              Clear
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Collapse>
  );
}
