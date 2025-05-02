import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getPublicItem, notifyFound } from '@/lib/apiClient'; // Import notifyFound
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from '@/components/ui/button';
import { Textarea } from "@/components/ui/textarea"; // Need Textarea for description
import LocationSelector from '@/components/LocationSelector'; // Need LocationSelector

// Imports for the 'Found' modal (Dialog, Input, Label)
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MAX_FINDER_IMAGES = 5;

const PublicItemPage = () => {
    const router = useRouter();
    const { item_id } = router.query;
    const [item, setItem] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // State for the 'Found Item' modal
    const [isFoundModalOpen, setIsFoundModalOpen] = useState(false);
    const [finderContact, setFinderContact] = useState('');
    const [finderDescription, setFinderDescription] = useState(''); // New state
    const [dateFound, setDateFound] = useState(null); // New state
    const [foundLocation, setFoundLocation] = useState({ country: '', state: '', city: '' }); // New state
    const [finderImages, setFinderImages] = useState([]); // New state for finder images
    const [isSubmittingFound, setIsSubmittingFound] = useState(false);
    const [foundSubmitError, setFoundSubmitError] = useState(null);
    const [foundSubmitSuccess, setFoundSubmitSuccess] = useState(false);

    // --- Fetch Initial Item Data ---
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
            setIsLoading(false);
        }
    }, [router.isReady, item_id]);

    // --- Found Modal Image Handling ---
    const handleFinderImageChange = (event) => {
        const files = Array.from(event.target.files);
        if (finderImages.length + files.length > MAX_FINDER_IMAGES) {
            setFoundSubmitError(`You can upload a maximum of ${MAX_FINDER_IMAGES} images.`);
            event.target.value = null;
        } else {
            setFinderImages(prevImages => [...prevImages, ...files]);
            setFoundSubmitError(null);
        }
    };

    // --- Found Modal Submit Handling (Updated for FormData) ---
    const handleFoundSubmit = async (event) => {
        event.preventDefault();
        setIsSubmittingFound(true);
        setFoundSubmitError(null);
        setFoundSubmitSuccess(false);

        // Create FormData
        const formData = new FormData();
        formData.append('finder_contact', finderContact);
        if (finderDescription) formData.append('finder_description', finderDescription);
        if (dateFound) formData.append('date_found', dateFound.toISOString());
        if (foundLocation.country) formData.append('found_country', foundLocation.country);
        if (foundLocation.state) formData.append('found_state', foundLocation.state);
        if (foundLocation.city) formData.append('found_city', foundLocation.city);
        finderImages.forEach(imageFile => {
            formData.append('finder_images', imageFile);
        });

        try {
            await notifyFound(item_id, formData);
            // --- End Mock ---

            setFoundSubmitSuccess(true);
            setTimeout(() => {
                setIsFoundModalOpen(false);
                // Reset form state
                setFinderContact('');
                setFinderDescription('');
                setDateFound(null);
                setFoundLocation({ country: '', state: '', city: '' });
                setFinderImages([]);
                setFoundSubmitError(null);
                setFoundSubmitSuccess(false);
            }, 3000);
        } catch (err) {
            setFoundSubmitError(err.message || "Failed to submit found report.");
        } finally {
            setIsSubmittingFound(false);
        }
    };

    // Basic Date Input Handler (for Date Found)
    const handleDateFoundChange = (e) => {
        try {
            const selectedDate = new Date(e.target.value);
            if (!isNaN(selectedDate.getTime())) {
                setDateFound(selectedDate);
                setFoundSubmitError(null); // Clear date-related error
            } else {
                setDateFound(null);
            }
        } catch (err) { setDateFound(null); }
    };

    const formatDate = (dateString) => { /* ... (same as before) ... */
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString(undefined, {
                year: 'numeric', month: 'long', day: 'numeric',
            });
        } catch (e) { return dateString; }
    };

    if (isLoading) { /* Skeleton UI */
        return (<div className="container mx-auto p-4 max-w-2xl"> <Card> <CardHeader> <Skeleton className="h-6 w-3/4" /> <Skeleton className="h-4 w-1/2 mt-1" /> </CardHeader> <CardContent className="space-y-4"> <Skeleton className="h-4 w-full" /> <Skeleton className="h-4 w-full" /> <Skeleton className="h-20 w-full" /> </CardContent> <CardFooter> <Skeleton className="h-10 w-32" /> </CardFooter> </Card> </div>);
    }
    if (error) { /* Error UI */
        return (<div className="container mx-auto p-4 max-w-2xl"> <Alert variant="destructive"> <AlertTitle>Error Loading Item</AlertTitle> <AlertDescription>{error}</AlertDescription> </Alert> </div>);
    }
    if (!item) { /* Not Found UI */
        return (<div className="container mx-auto p-4 max-w-2xl"> <Alert> <AlertTitle>Item Not Found</AlertTitle> <AlertDescription>The requested item could not be found.</AlertDescription> </Alert> </div>);
    }

    // --- Render Public Item Details ---
    return (
        <div className="container mx-auto p-4 max-w-2xl">
            <Card>
                <CardHeader>
                    <CardTitle>Lost Item Details</CardTitle>
                    <CardDescription>Reported on: {formatDate(item.created_at)}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div><h4 className="font-semibold text-sm">Description:</h4><p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.description || 'N/A'}</p></div>
                    <div><h4 className="font-semibold text-sm">Date Lost:</h4><p className="text-sm text-muted-foreground">{formatDate(item.date_lost)}</p></div>
                    {item.product_link && (<div><h4 className="font-semibold text-sm">Product Link:</h4><a href={item.product_link} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline break-all">{item.product_link}</a></div>)}
                    <div><h4 className="font-semibold text-sm">Images:</h4>{item.image_filenames && item.image_filenames.length > 0 ? (<div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">{item.image_filenames.map(filename => (<img key={filename} src={`${process.env.NEXT_PUBLIC_API_HOST}/images/${filename}`} alt="Lost item image" className="rounded border aspect-square object-cover" onError={(e) => e.target.style.display = 'none'} />))}</div>) : (<p className="text-sm text-muted-foreground">No images available.</p>)}</div>
                    {(item.city || item.state || item.country) && (<div><h4 className="font-semibold text-sm">Location:</h4><p className="text-sm text-muted-foreground">{[item.city, item.state, item.country].filter(Boolean).join(', ')}</p></div>)}
                </CardContent>
                <CardFooter>
                    {/* === Enhanced Found Item Dialog === */}
                    <Dialog open={isFoundModalOpen} onOpenChange={setIsFoundModalOpen}>
                        <DialogTrigger asChild>
                            <Button>I Found This Item</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-lg bg-card border"> {/* Adjusted width & style */}
                            <DialogHeader>
                                <DialogTitle>Report Item Found</DialogTitle>
                                <DialogDescription>
                                    Provide details about the item you found. This information and your contact details will be sent to the original reporter.
                                </DialogDescription>
                            </DialogHeader>
                            {!foundSubmitSuccess ? (
                                <form onSubmit={handleFoundSubmit} className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2"> {/* Scrollable */}
                                    {/* Finder Contact */}
                                    <div>
                                        <Label htmlFor="finderContact">Your Contact Info *</Label>
                                        <Input id="finderContact" value={finderContact} onChange={(e) => setFinderContact(e.target.value)} placeholder="Email, phone, etc." required minLength={5} className="mt-1" />
                                    </div>
                                    {/* Finder Description */}
                                    <div>
                                        <Label htmlFor="finderDescription">Description (Optional)</Label>
                                        <Textarea id="finderDescription" value={finderDescription} onChange={(e) => setFinderDescription(e.target.value)} placeholder="Describe the item you found, its condition, etc." maxLength={1000} className="mt-1" />
                                    </div>
                                    {/* Date Found */}
                                    <div>
                                        <Label htmlFor="dateFound">Date Found (Optional)</Label>
                                        <Input id="dateFound" type="date" onChange={handleDateFoundChange} className="mt-1" />
                                    </div>
                                    {/* Location Found */}
                                    <div>
                                        <Label>Location Found (Optional)</Label>
                                        <div className="mt-1 border p-3 rounded-md">
                                            <LocationSelector onLocationChange={setFoundLocation} initialLocation={foundLocation} />
                                        </div>
                                    </div>
                                    {/* Finder Images */}
                                    <div>
                                        <Label htmlFor="finderImages">Upload Images (Optional, up to {MAX_FINDER_IMAGES})</Label>
                                        <Input id="finderImages" type="file" multiple accept="image/jpeg, image/png, image/webp, image/gif" onChange={handleFinderImageChange} className="mt-1" />
                                        <div className="mt-2 text-sm text-muted-foreground"> Selected images: {finderImages.length} </div>
                                        {finderImages.length > 0 && (<ul className="mt-2 list-disc list-inside text-xs">{finderImages.map((file, index) => (<li key={index}>{file.name}</li>))}</ul>)}
                                    </div>

                                    {foundSubmitError && <p className="text-red-500 text-sm">{foundSubmitError}</p>}

                                    <DialogFooter className="mt-4">
                                        <Button type="submit" disabled={isSubmittingFound}>
                                            {isSubmittingFound ? 'Submitting...' : 'Send Found Report'}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            ) : (
                                <div className="py-4 text-center">
                                    <p className="text-green-600 font-medium">Thank you! Your report has been sent to the item's owner.</p>
                                </div>
                            )}
                        </DialogContent>
                    </Dialog>
                </CardFooter>
            </Card>
        </div>
    );
};

export default PublicItemPage;