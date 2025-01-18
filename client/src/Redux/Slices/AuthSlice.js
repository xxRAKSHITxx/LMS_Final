import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import toast from "react-hot-toast";
import { axiosInstance } from "../../Helpers/axiosInstance";

// Safe JSON parsing function
const safeJSONParse = (str, defaultValue = null) => {
  try {
    return str ? JSON.parse(str) : defaultValue;
  } catch (error) {
    console.error("JSON parsing error:", error);
    return defaultValue;
  }
};

const initialState = {
  isLoggedIn: !!localStorage.getItem("token"),
  role: safeJSONParse(localStorage.getItem("userData"), {})?.role || "USER",
  data: safeJSONParse(localStorage.getItem("userData"), {}) || null,
};

// Thunks
export const createAccount = createAsyncThunk("/auth/signup", async (data) => {
  const loadingMessage = toast.loading("Please wait! Creating your account...");
  try {
    const res = await axiosInstance.post("/user/register", data);
    toast.success(res?.data?.message, { id: loadingMessage });
    return res?.data;
  } catch (error) {
    toast.error(error?.response?.data?.message, { id: loadingMessage });
    throw error;
  }
});

export const login = createAsyncThunk("/auth/login", async (data, { rejectWithValue }) => {
  const loadingMessage = toast.loading("Logging in...");
  try {
    const response = await axiosInstance.post("/user/login", data);

    if (response.data && response.data.user) {
      localStorage.setItem("token", response.data.token || "");
      localStorage.setItem("userData", JSON.stringify(response.data.user));
      toast.success(response.data.message, { id: loadingMessage });
      return response.data;
    } else {
      toast.error("Invalid response from server", { id: loadingMessage });
      return rejectWithValue("Invalid response");
    }
  } catch (error) {
    console.error("Login Error:", error);
    toast.error(error?.response?.data?.message || "Login failed", { id: loadingMessage });
    return rejectWithValue(error.response?.data || "Login failed");
  }
});

export const logout = createAsyncThunk("/auth/logout", async (_, { rejectWithValue }) => {
  const loadingMessage = toast.loading("Logging out...");
  try {
    const response = await axiosInstance.get("/user/logout");
    localStorage.removeItem("token");
    localStorage.removeItem("userData");
    toast.success(response?.data?.message, { id: loadingMessage });
    return response.data;
  } catch (error) {
    console.error("Logout Error:", error);
    toast.error(error?.response?.data?.message || "Logout failed", { id: loadingMessage });
    return rejectWithValue(error.response?.data || "Logout failed");
  }
});

export const getUserData = createAsyncThunk("/auth/user/me", async () => {
  const loadingMessage = toast.loading("Fetching profile...");
  try {
    const res = await axiosInstance.get("/user/me");
    toast.success(res?.data?.message, { id: loadingMessage });
    return res?.data;
  } catch (error) {
    toast.error(error?.response?.data?.message, { id: loadingMessage });
    throw error;
  }
});

export const updateUserData = createAsyncThunk("/auth/user/me", async (data) => {
  const loadingMessage = toast.loading("Updating changes...");
  try {
    const res = await axiosInstance.post(`/user/update/${data.id}`, data.formData);
    toast.success(res?.data?.message, { id: loadingMessage });
    return res?.data;
  } catch (error) {
    toast.error(error?.response?.data?.message, { id: loadingMessage });
    throw error;
  }
});

export const changePassword = createAsyncThunk("/auth/user/changePassword", async (userPassword) => {
  const loadingMessage = toast.loading("Changing password...");
  try {
    const res = await axiosInstance.post("/user/change-password", userPassword);
    toast.success(res?.data?.message, { id: loadingMessage });
    return res?.data;
  } catch (error) {
    toast.error(error?.response?.data?.message, { id: loadingMessage });
    throw error;
  }
});

export const forgetPassword = createAsyncThunk("auth/user/forgetPassword", async (email) => {
  const loadingMessage = toast.loading("Please Wait! Sending email...");
  try {
    const res = await axiosInstance.post("/user/reset", { email });
    toast.success(res?.data?.message, { id: loadingMessage });
    return res?.data;
  } catch (error) {
    toast.error(error?.response?.data?.message, { id: loadingMessage });
    throw error;
  }
});

export const resetPassword = createAsyncThunk("/user/reset", async (data) => {
  const loadingMessage = toast.loading("Please Wait! Resetting your password...");
  try {
    const res = await axiosInstance.post(`/user/reset/${data.resetToken}`, { password: data.password });
    toast.success(res?.data?.message, { id: loadingMessage });
    return res?.data;
  } catch (error) {
    toast.error(error?.response?.data?.message, { id: loadingMessage });
    throw error;
  }
});

// Slice
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    resetAuthState: (state) => {
      state.isLoggedIn = false;
      state.role = "USER";
      state.data = null;
      localStorage.removeItem("token");
      localStorage.removeItem("userData");
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createAccount.fulfilled, (state, action) => {
        localStorage.setItem("data", JSON.stringify(action?.payload?.user));
        localStorage.setItem("role", action?.payload?.user?.role);
        localStorage.setItem("isLoggedIn", true);
        state.data = action?.payload?.user;
        state.role = action?.payload?.user?.role;
        state.isLoggedIn = true;
      })
      .addCase(login.fulfilled, (state, action) => {
        if (action.payload && action.payload.user) {
          state.isLoggedIn = true;
          state.role = action.payload.user.role || "USER";
          state.data = action.payload.user;
        }
      })
      .addCase(login.rejected, (state) => {
        state.isLoggedIn = false;
        state.role = "USER";
        state.data = null;
        localStorage.removeItem("token");
        localStorage.removeItem("userData");
      })
      .addCase(logout.fulfilled, (state) => {
        state.isLoggedIn = false;
        state.role = "USER";
        state.data = null;
      })
      .addCase(getUserData.fulfilled, (state, action) => {
        localStorage.setItem("data", JSON.stringify(action?.payload?.user));
        localStorage.setItem("role", action?.payload?.user?.role);
        localStorage.setItem("isLoggedIn", true);
        state.data = action?.payload?.user;
        state.role = action?.payload?.user?.role;
        state.isLoggedIn = true;
      });
  },
});

export const { resetAuthState } = authSlice.actions;
export default authSlice.reducer;
