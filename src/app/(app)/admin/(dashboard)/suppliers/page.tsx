'use client'
import { useCallback, useEffect, useState, use } from "react";
import { EditOrCreateNewModalWrapper } from "@/components/EditOrCreateNewModalWrapper";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/redux/store";
import { createSupplier, fetchSuppliers, updateSupplier, deleteSupplier } from "@/redux/slices/supplierSlice";
import toast from "react-hot-toast";
import { Plus, Edit, Trash2, Eye, EyeOff, Minus } from "@/components/icons";
import Pagination from "@/components/Pagination";
import SearchBar from "@/components/SearchBar";
import dynamic from "next/dynamic";
import Table from "@/components/Table";
import FormInput from "@/components/FormInput";
import FormTextarea from "@/components/FormTextarea";
import StatusFilter from "@/components/StatusFilter";
import { Button } from "@/components/Button";
// import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import StateAutocomplete from "@/components/StateAutocomplete";
import { ApiErrorState } from "@/components/ui/ApiErrorState";
import { CompanySetupNotice } from "@/components/admin/CompanySetupNotice";
import type { ApiErrorInfo } from "@/lib/api/errors";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { CompanyProfileRequiredDialog } from "@/components/admin/CompanyProfileRequiredDialog";
import { OpeningBalanceField } from "@/components/parties/OpeningBalanceField";
import { SUPPLIER_BALANCE_LABELS, type BalanceType } from "@/lib/opening-balance";

