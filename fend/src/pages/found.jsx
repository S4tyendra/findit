import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { listPublicFoundItems } from '@/lib/apiClient'; // Import the new function
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

export default function FoundItemsPage() {
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        setIsLoading(true);
        setError(null);
        listPublicFoundItems() // Fetch first page
            .then(data => setItems(data || []))
            .catch(err => {
                console.error("Error fetching found items:", err);
                setError(err.message || 'Failed to load found items.');
                setItems([]);
            })
            .finally(() => setIsLoading(false));
    }, []);

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString(undefined, {
                 year: 'numeric', month: 'short', day: 'numeric'
            });
        } catch (e) { return dateString; }
    };

    const renderItemList = () => {
        if (isLoading) {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, index) => (
                         <Card key={index}>
                            <CardHeader><Skeleton className="h-5 w-3/4" /></CardHeader>
                            <CardContent><Skeleton className="h-4 w-full" /></CardContent>
                            <CardFooter><Skeleton className="h-4 w-1/2" /></CardFooter>
                         </Card>
                    ))}
                </div>
            );
        }

        if (error) {
            return (
                <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            );
        }

        if (items.length === 0) {
            return <p className="text-muted-foreground">No found items have been reported yet.</p>;
        }

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map(item => (
                    <Card key={item._id} className="group hover:shadow-lg transition-all duration-300 bg-card/50 backdrop-blur-sm">
                        <CardContent className="p-4">
                             {item.image_filenames && item.image_filenames.length > 0 && (
                                 <img
                                     src={`${process.env.NEXT_PUBLIC_API_HOST}/images/${item.image_filenames[0]}`}
                                     alt="Found item preview"
                                     className="rounded-lg aspect-video w-full object-cover mb-4"
                                     onError={(e) => e.target.style.display='none'}
                                 />
                             )}
                            <div className="space-y-2">
                                <h3 className="text-lg line-clamp-1 font-medium">Found Item</h3>
                                <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                                <div className="flex justify-between items-center text-xs text-muted-foreground">
                                    <span>Found on: {formatDate(item.date_found)}</span>
                                    <span>{[item.city, item.state, item.country].filter(Boolean).join(', ') || 'Location N/A'}</span>
                                </div>
                                <Link href={`/found-item/${item._id}`} passHref>
                                    <Button variant="ghost" size="sm" className="w-full mt-2 group-hover:bg-primary/10">
                                        View Details
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    };

    return (
        <div className="container mx-auto p-4">
             <div className="flex flex-col mb-6">
                <h1 className="text-2xl font-bold">Reported Found Items</h1>
                <p className="text-muted-foreground">Browse items that have been found and reported.</p>
             </div>
            {renderItemList()}
        </div>
    );
}