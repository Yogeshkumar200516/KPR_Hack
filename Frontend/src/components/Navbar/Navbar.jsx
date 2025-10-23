import React, { useState, useEffect, useContext } from "react";
import { styled, useTheme } from "@mui/material/styles";
import { Link, useLocation } from "react-router-dom";
import Box from "@mui/material/Box";
import MuiDrawer from "@mui/material/Drawer";
import MuiAppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Grid from "@mui/material/Grid";
import Tooltip from "@mui/material/Tooltip";
import List from "@mui/material/List";
import Button from "@mui/material/Button";
import CssBaseline from "@mui/material/CssBaseline";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import MenuOpenRoundedIcon from "@mui/icons-material/MenuOpenRounded";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import useMediaQuery from "@mui/material/useMediaQuery";
import logo from "../../assets/images/logo2.svg";
import Login from "../Login/Login";
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import { ColorModeContext } from "../../Context/ThemeContext.jsx";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import Diversity1OutlinedIcon from "@mui/icons-material/Diversity1Outlined";
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined';
import Badge from "@mui/material/Badge";
import ReminderModal from "../Notification/Notification.jsx";
import API_BASE_URL from "../../Context/Api.jsx";
import { fetchReminderData } from "../../utils/reminder.jsx";
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import AddBusinessOutlinedIcon from '@mui/icons-material/AddBusinessOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import ManageHistoryOutlinedIcon from '@mui/icons-material/ManageHistoryOutlined';

const drawerWidth = 240;

const openedMixin = (theme) => ({
  width: drawerWidth,
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: "hidden",
});

const closedMixin = (theme) => ({
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: "hidden",
  width: `calc(${theme.spacing(7)} + 1px)`,
  [theme.breakpoints.up("sm")]: {
    width: `calc(${theme.spacing(8)} + 1px)`,
  },
});