export default function SupplierManagement({ params }: { params: Promise<{ role: string }> }) {
    // Check if user can delete based on role
    const { role } = use(params)
    const dispatch = useDispatch<AppDispatch>();
    const { totalSuppliers, totalPages, status, error } = useSelector((state: RootState) => state.suppliers);

    // name, address, city, state, gstin, mobile
    // Local state
    const [name, setName] = useState<string>("");
    const [address, setAddress] = useState<string>("");
    const [city, setCity] = useState<string>("");
    const [state, setState] = useState<string>("");
    const [pincode, setPincode] = useState<string>("");
    const [gstin, setGstin] = useState<string>("");
    const [mobile, setMobile] = useState<string>("");
    const [email, setEmail] = useState<string>("");
    const [openingBalance, setOpeningBalance] = useState<string>("");
    const [balanceType, setBalanceType] = useState<BalanceType>("debit");

    const [isModalVisible, setModalVisible] = useState<boolean>(false);
    const [selectedSupplier, setSelectedSupplier] = useState<any | null>(null);
    const [loadingPage, setLoadingPage] = useState(true);
    const [loadError, setLoadError] = useState<ApiErrorInfo | null>(null);
    const { settings: companySettings, hasLoaded: companyLoaded, error: companyError } = useCompanySettings();
    const [showCompanyRequired, setShowCompanyRequired] = useState(false);
    const [content, setContent] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [pagesCache, setPagesCache] = useState<Record<number, any[]>>({}); // Cache to store page data
    const [dropdownOpen, setDropdownOpen] = useState<number | null>(null);
    const [filterQuery, setFilterQuery] = useState<any>({
        name: "",
    });
    const [searchQuery, setSearchQuery] = useState({ name: "" });
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [supplierToDelete, setSupplierToDelete] = useState<string | null>(null);

    const suppliers = pagesCache[currentPage] || [];

    useEffect(() => {
        const fetchData = async () => {
            if (!pagesCache[currentPage]) {
                setLoadingPage(true);
                setLoadError(null);
                const response: any = await dispatch(fetchSuppliers({ ...searchQuery, currentPage, itemsPerPage }));
                if (typeof response.payload !== 'string' && response.payload?.suppliers) {
                    setPagesCache((prevCache) => ({
                        ...prevCache,
                        [currentPage]: response?.payload?.suppliers
                    }));
                } else {
                    console.log("Unexpected response format: ", response.payload);
                    if (response.payload?.kind) setLoadError(response.payload as ApiErrorInfo);
                }
                setLoadingPage(false);
            }

            // Preload next and previous pages
            preloadAdjacentPages(currentPage, itemsPerPage);
        };

        const preloadAdjacentPages = async (currentPage: number, itemsPerPage: number) => {
            // Preload next page if it exists
            if (currentPage < totalPages && !pagesCache[currentPage + 1]) {
                const nextPageResponse: any = await dispatch(fetchSuppliers({ ...searchQuery, currentPage: currentPage + 1, itemsPerPage }));

                if (typeof nextPageResponse.payload !== "string" && nextPageResponse.payload?.suppliers) {
                    setPagesCache((prevCache) => ({
                        ...prevCache,
                        [currentPage + 1]: nextPageResponse?.payload?.suppliers
                    }));
                }
            }
        };

        fetchData();
    }, [dispatch, searchQuery, currentPage, itemsPerPage, pagesCache, totalPages]);

    const handleNextPage = () => {
        if (currentPage < totalPages) setCurrentPage(prevPage => prevPage + 1);
    };

    const handlePreviousPage = () => {
        if (currentPage > 1) setCurrentPage(prevPage => prevPage - 1);
    };

    const handleSearch = useCallback((searchParams?: any) => {
        let queryToUse = filterQuery;

        // Handle reset operation
        if (searchParams && searchParams.reset) {
            queryToUse = { name: "" }; // Clear all filters
            setFilterQuery({ name: "" }); // Reset the filter state
            setSearchQuery({ name: "" }); // Reset search query
            setPagesCache({});
            return;
        }

        // Handle search from table's search bar
        if (searchParams && searchParams.search !== undefined) {
            queryToUse = {
                ...filterQuery,
                name: searchParams.search
            };
            setFilterQuery(queryToUse); // Keep filter state in sync
        }

        setSearchQuery(queryToUse);
        setPagesCache({});
        setCurrentPage(1);
    }, [filterQuery]);

    const handleItemsPerPageChange = (e: any) => {
        setPagesCache({});
        setItemsPerPage(Number(e.target.value));
        setCurrentPage(1);
    };

    const handleCreateNewSupplier = () => {
        // No company name yet -> explain instead of opening the form (the API refuses too).
        if (companyLoaded && !companyError && !companySettings.companyName.trim()) {
            setShowCompanyRequired(true);
            return;
        }
        setName("");
        setAddress("")
        setCity("")
        setState("")
        setPincode("")
        setGstin("")
        setMobile("")
        setEmail("")
        setOpeningBalance("")
        setBalanceType("debit")
        setSelectedSupplier(null);
        setModalVisible(true);
    };

    const handleSave = async (e: any) => {
        e.preventDefault();
        const supplierData = { name, address, city, state, pincode, gstin, mobile, email, openingBalance: Number(openingBalance) || 0, balanceType };
        let response: any;
        if (selectedSupplier) {
            // Update existing category
            response = await dispatch(updateSupplier({ ...selectedSupplier, ...supplierData }));
        } else {
            // Create new category
            response = await dispatch(createSupplier(supplierData));
        }

        // Wait for the response to resolve
        if (response && response.payload && typeof response.payload !== 'string') {
            // Update the state to show the new/update tag immediately
            const updatedCategories: any = selectedSupplier
                ? suppliers?.map(cat => cat._id === selectedSupplier._id ? { ...cat, ...supplierData } : cat)
                : [...suppliers, response.payload];

            setPagesCache(prevCache => ({
                ...prevCache,
                [currentPage]: updatedCategories
            }));
            setModalVisible(false);
        }
    };

    // Handle editing an existing category
    const onEdit = (supplier: any) => {
        setSelectedSupplier(supplier);
        setName(supplier.name);
        setAddress(supplier.address);
        setCity(supplier.city);
        setState(supplier.state);
        setPincode(supplier.pincode);
        setGstin(supplier.gstin);
        setMobile(supplier.mobile);
        setEmail(supplier.email);
        setOpeningBalance(supplier.openingBalance ? String(supplier.openingBalance) : "");
        setBalanceType(supplier.balanceType === "credit" ? "credit" : "debit");
        setModalVisible(true);
        setDropdownOpen(null);
    };

    // Handle confirming delete
    const confirmDelete = (supplierId: string) => {
        console.log("supplierId : ", supplierId);
        setSupplierToDelete(supplierId);
        setIsDeleteModalOpen(true);
        setDropdownOpen(null);
    };

    // Actual delete function
    const handleDelete = async () => {
        if (!supplierToDelete) return;

        try {
            const response = await dispatch(deleteSupplier(supplierToDelete));

            if (response?.payload && typeof response.payload !== 'string') {
                // Remove the deleted tag from the list of tags
                const updatedSupplier = suppliers.filter(con => con._id !== supplierToDelete);

                setPagesCache(prevCache => ({
                    ...prevCache,
                    [currentPage]: updatedSupplier
                }));
                toast.success('Successfully deleted Supplier')
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to delete Supplier");
        } finally {
            setIsDeleteModalOpen(false);
            setSupplierToDelete(null);
        }
    };

    const filterFields = [
        <SearchBar
            key="name"
            filterQuery={filterQuery}
            setFilterQuery={setFilterQuery}
            placeHolder="Supplier name..."
            fieldName="name" // Pass the key corresponding to the filter
        />,
        <StatusFilter
            key="status"
            filterQuery={filterQuery}
            setFilterQuery={setFilterQuery}
        />,
    ];

    return (
        <div className="container mx-auto p-4 bg-white shadow-md dark:bg-bg_secondary">
            {/* Header Section with Stats */}
            <div className="mb-6">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center w-full sm:w-auto">
                        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">Manage Suppliers</h2>
                        {/* Total count badge */}
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-[#102E56]/20 text-[#102E56] dark:text-blue-400 border border-blue-200 dark:border-blue-800/30">
                            {totalSuppliers || 0} Total Suppliers
                        </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3 justify-end">
                        <Button
                            // variant="default"
                            size="sm"
                            onClick={handleCreateNewSupplier}
                            className="bg-[#153a69] hover:bg-[#102E56] text-white flex items-center gap-2 w-full sm:w-auto"
                        >
                            <Plus size={16} />
                            <span>Add Supplier</span>
                        </Button>
                    </div>
                </div>

            </div>

            <CompanyProfileRequiredDialog
                open={showCompanyRequired}
                action="add suppliers"
                onClose={() => setShowCompanyRequired(false)}
            />
            <CompanySetupNotice className="mb-4" />

            {loadError && suppliers.length === 0 && !loadingPage && (
                <ApiErrorState
                    error={loadError}
                    className="mb-4"
                    onRetry={() => { setLoadError(null); setPagesCache({}); }}
                />
            )}

            {/* Categories Table */}
            <Table
                headings={["Company / Supplier Name", "Address", "City", "State", "Pin Code", "Gstin", "Mobile", "Email", "Opening Balance", "Actions"]}
                handleSearch={handleSearch}
                data={suppliers}
                isLoading={loadingPage}
                renderCell={(item: any, key: any) => {
                    if (key === "Company / Supplier Name") return (
                        <span className="whitespace-normal break-words text-sm font-medium text-gray-900 dark:text-gray-200 max-w-[120px] sm:max-w-full">
                            {item?.name}
                        </span>
                    );
                    if (key === "Address") return (
                        <span className="whitespace-normal break-words text-sm font-medium text-gray-900 dark:text-gray-200 max-w-[120px] sm:max-w-full">
                            {item?.address}
                        </span>
                    );
                    if (key === "City") return (
                        <span className="whitespace-normal break-words text-sm font-medium text-gray-900 dark:text-gray-200 max-w-[120px] sm:max-w-full">
                            {item?.city}
                        </span>
                    );
                    if (key === "State") return (
                        <span className="whitespace-normal break-words text-sm font-medium text-gray-900 dark:text-gray-200 max-w-[120px] sm:max-w-full">
                            {item?.state}
                        </span>
                    );
                    if (key === "Pin Code") return (
                        <span className="whitespace-normal break-words text-sm font-medium text-gray-900 dark:text-gray-200 max-w-[120px] sm:max-w-full">
                            {item?.pincode}
                        </span>
                    );
                    if (key === "Gstin") return (
                        <span className="whitespace-normal break-words text-sm font-medium text-gray-900 dark:text-gray-200 max-w-[120px] sm:max-w-full">
                            {item?.gstin}
                        </span>
                    );
                    if (key === "Mobile") return (
                        <span className="whitespace-normal break-words text-sm font-medium text-gray-900 dark:text-gray-200 max-w-[120px] sm:max-w-full">
                            {item?.mobile}
                        </span>
                    );
                    if (key === "Email") return (
                        <span className="whitespace-normal break-words text-sm font-medium text-gray-900 dark:text-gray-200 max-w-[120px] sm:max-w-full">
                            {item?.email}
                        </span>
                    );
                    if (key === "Opening Balance") return (
                        <span className="whitespace-normal break-words text-sm font-medium text-gray-900 dark:text-gray-200 max-w-[120px] sm:max-w-full">
                            {Number(item?.openingBalance ?? 0).toFixed(2)}{" "}
                            <span className="text-xs text-gray-500">
                                {item?.balanceType === "credit" ? "Cr" : "Dr"}
                            </span>
                        </span>
                    );
                    if (key === "Actions") return (
                        <div className="flex items-center space-x-1 sm:space-x-2 absolute top-3 right-3 sm:static">
                            <button
                                onClick={() => onEdit(item)}
                                className="p-1 sm:p-1.5 text-gray-600 hover:text-[#DB7007] hover:bg-orange-50 rounded transition-colors dark:text-gray-300 dark:hover:text-[#DB7007] dark:hover:bg-orange-900/20"
                                title="Edit"
                                aria-label="Edit supplier"
                            >
                                <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                            {/* Delete button only for admin */}
                            <button
                                onClick={() => confirmDelete(item._id)}
                                className="p-1 sm:p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors dark:text-gray-300 dark:hover:text-red-400 dark:hover:bg-red-900/20"
                                title="Delete"
                                aria-label="Delete supplier"
                            >
                                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                        </div>
                    );
                }}
                filterFields={filterFields}
                itemsPerPage={10}
            />

            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                itemsPerPage={itemsPerPage}
                totalItems={totalSuppliers}
                handlePreviousPage={handlePreviousPage}
                handleNextPage={handleNextPage}
                handleItemPerPageChange={handleItemsPerPageChange}
            />

            <EditOrCreateNewModalWrapper
                title={selectedSupplier ? "Edit Supplier" : "Create Supplier"}
                isVisible={isModalVisible}
                onClose={() => setModalVisible(false)}
                onSave={handleSave}
                size="large"
            >
                {/* Name Field */}
                <div className="form-group mb-5">
                    <FormInput label="Company / Supplier Name" value={name} onChange={(e) => setName(e.target.value)} required={true} placeholder="Supplier Name" />
                </div>

                {/* Description Field */}
                <div className="form-group mb-5">
                    <FormTextarea
                        label='Address'
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        required={false}
                        className="w-full"
                        placeholder="Enter supplier address (optional)"
                    />
                </div>

                <div className="form-group mb-5">
                    <FormInput label="City" value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
                </div>
                <div className="form-group mb-5">
                    <StateAutocomplete value={state} onChange={(val) => setState(val)} required={false} />
                </div>
                <div className="form-group mb-5">
                    <FormInput label="Pincode" value={pincode} onChange={(e) => setPincode(e.target.value)} placeholder="Pincode" />
                </div>
                <div className="form-group mb-5">
                    <FormInput label="Gstin" value={gstin} onChange={(e) => setGstin(e.target.value)} placeholder="Gstin" />
                </div>
                <div className="form-group mb-5">
                    <FormInput label="Mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="Mobile" />
                </div>
                <div className="form-group mb-5">
                    <FormInput label="Email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
                </div>
                <div className="form-group mb-5">
                    <OpeningBalanceField
                        amount={openingBalance}
                        type={balanceType}
                        onAmountChange={setOpeningBalance}
                        onTypeChange={setBalanceType}
                        labels={SUPPLIER_BALANCE_LABELS}
                    />
                </div>

            </EditOrCreateNewModalWrapper>

            {/* Delete Confirmation Modal */}
            <AlertDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the supplier.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setSupplierToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}