import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getPublicItem, notifyFound } from '@/lib/apiClient'; // Import notifyFound
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from '@/components/ui/button';
// Imports for the 'Found' modal (Dialog, Input, Label) - Assuming shadcn setup
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose, // To close the dialog programmatically if needed
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PublicItemPage = () => {
    const router = useRouter();
    const { item_id } = router.query;
    const [item, setItem] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // State for the 'Found Item' modal
    const [isFoundModalOpen, setIsFoundModalOpen] = useState(false);
    const [finderContact, setFinderContact] = useState('');
    const [isSubmittingFound, setIsSubmittingFound] = useState(false);
    const [foundSubmitError, setFoundSubmitError] = useState(null);
    const [foundSubmitSuccess, setFoundSubmitSuccess] = useState(false);

    useEffect(() => {
        if (router.isReady && item_id) {
            setIsLoading(true);
            setError(null);
            getPublicItem(item_id)
                .then(setItem)
                .catch(err => {
                    console.error("Error fetching public item:", err);
                    setError(err.message || 'Failed to load item details.');
                    setItem(null);
                })
                .finally(() => setIsLoading(false));
        } else if (!item_id && router.isReady) {
             setIsLoading(false); // Stop loading if no item_id
        }
    }, [router.isReady, item_id]);

     const handleFoundSubmit = async (event) => {
        event.preventDefault();
        setIsSubmittingFound(true);
        setFoundSubmitError(null);
        setFoundSubmitSuccess(false);

        try {
            // Call the actual API function
            await notifyFound(item_id, finderContact);
            setFoundSubmitSuccess(true);
            // Keep modal open with success message for a few seconds
            setTimeout(() => {
                 setIsFoundModalOpen(false);
                 // Reset state for next time modal opens
                 setFoundSubmitSuccess(false);
                 setFinderContact('');
                 setFoundSubmitError(null);
             }, 3000);
        } catch (err) {
            setFoundSubmitError(err.message || "Failed to submit found report.");
        } finally {
            setIsSubmittingFound(false);
        }
    }; // End of handleFoundSubmit

    const formatDate = (dateString) => {
        // Same formatting as manage page
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString(undefined, {
                year: 'numeric', month: 'long', day: 'numeric',
            });
        } catch (e) {
            return dateString;
        }
    };

    if (isLoading) {
        return (
            <div className="container mx-auto p-4 max-w-2xl">
                 <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2 mt-1" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                         <Skeleton className="h-20 w-full" />
                    </CardContent>
                     <CardFooter>
                         <Skeleton className="h-10 w-32" />
                     </CardFooter>
                 </Card>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto p-4 max-w-2xl">
                <Alert variant="destructive">
                    <AlertTitle>Error Loading Item</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </div>
        );
    }

    if (!item) {
        return (
             <div className="container mx-auto p-4 max-w-2xl">
                <Alert>
                    <AlertTitle>Item Not Found</AlertTitle>
                    <AlertDescription>The requested item could not be found.</AlertDescription>
                </Alert>
             </div>
        );
    }

    // Display Public Item Details
    return (
        <div className="container mx-auto p-4 max-w-2xl">
            <Card>
                <CardHeader>
                    <CardTitle>Lost Item Details</CardTitle>
                    <CardDescription>Reported on: {formatDate(item.created_at)}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div>
                        <h4 className="font-semibold text-sm">Description:</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.description || 'N/A'}</p>
                    </div>
                     <div>
                        <h4 className="font-semibold text-sm">Date Lost:</h4>
                        <p className="text-sm text-muted-foreground">{formatDate(item.date_lost)}</p>
                    </div>
                    {item.product_link && (
                         <div>
                            <h4 className="font-semibold text-sm">Product Link:</h4>
                            <a href={item.product_link} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline break-all">
                                {item.product_link}
                            </a>
                        </div>
                    )}
                     <div>
                        <h4 className="font-semibold text-sm">Images:</h4>
                        {item.image_filenames && item.image_filenames.length > 0 ? (
                             <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                                {item.image_filenames.map(filename => (
                                    <img
                                        key={filename}
                                        src={`/images/${filename}`}
                                        alt="Lost item image"
                                        className="rounded border aspect-square object-cover"
                                        onError={(e) => e.target.style.display='none'}
                                    />
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">No images available.</p>
                        )}
                   </div>
                   {/* Display Location */}
                    {(item.city || item.state || item.country) && (
                        <div>
                           <h4 className="font-semibold text-sm">Location:</h4>
                            <p className="text-sm text-muted-foreground">
                                { [item.city, item.state, item.country].filter(Boolean).join(', ') }
                            </p>
                        </div>
                    )}
                   {/* End Display Location */}

               </CardContent>
                 <CardFooter>
                     {/* Dialog Trigger Button */}
                     <Dialog open={isFoundModalOpen} onOpenChange={setIsFoundModalOpen}>
                        <DialogTrigger asChild>
                            <Button>I Found This Item</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px] bg-accent/20 backdrop-blur-3xl">
                            <DialogHeader>
                                <DialogTitle>Report Item Found</DialogTitle>
                                <DialogDescription>
                                    Provide your contact details so the owner can reach you.
                                    Your details will be sent directly to them.
                                </DialogDescription>
                            </DialogHeader>
                            {!foundSubmitSuccess ? (
                                <form onSubmit={handleFoundSubmit} className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="finderContact" className="text-right col-span-1">
                                            Contact Info
                                        </Label>
                                        <Input
                                            id="finderContact"
                                            value={finderContact}
                                            onChange={(e) => setFinderContact(e.target.value)}
                                            placeholder="Email, phone, etc."
                                            required
                                            minLength={5}
                                            className="col-span-3"
                                        />
                                    </div>
                                    {foundSubmitError && <p className="text-red-500 text-sm col-span-4">{foundSubmitError}</p>}
                                    <DialogFooter>
                                        <Button type="submit" disabled={isSubmittingFound}>
                                            {isSubmittingFound ? 'Submitting...' : 'Send Contact Info'}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            ) : (
                                 <div className="py-4 text-center">
                                     <p className="text-green-600 font-medium">Thank you! Your contact information has been sent to the item's reporter.</p>
                                 </div>
                            )}
                        </DialogContent>
                    </Dialog>
                 </CardFooter>
            </Card>
        </div>
    );
}; // This brace closes the PublicItemPage component function body

export default PublicItemPage;