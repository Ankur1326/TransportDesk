'use client'
import { useMemo } from "react";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/redux/store";
import { createCustomer, updateCustomer, deleteCustomer } from "@/redux/slices/customerSlice";
import { PartyLedgerScreen, type PartyCrud } from "@/components/ledger/PartyLedgerScreen";

/** Customer ledger (Khata). The screen itself is shared with suppliers: see PartyLedgerScreen. */
export default function CustomerLedgerPage() {
    const dispatch = useDispatch<AppDispatch>();
    const crud = useMemo<PartyCrud>(
        () => ({
            create: async (data) => {
                const action = await dispatch(createCustomer(data));
                if (!createCustomer.fulfilled.match(action) || !action.payload) return null;
                const id: unknown = action.payload._id;
                return typeof id === "string" ? id : null;
            },
            update: async (id, data, createdAt) => {
                const action = await dispatch(updateCustomer({ ...data, _id: id, createdAt, updatedAt: createdAt }));
                return updateCustomer.fulfilled.match(action) && Boolean(action.payload);
            },
            remove: async (id) => deleteCustomer.fulfilled.match(await dispatch(deleteCustomer(id))),
        }),
        [dispatch]
    );
    return <PartyLedgerScreen kind="customer" crud={crud} />;
}
