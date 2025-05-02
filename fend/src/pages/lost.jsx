import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { listPublicItems } from '@/lib/apiClient';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

export default function LostItemsPage() {
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    // TODO: Add pagination state

    useEffect(() => {
        setIsLoading(true);
        setError(null);
        listPublicItems() // Fetch first page
            .then(data => setItems(data || []))
            .catch(err => {
                console.error("Error fetching lost items:", err);
                setError(err.message || 'Failed to load lost items.');
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
            return <p className="text-muted-foreground">No lost items have been reported yet.</p>;
        }

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map(item => (
                    <Card key={item._id}>
                        <CardHeader>
                             {item.image_filenames && item.image_filenames.length > 0 && (
                                 <img
                                     src={`${process.env.NEXT_PUBLIC_API_HOST}/images/${item.image_filenames[0]}`}
                                     alt="Lost item preview"
                                     className="rounded border aspect-video object-cover mb-2"
                                     onError={(e) => e.target.style.display='none'}
                                 />
                             )}
                            <CardTitle className="text-lg truncate">{item.description.substring(0, 50)}{item.description.length > 50 ? '...' : ''}</CardTitle>
                             <CardDescription>Lost on: {formatDate(item.date_lost)}</CardDescription>
                        </CardHeader>
                        <CardFooter>
                            <Link href={`/item/${item._id}`} passHref>
                                <Button variant="outline" size="sm">View Details</Button>
                            </Link>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        );
    };

    return (
        <div className="container mx-auto p-4">
             <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Reported Lost Items</h1>
                 <Link href="/report" passHref>
                    <Button>Report a Lost Item</Button>
                </Link>
            </div>
            {renderItemList()}
            {/* TODO: Add pagination controls */}
        </div>
    );
}