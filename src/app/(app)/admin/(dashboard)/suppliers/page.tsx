'use client'
import { useMemo } from "react";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/redux/store";
import { createSupplier, updateSupplier, deleteSupplier } from "@/redux/slices/supplierSlice";
import { PartyLedgerScreen, type PartyCrud } from "@/components/ledger/PartyLedgerScreen";

/** Supplier ledger (Khata): Payable (Cr) / Paid (Dr). The screen itself is shared with customers: see PartyLedgerScreen. */
export default function SupplierLedgerPage() {
    const dispatch = useDispatch<AppDispatch>();
    const crud = useMemo<PartyCrud>(
        () => ({
            create: async (data) => {
                const action = await dispatch(createSupplier(data));
                if (!createSupplier.fulfilled.match(action) || !action.payload) return null;
                const id: unknown = action.payload._id;
                return typeof id === "string" ? id : null;
            },
            update: async (id, data, createdAt) => {
                const action = await dispatch(updateSupplier({ ...data, _id: id, createdAt, updatedAt: createdAt }));
                return updateSupplier.fulfilled.match(action) && Boolean(action.payload);
            },
            remove: async (id) => deleteSupplier.fulfilled.match(await dispatch(deleteSupplier(id))),
        }),
        [dispatch]
    );
    return <PartyLedgerScreen kind="supplier" crud={crud} />;
}
