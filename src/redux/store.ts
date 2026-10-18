import { configureStore } from '@reduxjs/toolkit';
import userReducer from './slices/userSlice';
import loadingReducer from "./slices/loadingSlice"
import customerReducer from "./slices/customerSlice"
export const store = configureStore({
    reducer: {
        user: userReducer,
        loading: loadingReducer,
        customers: customerReducer
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;