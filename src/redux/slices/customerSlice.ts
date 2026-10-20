import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";
import toast from "react-hot-toast";
import { setLoading } from "./loadingSlice";
import { getApiErrorInfo } from "@/lib/api/errors";

// name, address, city, state, gstin, mobile
interface Customer {
    _id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    gstin: string;
    mobile: string;
    email: string;
    createdAt: string;
    updatedAt: string;
}

interface CustomersState {
    Customers: Customer[];
    totalCustomers: number;
    currentPage: number;
    totalPages: number;
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
}

const initialState: CustomersState = {
    Customers: [],
    totalCustomers: 0,
    currentPage: 1,
    totalPages: 0,
    status: 'idle',
    error: null,
};

export const fetchCustomers = createAsyncThunk(
    'Customers/fetchCustomers',
    async ({ name, state, currentPage, itemsPerPage }: { name?: string; state?: string; currentPage?: number; itemsPerPage?: number }, { dispatch, rejectWithValue }) => {
        try {
            dispatch(setLoading(true))
            const response = await axios.get('/api/admin/customer/get', {
                params: { name, state, currentPage, itemsPerPage },
            });

            return {
                customers: response.data.data.customers,
                totalCustomers: response.data.data.totalCustomers,
                currentPage: response.data.data.currentPage,
                totalPages: response.data.data.totalPages,
            };
        } catch (error: any) {
            return rejectWithValue(getApiErrorInfo(error, "Couldn't load your customers."));
        } finally {
            dispatch(setLoading(false))
        }
    }
);

export const createCustomer = createAsyncThunk(
    'Customers/createCustomer',
    async (Customer: Omit<Customer, '_id' | 'createdAt' | 'updatedAt'>, { dispatch, rejectWithValue }) => {
        try {
            dispatch(setLoading(true))
            const response = await axios.post('/api/admin/customer/create', Customer);
            if (response.status === 200) {
                toast.success(response.data.message || "Successfully created Customer")
                return response.data.data;
            }
        } catch (error: any) {
            toast.error(error.response.data.message || "Failed")
            return rejectWithValue(error.message || 'Failed to create Customer');
        } finally {
            dispatch(setLoading(false))
        }
    }
);

export const updateCustomer = createAsyncThunk(
    'Customers/updateCustomer',
    async (Customer: Customer, { dispatch, rejectWithValue }) => {
        try {
            dispatch(setLoading(true))
            const response = await axios.put(`/api/admin/customer/update`, Customer);
            // console.log("response : ", response);
            if (response.status === 200) {
                toast.success(response.data.message || "Customer updated successfully")
                return response.data.data;
            }
        } catch (error: any) {
            toast.error(error.response.data.message || "Failed to update Customer")
            return rejectWithValue(error.message || 'Failed to update Customer');
        } finally {
            dispatch(setLoading(false))
        }
    }
);

export const deleteCustomer = createAsyncThunk(
    'Customers/deleteCustomer',
    async (_id: string, { dispatch, rejectWithValue }) => {
        try {
            dispatch(setLoading(true))
            await axios.delete(`/api/admin/customer/delete`, { data: { _id } });
            return { _id };
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to delete Customer")
            return rejectWithValue(error?.response?.data?.message || 'Failed to delete Customer');
        } finally {
            dispatch(setLoading(false))
        }
    }
);

const CustomersSlice = createSlice({
    name: 'customers',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchCustomers.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(fetchCustomers.fulfilled, (state, action: PayloadAction<any>) => {
                const { customers, totalCustomers, currentPage, totalPages } = action.payload;
                state.status = 'succeeded';
                state.Customers = customers;
                state.totalCustomers = totalCustomers;
                state.currentPage = currentPage;
                state.totalPages = totalPages;
            })
            .addCase(fetchCustomers.rejected, (state, action) => {
                state.status = 'failed';
                state.error = (action.payload as { message?: string } | undefined)?.message || action.error.message || 'Failed to fetch Customers';
            })
            .addCase(createCustomer.fulfilled, (state, action: PayloadAction<Customer>) => {
                state.Customers.push(action.payload);
            })
            .addCase(createCustomer.rejected, (state, action) => {
                state.error = action.error.message || 'Failed to create Customer';
            })
            .addCase(updateCustomer.fulfilled, (state, action: PayloadAction<Customer>) => {
                const index = state.Customers.findIndex((con) => con._id === action.payload._id);
                if (index !== -1) {
                    state.Customers[index] = action.payload;
                }
            })
            .addCase(updateCustomer.rejected, (state, action) => {
                state.error = action.error.message || 'Failed to update Customer';
            })
            .addCase(deleteCustomer.fulfilled, (state, action: PayloadAction<{ _id: string }>) => {
                state.Customers = state.Customers.filter((con) => con._id !== action.payload._id);
            })
            .addCase(deleteCustomer.rejected, (state, action) => {
                state.error = action.error.message || 'Failed to delete Customer';
            });
    },
});

export default CustomersSlice.reducer