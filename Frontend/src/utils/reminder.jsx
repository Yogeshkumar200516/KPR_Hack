import axios from "axios";
import API_BASE_URL from "../Context/Api";
import { calculateDayDifference } from "./dateCalculation";

const getAuthHeaders = () => {
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Fetch company subscription type (invoice | bill | both)
export const fetchCompanySubscriptionType = async () => {
  try {
    const res = await axios.get(`${API_BASE_URL}/api/company/info`, {
      headers: getAuthHeaders(),
    });
    return res.data.subscription_type || "invoice";
  } catch (err) {
    console.error("🔴 Error fetching company info:", err);
    return "invoice";
  }
};

// Fetch reminder data (overdue + reminders for today, 1 day, 2 days)
export const fetchReminderData = async () => {
  try {
    const subscriptionType = await fetchCompanySubscriptionType();

    let url = "";
    if (subscriptionType === "bill") {
      url = `${API_BASE_URL}/api/reminder/check-bill-reminder-status`;
    } else {
      url = `${API_BASE_URL}/api/reminder/check-reminder-status`;
    }

    const res = await axios.get(url, { headers: getAuthHeaders() });
    const { reminders: rawReminders = [], overdues: rawOverdues = [] } = res.data;

    const recomputedReminders = [];
    const recomputedOverdues = [];

    [...rawReminders, ...rawOverdues].forEach((item) => {
      const dueDateField = item.dueDate || item.due_date;
      const { diffInDays } = calculateDayDifference(dueDateField);

      if (diffInDays < 0) {
        recomputedOverdues.push(item); // past due
      } else if (diffInDays <= 2 && diffInDays >= 0) {
        recomputedReminders.push(item); // today, 1 day, 2 days away
      }
    });

    return {
      reminders: recomputedReminders,
      overdues: recomputedOverdues,
      subscriptionType,
    };
  } catch (err) {
    console.error("🔴 Error fetching reminder data:", err);
    return { reminders: [], overdues: [], subscriptionType: "invoice" };
  }
};
