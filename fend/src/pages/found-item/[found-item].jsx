import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getPublicFoundItem, claimFoundItem } from '@/lib/apiClient'; // Import necessary API functions
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Updated ClaimDialog component definition
const ClaimDialog = ({ open, onOpenChange, onSubmit, isSubmitting, error, success }) => { // Added success prop
    const [ownerEmail, setOwnerEmail] = useState('');
    const [ownerDescription, setOwnerDescription] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!isSubmitting) { // Prevent double submission
           onSubmit({ ownerEmail, ownerDescription });
        }
    };

    // Reset form when dialog opens
    useEffect(() => {
        if (open) {
            setOwnerEmail('');
            setOwnerDescription('');
            // If you want to reset error/success when reopening, do it here or in onOpenChange
        }
    }, [open]); // Keep dependency only on open if reset should happen on each open

    // Reset fields on successful submission *if* dialog stays open
     useEffect(() => {
         if (success && !isSubmitting) {
             // Optionally clear fields after successful submission shown in dialog
             // setOwnerEmail('');
             // setOwnerDescription('');
         }
     }, [success, isSubmitting]);


    return (
        <Dialog open={open} onOpenChange={(isOpen) => {
            if (!isSubmitting) { // Prevent closing while submitting
                onOpenChange(isOpen);
            }
        }}>
            
            <DialogContent className="sm:max-w-lg backdrop-blur-3xl bg-white/30 dark:bg-black/30">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Claim This Item</DialogTitle>
                        <DialogDescription>
                            If this is your item, please provide your contact information and a description to help verify your ownership. We'll send this information to the finder.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Display Success Message */}
                    {success && !isSubmitting && (
                        <Alert variant="success" className="my-4 bg-green-100 border-green-400 text-green-700">
                             <AlertTitle>Claim Sent!</AlertTitle>
                             <AlertDescription>Your claim has been submitted. The finder will be notified.</AlertDescription>
                        </Alert>
                    )}

                    {/* Display Error Message */}
                    {error && !success && ( // Show error only if not success
                        <Alert variant="destructive" className="my-4">
                            <AlertTitle>Submission Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {/* Form Fields (only enabled if not success) */}
                   <fieldset disabled={success || isSubmitting} className="grid gap-4 py-4">
                        <div>
                            <Label htmlFor="ownerEmail">Your Email *</Label>
                            <Input
                                id="ownerEmail"
                                type="email"
                                value={ownerEmail}
                                onChange={(e) => setOwnerEmail(e.target.value)}
                                placeholder="your.email@example.com"
                                required
                                disabled={isSubmitting || success} // Explicitly disable
                            />
                        </div>
                        <div>
                            <Label htmlFor="ownerDescription">Proof of Ownership *</Label>
                            <Textarea
                                id="ownerDescription"
                                value={ownerDescription}
                                onChange={(e) => setOwnerDescription(e.target.value)}
                                placeholder="Please describe the item in detail, including any unique marks or characteristics that only the owner would know."
                                required
                                rows={4}
                                disabled={isSubmitting || success} // Explicitly disable
                            />
                        </div>
                   </fieldset>


                    <DialogFooter className="gap-2 sm:gap-0">
                         {/* Show Cancel/Close button based on success state */}
                        {!success ? (
                            <Button variant="secondary" type="button" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                                Cancel
                            </Button>
                        ) : (
                             <Button variant="secondary" type="button" onClick={() => onOpenChange(false)}>
                                Close
                            </Button>
                        )}
                        {/* Show Submit button only if not successful */}
                        {!success && (
                            <Button type="submit" disabled={isSubmitting || !ownerEmail || !ownerDescription}>
                                {isSubmitting ? 'Sending...' : 'Send Claim'}
                            </Button>
                        )}
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

const FoundItemPage = () => {
    const router = useRouter();
    // Prefer using router.query['found-item'] directly if destructuring causes issues.
    const { 'found-item': itemId } = router.query;
    const [item, setItem] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null); // General page errors
    const [isDialogOpen, setIsDialogOpen] = useState(false); // Dialog open state
    const [isSubmittingClaim, setIsSubmittingClaim] = useState(false); // Claim submission loading state
    const [claimError, setClaimError] = useState(null); // Specific error for the claim dialog
    const [claimSuccess, setClaimSuccess] = useState(false); // Claim submission success state

    useEffect(() => {
        if (router.isReady && itemId) {
            setIsLoading(true);
            setError(null); // Reset general error on new fetch
            setClaimError(null); // Reset claim error
            setClaimSuccess(false); // Reset claim success
            getPublicFoundItem(itemId)
                .then(setItem)
                .catch(err => {
                    console.error("Error fetching found item:", err);
                    // Use a more specific error or check error type if available
                    if (err.response && err.response.status === 404) {
                        setError('Item not found.');
                    } else {
                        setError(err.message || 'Failed to load item details.');
                    }
                    setItem(null);
                })
                .finally(() => setIsLoading(false));
        } else if (!itemId && router.isReady) {
            // If no itemId is present after router is ready, it's likely an invalid URL
            setError('Item ID is missing.');
            setIsLoading(false);
        }
    }, [router.isReady, itemId]); // Dependency array is correct

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString(undefined, {
                year: 'numeric', month: 'long', day: 'numeric',
            });
        } catch (e) { return dateString; }
    };

    // Consolidated claim submission handler
    const handleClaimSubmit = async ({ ownerEmail, ownerDescription }) => {
        setIsSubmittingClaim(true);
        setClaimError(null); // Reset claim error before new attempt
        setClaimSuccess(false);
        try {
            await claimFoundItem(itemId, { ownerEmail, ownerDescription });
            setClaimSuccess(true); // Indicate success
            // Optionally close dialog after a delay or keep it open with success message
            setTimeout(() => {
                 setIsDialogOpen(false);
                 // Reset success after closing, ready for next potential open
                 setTimeout(() => setClaimSuccess(false), 500);
            }, 2000); // Close after 2 seconds
        } catch (err) {
            console.error("Claim submission error:", err);
            setClaimError(err.message || 'Failed to submit claim. Please try again.');
        } finally {
            setIsSubmittingClaim(false); // Ensure loading state is always reset
        }
    };

    // Render loading skeleton
    if (isLoading) {
        return (
            <div className="container mx-auto p-4 max-w-2xl">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2 mt-1" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-64 w-full rounded-lg" /> {/* Image carousel skeleton */}
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Render error state
    if (error) {
        return (
            <div className="container mx-auto p-4 max-w-2xl">
                <Alert variant="destructive" className="mt-4">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </div>
        );
    }

    // Render not found state
    // Render "Not Found" specifically if item is null AND there's no loading/error state
    // The error state now handles not found from API or missing ID
    if (!item && !isLoading && !error) {
         return (
             <div className="container mx-auto p-4 max-w-2xl">
                 <Alert>
                     <AlertTitle>Item Not Found</AlertTitle>
                     <AlertDescription>The item details could not be loaded, or the item does not exist.</AlertDescription>
                 </Alert>
             </div>
         );
     }

     // Only render item details if item exists and not loading
     if (!item || isLoading) {
        // This condition prevents rendering item details when item is null or still loading
        // Loading and Error states are handled above.
        // If item is null after loading and no error, the "Not Found" state above handles it.
        return null; // Or potentially return the loading skeleton again, though it should be covered
     }

    // Render found item details
    return (
        <div className="container mx-auto p-4 max-w-2xl">
            <Card>
                <CardHeader>
                    <CardTitle>Found Item Details</CardTitle>
                    <CardDescription>Reported on: {formatDate(item.created_at)}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Images Carousel */}
                    {item.image_filenames && item.image_filenames.length > 0 && (
                        <div className="w-full aspect-video relative">
                            <Carousel className="w-full">
                                <CarouselContent>
                                    {item.image_filenames.map((filename, index) => (
                                        <CarouselItem key={index}>
                                            <div className="relative aspect-video">
                                                <img
                                                    src={`/images/${filename}`}
                                                    alt={`Found item image ${index + 1}`}
                                                    className="absolute inset-0 w-full h-full object-contain bg-muted/30 rounded-lg"
                                                    loading="lazy"
                                                />
                                            </div>
                                        </CarouselItem>
                                    ))}
                                </CarouselContent>
                                {item.image_filenames.length > 1 && (
                                    <>
                                        <CarouselPrevious className="left-2" />
                                        <CarouselNext className="right-2" />
                                    </>
                                )}
                            </Carousel>
                        </div>
                    )}

                    {/* Item Details */}
                    <div className="space-y-4">
                        <div>
                            <h4 className="font-semibold text-sm">Description:</h4>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {item.description || 'N/A'}
                            </p>
                        </div>

                        <div>
                            <h4 className="font-semibold text-sm">Date Found:</h4>
                            <p className="text-sm text-muted-foreground">
                                {formatDate(item.date_found)}
                            </p>
                        </div>

                        {(item.city || item.state || item.country) && (
                            <div>
                                <h4 className="font-semibold text-sm">Location Found:</h4>
                                <p className="text-sm text-muted-foreground">
                                    {[item.city, item.state, item.country].filter(Boolean).join(', ')}
                                </p>
                            </div>
                        )}
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={() => setIsDialogOpen(true)} variant="outline" className="w-full">
                        This is my item
                    </Button>
                </CardFooter>
            </Card>

            {/* Claim Item Dialog */}
            <ClaimDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSubmit={handleClaimSubmit}
                isSubmitting={isSubmittingClaim}
                error={claimError} // Pass the specific claim error state to the dialog
                success={claimSuccess} // Pass success state if ClaimDialog handles it (optional)
            />
        </div>
    );
};

export default FoundItemPage;
