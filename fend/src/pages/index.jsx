import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { listPublicItems } from '@/lib/apiClient';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

export default function HomePage() {
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    // TODO: Add state for pagination (skip, limit, total) later

    useEffect(() => {
        setIsLoading(true);
        setError(null);
        listPublicItems() // Fetch first page (default skip=0, limit=10)
            .then(data => {
                setItems(data || []); // Handle null response if API returns nothing
            })
            .catch(err => {
                console.error("Error fetching public items:", err);
                setError(err.message || 'Failed to load items.');
                setItems([]); // Clear items on error
            })
            .finally(() => setIsLoading(false));
    }, []); // Fetch only on initial mount

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
            // Render skeleton loaders
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
            return <p className="text-muted-foreground">No lost items reported yet. Be the first!</p>;
        }

        // Render actual item cards
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map(item => (
                    <Card key={item._id}> {/* Use _id */}
                        <CardHeader>
                            {/* Display first image if available */}
                             {item.image_filenames && item.image_filenames.length > 0 && (
                                 <img
                                     src={`/images/${item.image_filenames[0]}`}
                                     alt="Lost item preview"
                                     className="rounded border aspect-video object-cover mb-2"
                                     onError={(e) => e.target.style.display='none'} // Hide broken image link
                                 />
                             )}
                            <CardTitle className="text-lg truncate">{item.description.substring(0, 50)}{item.description.length > 50 ? '...' : ''}</CardTitle>
                             <CardDescription>Lost on: {formatDate(item.date_lost)}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {/* Maybe add location here later */}
                        </CardContent>
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
        <div className="flex min-h-screen">
            {/* Left Sidebar - Branding Placeholder */}
            <aside className="w-64 bg-card p-4 border-r hidden md:block">
                <h1 className="text-2xl font-bold mb-4">Lost & Found</h1>
                <p className="text-sm text-muted-foreground">Helping reunite owners with their lost items.</p>
                {/* Add more branding or navigation later */}
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold">Recently Reported Items</h2>
                     {/* Mobile Branding (Hidden on Medium+) */}
                     <h1 className="text-xl font-bold md:hidden">Lost & Found</h1>
                    <Link href="/report" passHref>
                        <Button>Report Lost Item</Button>
                    </Link>
                </div>

                {renderItemList()}

                {/* TODO: Add pagination controls later */}
            </main>
        </div>
    );
}