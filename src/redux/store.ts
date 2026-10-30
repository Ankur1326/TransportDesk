import { configureStore } from '@reduxjs/toolkit';
import userReducer from './slices/userSlice';
import loadingReducer from "./slices/loadingSlice"
import customerReducer from "./slices/customerSlice"
import supplierReducer from "./slices/supplierSlice"
import ledgerReducer from "./slices/ledgerSlice"
export const store = configureStore({
    reducer: {
        user: userReducer,
        loading: loadingReducer,
        customers: customerReducer,
        suppliers: supplierReducer,
        ledger: ledgerReducer
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;