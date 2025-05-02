import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getPublicFoundItem } from '@/lib/apiClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

const FoundItemPage = () => {
    const router = useRouter();
    const { 'found-item': itemId } = router.query;
    const [item, setItem] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (router.isReady && itemId) {
            setIsLoading(true);
            setError(null);
            getPublicFoundItem(itemId)
                .then(setItem)
                .catch(err => {
                    console.error("Error fetching found item:", err);
                    setError(err.message || 'Failed to load item details.');
                    setItem(null);
                })
                .finally(() => setIsLoading(false));
        } else if (!itemId && router.isReady) {
             setIsLoading(false);
        }
    }, [router.isReady, itemId]);

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString(undefined, {
                year: 'numeric', month: 'long', day: 'numeric',
            });
        } catch (e) { return dateString; }
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
                <Alert variant="destructive">
                    <AlertTitle>Error Loading Item</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </div>
        );
    }

    // Render not found state
    if (!item) {
        return (
            <div className="container mx-auto p-4 max-w-2xl">
                <Alert>
                    <AlertTitle>Item Not Found</AlertTitle>
                    <AlertDescription>The requested found item could not be found.</AlertDescription>
                </Alert>
            </div>
        );
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
            </Card>
        </div>
    );
};

export default FoundItemPage;