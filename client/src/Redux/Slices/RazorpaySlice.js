import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import toast from 'react-hot-toast';
import { axiosInstance } from '../../Helpers/axiosInstance';

const initialState = {
    key: "",
    subscription_id: "",
    isPaymentVerified: false,
    allPayments: {},
    finalMonths: {},
    monthlySalesRecord: []
}

// Commented out async thunks if not needed
// export const getRazorPayId = createAsyncThunk("/payments/keyId", async () => { ... })

export const purchaseCourseBundle = createAsyncThunk("/payments/subscribe", async () => {
    try {
        const response = await axiosInstance.post("/payments/subscribe");
        return response?.data;
    } catch (error) {
        toast.error(error?.response?.data?.message);
        throw error
    }
})

export const verifyUserPayment = createAsyncThunk("/payments/verify", async (data) => {
    const loadingId = toast.loading("Subscribing bundle...");
    try {
        const response = await axiosInstance.post("/payments/verify", data);
        toast.success("Payment verified", { id: loadingId });
        return response?.data;
    } catch (error) {
        toast.error(error?.response?.data?.message, { id: loadingId });
        throw error
    }
})

export const getPaymentRecord = createAsyncThunk("/payments/record", async () => {
    const loadingId = toast.loading("Getting the payment records");
    try {
        const response = await axiosInstance.get("/payments?count=100");
        toast.success(response?.data?.message, {id: loadingId});
        return response?.data;
    } catch (error) {
        toast.error("Operation failed", {id: loadingId});
        throw error;
    }
});

export const cancelCourseBundle = createAsyncThunk("/payments/cancel", async () => {
    const loadingId = toast.loading("unsubscribing the bundle...")
    try {
        const response = await axiosInstance.post("/payments/unsubscribe");
        toast.success(response?.data?.message, {id: loadingId});
        return response?.data
    } catch (error) {
        toast.error(error?.response?.data?.message, {id: loadingId});
        throw error;
    }
})

// Create the slice
const razorpaySlice = createSlice({
    name: 'razorpay',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        // Uncomment and modify as needed
        // builder.addCase(getRazorPayId.fulfilled, (state, action) => {
        //     state.key = action?.payload?.key
        // })
    }
})

export default razorpaySlice.reducer;