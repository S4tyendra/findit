import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { getItemForManagement, updateItem, deleteItem } from '@/lib/apiClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import LocationSelector from '@/components/LocationSelector';
// For Delete Confirmation Dialog
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";


const MANAGEMENT_TOKEN_KEY_PREFIX = 'manage_token_';

const ManageItemPage = () => {
    const router = useRouter();
    const { item_id } = router.query;
    const [item, setItem] = useState(null); // Holds the original fetched item
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState(null);
    const [updateError, setUpdateError] = useState(null);
    const [token, setToken] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);

    // State for editable fields
    const [editableDescription, setEditableDescription] = useState('');
    const [editableDateLost, setEditableDateLost] = useState(''); // Store as YYYY-MM-DD string for input
    const [editableProductLink, setEditableProductLink] = useState('');
    const [editableLocation, setEditableLocation] = useState({ country: '', state: '', city: '' });
    // Note: Image editing is not implemented in this phase

    // --- Fetching Logic ---
    const fetchItemData = useCallback(async (id, currentToken) => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await getItemForManagement(id, currentToken);
            setItem(data);
            // Initialize editable state when data is fetched
            setEditableDescription(data.description || '');
            setEditableDateLost(data.date_lost ? data.date_lost.substring(0, 10) : ''); // Format for date input
            setEditableProductLink(data.product_link || '');
            setEditableLocation({
                country: data.country || '',
                state: data.state || '',
                city: data.city || ''
            });

            // Store token if fetched via URL
            if (router.query.token === currentToken) {
                try {
                    localStorage.setItem(`${MANAGEMENT_TOKEN_KEY_PREFIX}${id}`, currentToken);
                    console.log(`Stored/refreshed management token for item ${id}`);
                } catch (storageError) {
                    console.error("Failed to store management token in localStorage:", storageError);
                }
            }
        } catch (err) {
            console.error("Error fetching item for management:", err);
            setError(err.message || 'Failed to load item details.');
            setItem(null);
             // If fetch failed with a stored token, maybe remove it?
             if (!router.query.token && currentToken) {
                 try { localStorage.removeItem(`${MANAGEMENT_TOKEN_KEY_PREFIX}${id}`); } catch (e) {}
                 setError("Invalid or expired token. Please use the link from your email again.");
             }
        } finally {
            setIsLoading(false);
        }
    }, [router.query.token]); // Dependency on router.query.token to differentiate URL vs storage fetch


    useEffect(() => {
        if (router.isReady && item_id) {
             let effectiveToken = router.query.token;
             if (!effectiveToken) {
                 try {
                     effectiveToken = localStorage.getItem(`${MANAGEMENT_TOKEN_KEY_PREFIX}${item_id}`);
                 } catch (e) { console.error("Failed to read token from localStorage:", e); }
             }

             if (effectiveToken) {
                 setToken(effectiveToken);
                 fetchItemData(item_id, effectiveToken);
             } else {
                 setError("Management token is missing.");
                 setIsLoading(false);
             }
         } else if (!item_id && router.isReady){
             setIsLoading(false);
         }
    }, [router.isReady, item_id, fetchItemData]); // Include fetchItemData dependency


    // --- Update Logic ---
    const handleUpdateSubmit = async (event) => {
        event.preventDefault();
        setIsUpdating(true);
        setUpdateError(null);

        // Construct payload with only changed values
        const updatePayload = {};
        if (editableDescription !== item?.description) updatePayload.description = editableDescription;
        if (editableDateLost !== (item?.date_lost ? item.date_lost.substring(0, 10) : '')) {
             // Validate date before adding
             try {
                 updatePayload.date_lost = new Date(editableDateLost).toISOString();
             } catch (dateError) {
                 setUpdateError("Invalid Date Lost format.");
                 setIsUpdating(false);
                 return;
             }
        }
        if (editableProductLink !== (item?.product_link || '')) updatePayload.product_link = editableProductLink || null; // Send null to clear
        if (editableLocation.country !== (item?.country || '')) updatePayload.country = editableLocation.country || null;
        if (editableLocation.state !== (item?.state || '')) updatePayload.state = editableLocation.state || null;
        if (editableLocation.city !== (item?.city || '')) updatePayload.city = editableLocation.city || null;


        if (Object.keys(updatePayload).length === 0) {
            setUpdateError("No changes detected.");
            setIsUpdating(false);
            setIsEditMode(false); // Exit edit mode if no changes
            return;
        }


        try {
            const updatedItemData = await updateItem(item_id, token, updatePayload);
            setItem(updatedItemData); // Update local state with response
            setIsEditMode(false); // Exit edit mode on success
        } catch (err) {
            console.error("Update failed:", err);
            setUpdateError(err.message || "Failed to save changes.");
        } finally {
            setIsUpdating(false);
        }
    };

    // --- Delete Logic ---
     const handleDelete = async () => {
         setIsDeleting(true);
         setError(null); // Clear previous errors
         try {
             await deleteItem(item_id, token);
             // Clear token from storage
             try { localStorage.removeItem(`${MANAGEMENT_TOKEN_KEY_PREFIX}${item_id}`); } catch(e){}
             // Redirect to homepage after successful deletion
             router.push('/?deleted=true'); // Add query param for potential success message
         } catch (err) {
              console.error("Delete failed:", err);
             setError(err.message || "Failed to delete item.");
             setIsDeleting(false);
         }
         // No finally needed as we redirect on success
     };

    // --- Helper Functions ---
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString(undefined, {
                year: 'numeric', month: 'long', day: 'numeric',
            });
        } catch (e) { return dateString; }
    };

    const handleCancelEdit = () => {
         setIsEditMode(false);
         setUpdateError(null);
         // Reset editable fields back to original item values
         setEditableDescription(item?.description || '');
         setEditableDateLost(item?.date_lost ? item.date_lost.substring(0, 10) : '');
         setEditableProductLink(item?.product_link || '');
         setEditableLocation({
            country: item?.country || '',
            state: item?.state || '',
            city: item?.city || ''
         });
    };


    // --- Render Logic ---
    if (isLoading) { /* Skeleton */
        return ( <div className="container mx-auto p-4 max-w-2xl"> <Card> <CardHeader> <Skeleton className="h-6 w-3/4" /> <Skeleton className="h-4 w-1/2 mt-1" /> </CardHeader> <CardContent className="space-y-4"> <Skeleton className="h-4 w-full" /> <Skeleton className="h-4 w-full" /> <Skeleton className="h-4 w-2/3" /> <Skeleton className="h-20 w-full" /> </CardContent> </Card> </div> );
    }
    if (error && !isEditMode) { /* Error Display (only if not in edit mode, allow fixing errors in edit mode) */
        return ( <div className="container mx-auto p-4 max-w-2xl"> <Alert variant="destructive"> <AlertTitle>Error</AlertTitle> <AlertDescription>{error}</AlertDescription> </Alert> </div> );
    }
    if (!item) { /* Not Found */
        return ( <div className="container mx-auto p-4 max-w-2xl"> <Alert> <AlertTitle>Item Not Found</AlertTitle> <AlertDescription>The requested item could not be loaded or may have been deleted.</AlertDescription> </Alert> </div> );
    }

    // --- Main Render (View or Edit) ---
    return (
        <div className="container mx-auto p-4 max-w-2xl">
            <form onSubmit={handleUpdateSubmit}> {/* Form wraps the whole card for edit mode */}
                 <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                             <div>
                                <CardTitle>{isEditMode ? "Edit Lost Item" : "Manage Lost Item"}</CardTitle>
                                <CardDescription>Item ID: {item._id}</CardDescription>
                             </div>
                             {!isEditMode && (
                                 <Button type="button" variant="outline" size="sm" onClick={() => setIsEditMode(true)}>Edit</Button>
                             )}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         {/* Description */}
                        <div>
                            <Label htmlFor="description">Description</Label>
                            {isEditMode ? (
                                <Textarea id="description" value={editableDescription} onChange={(e) => setEditableDescription(e.target.value)} required minLength={10} maxLength={1000} className="mt-1"/>
                            ) : (
                                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{item.description || 'N/A'}</p>
                            )}
                        </div>
                        {/* Reporter Email (Read-only) */}
                        <div>
                            <Label>Reporter Email</Label>
                             <p className="text-sm text-muted-foreground mt-1">{item.reporter_email || 'N/A'}</p>
                        </div>
                        {/* Date Lost */}
                        <div>
                            <Label htmlFor="dateLost">Date Lost</Label>
                            {isEditMode ? (
                                <Input id="dateLost" type="date" value={editableDateLost} onChange={(e) => setEditableDateLost(e.target.value)} required className="mt-1"/>
                            ) : (
                                <p className="text-sm text-muted-foreground mt-1">{formatDate(item.date_lost)}</p>
                            )}
                        </div>
                        {/* Product Link */}
                         <div>
                            <Label htmlFor="productLink">Product Link</Label>
                             {isEditMode ? (
                                 <Input id="productLink" type="url" value={editableProductLink} onChange={(e) => setEditableProductLink(e.target.value)} placeholder="Optional: https://..." className="mt-1"/>
                             ) : (
                                item.product_link ? <a href={item.product_link} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline break-all mt-1 block">{item.product_link}</a> : <p className="text-sm text-muted-foreground mt-1">N/A</p>
                             )}
                        </div>
                        {/* Location */}
                         <div>
                             <Label>Location</Label>
                             {isEditMode ? (
                                 <div className="mt-1 border p-3 rounded-md">
                                     <LocationSelector onLocationChange={setEditableLocation} initialLocation={editableLocation}/>
                                 </div>
                              ) : (
                                 <p className="text-sm text-muted-foreground mt-1">
                                     { [item.city, item.state, item.country].filter(Boolean).join(', ') || 'N/A' }
                                 </p>
                              )}
                        </div>
                         {/* Images (Read-only in this phase) */}
                         <div>
                            <h4 className="font-semibold text-sm">Images</h4>
                            {item.image_filenames && item.image_filenames.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                                    {item.image_filenames.map(filename => ( <img key={filename} src={`${process.env.NEXT_PUBLIC_API_HOST}/images/${filename}`} alt="Lost item" className="rounded border aspect-square object-cover" onError={(e) => e.target.style.display='none'}/> ))}
                                </div>
                            ) : (<p className="text-sm text-muted-foreground mt-1">No images uploaded.</p>)}
                            {/* TODO: Add image management (delete/add) in a later phase if needed */}
                        </div>
                        {/* Reported On (Read-only) */}
                        <div>
                            <Label>Reported On</Label>
                            <p className="text-sm text-muted-foreground mt-1">{formatDate(item.created_at)}</p>
                        </div>

                         {/* Update Error Display */}
                         {updateError && isEditMode && <Alert variant="destructive" className="mt-4"><AlertDescription>{updateError}</AlertDescription></Alert>}

                    </CardContent>
                    <CardFooter className="flex justify-between">
                         {isEditMode ? (
                             <div className="flex gap-2">
                                 <Button type="submit" disabled={isUpdating}> {isUpdating ? 'Saving...' : 'Save Changes'} </Button>
                                 <Button type="button" variant="outline" onClick={handleCancelEdit} disabled={isUpdating}>Cancel</Button>
                             </div>
                         ) : (
                             /* Placeholder for view mode actions if any */
                             <div></div>
                         )}

                         {/* Delete Button (always visible when not editing, maybe hide if editing?) */}
                         {!isEditMode && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button type="button" variant="destructive" disabled={isDeleting}>Delete Report</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete the lost item report and associated images.</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter> <AlertDialogCancel>Cancel</AlertDialogCancel> <AlertDialogAction onClick={handleDelete} disabled={isDeleting}> {isDeleting ? 'Deleting...' : 'Delete'} </AlertDialogAction> </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                         )}
                    </CardFooter>
                 </Card>
            </form>
        </div>
    );
};

export default ManageItemPage;