const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: theme.spacing(0, 2),
  ...theme.mixins.toolbar,
}));

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== "open",
})(({ theme, open }) => {
  const borderColor = theme.palette.mode === "dark" ? "#333" : "#e0e0e0"; // or use `theme.palette.divider`

  return {
    zIndex: theme.zIndex.drawer + 1,
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.primary,
    boxShadow: "none",
    backdropFilter: "none",
    backgroundImage: "none",
    borderBottom: `1px solid ${borderColor}`,
    transition: theme.transitions.create(["width", "margin"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    ...(open && {
      marginLeft: drawerWidth,
      width: `calc(100% - ${drawerWidth}px)`,
      transition: theme.transitions.create(["width", "margin"], {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.enteringScreen,
      }),
    }),
  };
});

const Drawer = styled(MuiDrawer, {
  shouldForwardProp: (prop) => prop !== "open",
})(({ theme, open }) => {
  const borderColor = theme.palette.mode === "dark" ? "#2d2e2d" : "#ddd"; // customize as needed

  return {
    width: drawerWidth,
    flexShrink: 0,
    whiteSpace: "nowrap",
    boxSizing: "border-box",
    ...(open
      ? {
          ...openedMixin(theme),
          "& .MuiDrawer-paper": {
            ...openedMixin(theme),
            backgroundColor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            borderRight: `1px solid ${borderColor}`,
          },
        }
      : {
          ...closedMixin(theme),
          "& .MuiDrawer-paper": {
            ...closedMixin(theme),
            backgroundColor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            borderRight: `1px solid ${borderColor}`,
          },
        }),
  };
});



function Navbar({ user, onLogout, open, variant, setOpen, handleDrawerToggle }) {
  const theme = useTheme();
  const location = useLocation();
  const isXLarge = useMediaQuery("(min-width:1200px)");
  const isSmall = useMediaQuery("(max-width:600px)");
  const isMedium = useMediaQuery("(min-width:600px) and (max-width:1200px)");
  const subscriptionType = localStorage.getItem("subscriptionType");
  const colorMode = useContext(ColorModeContext);

  const pages = [
  {
    text: "Dashboard",
    icon: <DashboardOutlinedIcon />,
    path: "/",
    roles: ["admin"],
  },
  {
    text: subscriptionType === "bill" ? "Product Billing" : "GST Invoice",
    icon: <ReceiptLongRoundedIcon />,
    path: "/gst-invoice",
    roles: ["admin", "cashier", "sales"],
  },
  {
    text: "Party Master",
    icon: <Diversity1OutlinedIcon />,
    path: "/party-master",
    roles: ["admin", "cashier", "sales"],
  },
  {
    text: "Products & Stock",
    icon: <Inventory2RoundedIcon />,
    path: "/products",
    roles: ["admin", "sales"],
  },
  {
    text: "Add Companies",
    icon: <AddBusinessOutlinedIcon />,
    path: "/add-company",
    roles: ["super_admin"],
  },
  {
    text: "Add Users",
    icon: <GroupAddIcon />,
    path: "/add-admin",
    roles: ["super_admin"],
  },
  {
    text: "Access Control",
    icon: <AdminPanelSettingsOutlinedIcon />,
    path: "/add-superadmin",
    roles: ["super_admin"],
  },
  {
    text: "Return Stock",
    icon: <ManageHistoryOutlinedIcon />,
    path: "/return-stock",
    roles: ["super_admin"],
  },
  {
    text: subscriptionType === "bill" ? "Manage User" : "User & Billing",
    icon: <GroupAddIcon />,
    path: "/admin-access",
    roles: ["admin"],
  },
];

  const [badgeCount, setBadgeCount] = useState(0);
const [openModal, setOpenModal] = useState(false);

// Fetch badge count on page load and periodically
  useEffect(() => {
  let isMounted = true; // to avoid state updates when unmounted
  let failureCount = 0;
  const MAX_FAILURES = 3;

  const fetchAndUpdateBadge = async () => {
    try {
      const { reminders, overdues } = await fetchReminderData();
      if (isMounted) {
        setBadgeCount(reminders.length + overdues.length);
      }
      failureCount = 0; // reset failure count on success
    } catch (error) {
      failureCount++;
      console.error("Failed to fetch reminders:", error);
      if (failureCount >= MAX_FAILURES) {
        // optional: stop polling after MAX_FAILURES
        clearInterval(intervalId);
      }
    }
  };

  fetchAndUpdateBadge();
  const intervalId = setInterval(fetchAndUpdateBadge, 15000); // poll every 15 seconds

  return () => {
    isMounted = false;
    clearInterval(intervalId);
  };
}, []);

  const handleOpen = () => {
    setOpenModal(true); // open modal only
  };

  const handleClose = () => {
    setOpenModal(false);
  };

  const handleDataLoaded = (reminders, overdues) => {
    setBadgeCount(reminders.length + overdues.length); // update badge again if needed
  };

  // Filter pages based on role
  const filteredPages = pages.filter((page) => {
    return user && user.role && page.roles.includes(user.role);
  });

  // Set drawer type (responsive)
  useEffect(() => {
    if (isSmall) {
      setOpen(false);
    } else if (isXLarge) {
      setOpen(true);
    } else if (isMedium) {
      setOpen(false);
    }
  }, [isSmall, isXLarge, isMedium, setOpen]);

 

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <AppBar position="fixed" open={open && variant === "permanent"}>
  <Toolbar sx={{ justifyContent: "space-between" }}>
    {/* Left - Logo and Drawer toggle */}
    <Box sx={{ display: "flex", alignItems: "center" }}>
      {!open && (
        <>
          <IconButton
            onClick={handleDrawerToggle}
            edge="start"
            sx={{ mr: { xs: 0, sm: 2 } }}
          >
            <MenuOpenRoundedIcon
              sx={{
                fontSize: "30px",
                color: theme.palette.text.secondary,
                "&:hover": { color: theme.palette.text.primary },
              }}
            />
          </IconButton>
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{
              color: theme.palette.text.primary,
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontFamily: "'Diphylleia', serif",
              fontWeight: 900,
              fontSize: { xs: "1.1rem", sm: "1.25rem" },
            }}
          >
            <img
              src={logo}
              alt="Billing Software Logo"
              style={{
                width: "34px",
                height: "34px",
                objectFit: "contain",
              }}
            />
            Mahesha Bills
          </Typography>
        </>
      )}
    </Box>

    {/* Right - Theme toggle, Notification, User Info and Logout Button */}
    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
      {/* Theme toggle button */}
      <Tooltip title="Toggle Theme" arrow>
        <IconButton
          onClick={colorMode.toggleColorMode}
          sx={{
            color: theme.palette.mode === "dark" ? "#00bcd4" : "#136919",
          }}
        >
          {theme.palette.mode === "dark" ? (
            <LightModeOutlinedIcon />
          ) : (
            <DarkModeOutlinedIcon />
          )}
        </IconButton>
      </Tooltip>

      {/* Notification Icon */}
      <Tooltip title="Notifications" arrow>
  <IconButton onClick={handleOpen} sx={{ color: theme.palette.primary.main }}>
    <Badge badgeContent={badgeCount} color="error">
      <NotificationsActiveOutlinedIcon />
    </Badge>
  </IconButton>
</Tooltip>

      {/* User Greeting - hidden on xs */}
      {user && (
        <Typography
          variant="h6"
          sx={{
            color: theme.palette.text.primary,
            fontWeight: "bold",
            display: { xs: "none", sm: "flex" },
            fontSize: "1.1rem",
            textShadow: "0 1px 2px rgba(0,0,0,0.3)",
            letterSpacing: "0.5px",
          }}
        >
          Welcome, {user.first_name || "User"}
        </Typography>
      )}

      {/* Logout Button - visible only on sm and up */}
      {user && (
        <Button
          onClick={() => {
            onLogout();
            navigate("/login");
          }}
          variant="outlined"
          sx={{
            display: { xs: "none", sm: "inline-flex" }, // Hides on XS
            color: theme.palette.mode === "dark" ? "#00bcd4" : "#136919",
            borderColor:
              theme.palette.mode === "dark" ? "#00bcd4" : "#136919",
            borderRadius: "30px",
            textTransform: "none",
            px: 3,
            fontWeight: "bold",
            fontSize: "0.9rem",
            transition: "all 0.3s ease",
            "&:hover": {
              backgroundColor:
                theme.palette.mode === "dark" ? "#444f4e" : "#bdf9c0",
              boxShadow:
                theme.palette.mode === "dark"
                  ? "0 0 8px #00bcd4"
                  : "0 0 8px rgb(13, 119, 33)",
            },
          }}
        >
          Logout
        </Button>
      )}
    </Box>
  </Toolbar>
</AppBar>

      {variant === "temporary" ? (
        <MuiDrawer
  variant="temporary"
  open={open}
  onClose={() => setOpen(false)}
  ModalProps={{ keepMounted: true }}
  sx={{
    zIndex: theme.zIndex.drawer + 2,
    "& .MuiDrawer-paper": {
      width: drawerWidth,
      backgroundColor: theme.palette.background.paper,
      color: theme.palette.text.primary,
      boxShadow: "none",
      backdropFilter: "none",
      backgroundImage: "none",
    },
  }}
>
  {/* Header */}
  <DrawerHeader>
    <Typography
      variant="h6"
      noWrap
      component="div"
      sx={{
        color: theme.palette.text.primary,
        display: "flex",
        alignItems: "center",
        gap: "10px",
        fontFamily: "'Diphylleia', serif",
        fontWeight: 900,
        fontSize: "1.25rem",
      }}
    >
      <img
        src={logo}
        alt="Music Player Logo"
        style={{
          width: "34px",
          height: "34px",
          objectFit: "contain",
        }}
      />
      Mahesha Bills
    </Typography>
    <IconButton onClick={handleDrawerToggle}>
      <MenuOpenRoundedIcon sx={{ fontSize: "30px", color: "#fff" }} />
    </IconButton>
  </DrawerHeader>

  {/* Navigation Items */}
  <List>
    {filteredPages.map(({ text, icon, path }) => {
      const isActive = location.pathname === path;
      return (
        <ListItem key={text} disablePadding sx={{ display: "block" }}>
          <ListItemButton
            component={Link}
            to={path}
            onClick={() => setOpen(false)}
            sx={{
              fontWeight: "bold",
              justifyContent: open ? "initial" : "center",
              px: 2.5,
              backgroundColor: isActive
                ? theme.palette.action.selected
                : "transparent",
              color: isActive
                ? theme.palette.primary.main
                : theme.palette.text.primary,
              "&:hover": {
                backgroundColor: theme.palette.action.hover,
              },
            }}
          >
            <ListItemIcon
              sx={{
                justifyContent: "center",
                minWidth: 0,
                mr: open ? 3 : "auto",
                color: isActive
                  ? theme.palette.primary.main
                  : theme.palette.text.secondary,
                fontWeight: "bold",
              }}
            >
              {React.cloneElement(icon, { sx: { fontWeight: "bold" } })}
            </ListItemIcon>
            <ListItemText
              primary={text}
              sx={{ opacity: open ? 1 : 0, fontWeight: "bold" }}
              primaryTypographyProps={{ fontWeight: "bold" }}
            />
          </ListItemButton>
        </ListItem>
      );
    })}
  </List>

  {/* Footer with Logout button on XS only */}
  <Box
    sx={{
      mt: "auto",
      p: 2,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 1,
      borderTop: `1px solid ${theme.palette.divider}`,
      backgroundColor: theme.palette.background.paper,
    }}
  >
    {/* Only visible on XS */}
    {user && (
      <Button
        onClick={() => {
          onLogout();
          navigate("/login");
        }}
        fullWidth
        variant="outlined"
        sx={{
          display: { xs: "inline-flex", sm: "none" },
          color: theme.palette.mode === "dark" ? "#00bcd4" : "#136919",
          borderColor:
            theme.palette.mode === "dark" ? "#00bcd4" : "#136919",
          borderRadius: "30px",
          textTransform: "none",
          fontWeight: "bold",
          fontSize: "0.9rem",
          mb: 1,
          transition: "all 0.3s ease",
          "&:hover": {
            backgroundColor:
              theme.palette.mode === "dark" ? "#444f4e" : "#bdf9c0",
            boxShadow:
              theme.palette.mode === "dark"
                ? "0 0 8px #00bcd4"
                : "0 0 8px rgb(13, 119, 33)",
          },
        }}
      >
        Logout
      </Button>
    )}

    <img
      src={logo}
      alt="Company Logo"
      style={{ width: 30, height: 30, objectFit: "contain" }}
    />
    <Grid sx={{ lineHeight: 1 }}>
      <Typography
        sx={{
          textAlign: "center",
          fontSize: "12px",
          fontWeight: "bold",
          color: theme.palette.text.secondary,
        }}
      >
        Developed by
      </Typography>
      <Typography
        variant="caption"
        sx={{ color: theme.palette.text.secondary }}
      >
        © Mahesha Corporations Pvt Ltd
      </Typography>
    </Grid>
  </Box>
</MuiDrawer>
      ) : (
        <Drawer variant="permanent" open={open}>
          <DrawerHeader>
            <Typography
              variant="h6"
              noWrap
              sx={{
                color: theme.palette.text.primary,
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontFamily: "'Diphylleia', serif",
                fontWeight: 900,
                fontSize: "1.18rem",
              }}
            >
              <img
                src={logo}
                alt="Music Player Logo"
                style={{
                  width: "34px",
                  height: "34px",
                  objectFit: "contain",
                }}
              />
              Mahesha Bills
            </Typography>
            <IconButton onClick={handleDrawerToggle}>
              <ChevronLeftIcon sx={{ color: "#aaa" }} />
            </IconButton>
          </DrawerHeader>
          <List>
            {filteredPages.map(({ text, icon, path }) => {
              const isActive = location.pathname === path;
              return (
                <ListItem key={text} disablePadding sx={{ display: "block" }}>
                  <ListItemButton
                    component={Link}
                    to={path}
                    sx={{
                      justifyContent: open ? "initial" : "center",
                      px: 2.5,
                      backgroundColor: isActive
                        ? theme.palette.action.selected
                        : "transparent",
                      color: isActive
                        ? theme.palette.primary.main
                        : theme.palette.primary.second,
                      "&:hover": {
                        backgroundColor: theme.palette.action.hover,
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        justifyContent: "center",
                        minWidth: 0,
                        mr: open ? 3 : "auto",
                        color: isActive
                          ? theme.palette.primary.main
                          : theme.palette.text.secondary,
                      }}
                      primaryTypographyProps={{
                        fontWeight: "bold",
                      }}
                    >
                      {icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={text}
                      primaryTypographyProps={{
                        fontWeight: "bold",
                        sx: { opacity: open ? 1 : 0 },
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
          <Box
            sx={{
              mt: "auto",
              p: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: open ? "flex-start" : "center",
              gap: 1,
              borderTop: `1px solid ${theme.palette.divider}`,
              backgroundColor: theme.palette.background.paper,
            }}
          >
            <img
              src={logo}
              alt="Company Logo"
              style={{
                width: 30,
                height: 30,
                objectFit: "contain",
              }}
            />
            {open && (
              <Grid sx={{ lineHeight: 1 }}>
                <Typography
                  sx={{
                    textAlign: "center",
                    fontSize: "12px",
                    fontWeight: "bold",
                    color: theme.palette.text.secondary,
                  }}
                >
                  Developed by
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: theme.palette.text.secondary }}
                >
                  © Mahesha Corporations
                </Typography>
              </Grid>
            )}
          </Box>
        </Drawer>
      )}
      <ReminderModal
        open={openModal}
        onClose={handleClose}
        onDataLoaded={handleDataLoaded}
      />
    </Box>
  );
}

export default Navbar;
