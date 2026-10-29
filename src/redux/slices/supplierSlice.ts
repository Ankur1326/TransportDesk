import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";
import toast from "react-hot-toast";
import { setLoading } from "./loadingSlice";
import { getApiErrorInfo } from "@/lib/api/errors";
import type { BalanceType } from "@/lib/opening-balance";

// name, address, city, state, gstin, mobile
interface Supplier {
    _id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    gstin: string;
    mobile: string;
    email: string;
    openingBalance: number;
    balanceType: BalanceType;
    createdAt: string;
    updatedAt: string;
}

interface SuppliersState {
    Suppliers: Supplier[];
    totalSuppliers: number;
    currentPage: number;
    totalPages: number;
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
}

const initialState: SuppliersState = {
    Suppliers: [],
    totalSuppliers: 0,
    currentPage: 1,
    totalPages: 0,
    status: 'idle',
    error: null,
};

export const fetchSuppliers = createAsyncThunk(
    'Suppliers/fetchSuppliers',
    async ({ name, state, currentPage, itemsPerPage }: { name?: string; state?: string; currentPage?: number; itemsPerPage?: number }, { dispatch, rejectWithValue }) => {
        try {
            dispatch(setLoading(true))
            const response = await axios.get('/api/admin/supplier/get', {
                params: { name, state, currentPage, itemsPerPage },
            });

            return {
                suppliers: response.data.data.suppliers,
                totalSuppliers: response.data.data.totalSuppliers,
                currentPage: response.data.data.currentPage,
                totalPages: response.data.data.totalPages,
            };
        } catch (error: any) {
            return rejectWithValue(getApiErrorInfo(error, "Couldn't load your suppliers."));
        } finally {
            dispatch(setLoading(false))
        }
    }
);

export const createSupplier = createAsyncThunk(
    'Suppliers/createSupplier',
    async (Supplier: Omit<Supplier, '_id' | 'createdAt' | 'updatedAt'>, { dispatch, rejectWithValue }) => {
        try {
            dispatch(setLoading(true))
            const response = await axios.post('/api/admin/supplier/create', Supplier);
            if (response.status === 200) {
                toast.success(response.data.message || "Successfully created Supplier")
                return response.data.data;
            }
        } catch (error: any) {
            toast.error(error.response.data.message || "Failed")
            return rejectWithValue(error.message || 'Failed to create Supplier');
        } finally {
            dispatch(setLoading(false))
        }
    }
);

export const updateSupplier = createAsyncThunk(
    'Suppliers/updateSupplier',
    async (Supplier: Supplier, { dispatch, rejectWithValue }) => {
        try {
            dispatch(setLoading(true))
            const response = await axios.put(`/api/admin/supplier/update`, Supplier);
            // console.log("response : ", response);
            if (response.status === 200) {
                toast.success(response.data.message || "Supplier updated successfully")
                return response.data.data;
            }
        } catch (error: any) {
            toast.error(error.response.data.message || "Failed to update Supplier")
            return rejectWithValue(error.message || 'Failed to update Supplier');
        } finally {
            dispatch(setLoading(false))
        }
    }
);

export const deleteSupplier = createAsyncThunk(
    'Suppliers/deleteSupplier',
    async (_id: string, { dispatch, rejectWithValue }) => {
        try {
            dispatch(setLoading(true))
            await axios.delete(`/api/admin/supplier/delete`, { data: { _id } });
            return { _id };
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to delete Supplier")
            return rejectWithValue(error?.response?.data?.message || 'Failed to delete Supplier');
        } finally {
            dispatch(setLoading(false))
        }
    }
);

const SuppliersSlice = createSlice({
    name: 'suppliers',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchSuppliers.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(fetchSuppliers.fulfilled, (state, action: PayloadAction<any>) => {
                const { suppliers, totalSuppliers, currentPage, totalPages } = action.payload;
                state.status = 'succeeded';
                state.Suppliers = suppliers;
                state.totalSuppliers = totalSuppliers;
                state.currentPage = currentPage;
                state.totalPages = totalPages;
            })
            .addCase(fetchSuppliers.rejected, (state, action) => {
                state.status = 'failed';
                state.error = (action.payload as { message?: string } | undefined)?.message || action.error.message || 'Failed to fetch Suppliers';
            })
            .addCase(createSupplier.fulfilled, (state, action: PayloadAction<Supplier>) => {
                state.Suppliers.push(action.payload);
            })
            .addCase(createSupplier.rejected, (state, action) => {
                state.error = action.error.message || 'Failed to create Supplier';
            })
            .addCase(updateSupplier.fulfilled, (state, action: PayloadAction<Supplier>) => {
                const index = state.Suppliers.findIndex((con) => con._id === action.payload._id);
                if (index !== -1) {
                    state.Suppliers[index] = action.payload;
                }
            })
            .addCase(updateSupplier.rejected, (state, action) => {
                state.error = action.error.message || 'Failed to update Supplier';
            })
            .addCase(deleteSupplier.fulfilled, (state, action: PayloadAction<{ _id: string }>) => {
                state.Suppliers = state.Suppliers.filter((con) => con._id !== action.payload._id);
            })
            .addCase(deleteSupplier.rejected, (state, action) => {
                state.error = action.error.message || 'Failed to delete Supplier';
            });
    },
});

export default SuppliersSlice.reducer