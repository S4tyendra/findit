import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { listPublicItems, listPublicFoundItems } from '@/lib/apiClient'; // Import both functions
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

export default function HomePage() {
    const [lostItems, setLostItems] = useState([]);
    const [foundItems, setFoundItems] = useState([]);
    const [isLoadingLost, setIsLoadingLost] = useState(true);
    const [isLoadingFound, setIsLoadingFound] = useState(true);
    const [errorLost, setErrorLost] = useState(null);
    const [errorFound, setErrorFound] = useState(null);
    // TODO: Add state for pagination

    useEffect(() => {
        setIsLoadingLost(true);
        setIsLoadingFound(true);
        setErrorLost(null);
        setErrorFound(null);

        Promise.all([
            listPublicItems(0, 6), // Fetch recent 6 lost items
            listPublicFoundItems(0, 6) // Fetch recent 6 found items
        ])
        .then(([lostData, foundData]) => {
            setLostItems(lostData || []);
            setFoundItems(foundData || []);
        })
        .catch(err => {
            console.error("Error fetching items for homepage:", err);
            // Set a generic error or specific ones if needed
            setErrorLost('Failed to load lost items.');
            setErrorFound('Failed to load found items.');
        })
        .finally(() => {
            setIsLoadingLost(false);
            setIsLoadingFound(false);
        });

    }, []); // Fetch only on initial mount

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString(undefined, {
                 year: 'numeric', month: 'short', day: 'numeric'
            });
        } catch (e) { return dateString; }
    };

    // Function to render Lost Items
    const renderLostItems = () => {
        if (isLoadingLost) {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, index) => (
                         <Card key={`lost-skeleton-${index}`}>
                            <CardHeader><Skeleton className="h-5 w-3/4" /></CardHeader>
                            <CardContent><Skeleton className="h-4 w-full" /></CardContent>
                            <CardFooter><Skeleton className="h-4 w-1/2" /></CardFooter>
                         </Card>
                    ))}
                </div>
            );
        }

        if (errorLost) {
            return (
                <Alert variant="destructive">
                    <AlertTitle>Error Loading Lost Items</AlertTitle>
                    <AlertDescription>{errorLost}</AlertDescription>
                </Alert>
            );
        }

        if (lostItems.length === 0) {
            return <p className="text-muted-foreground">No lost items recently reported.</p>;
        }

        // Render lost item cards
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {lostItems.map(item => (
                    <Card key={item._id}>
                        <CardHeader>
                             {item.image_filenames && item.image_filenames.length > 0 && (
                                 <img
                                     src={`/images/${item.image_filenames[0]}`}
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

    // Function to render Found Items
    const renderFoundItems = () => {
        if (isLoadingFound) {
            return (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {[...Array(3)].map((_, index) => ( // Show fewer skeletons for found items initially
                          <Card key={`found-skeleton-${index}`}>
                             <CardHeader><Skeleton className="h-5 w-3/4" /></CardHeader>
                             <CardContent><Skeleton className="h-4 w-full" /></CardContent>
                             <CardFooter><Skeleton className="h-4 w-1/2" /></CardFooter>
                          </Card>
                     ))}
                 </div>
             );
        }

        if (errorFound) {
            return (
                <Alert variant="destructive">
                    <AlertTitle>Error Loading Found Items</AlertTitle>
                    <AlertDescription>{errorFound}</AlertDescription>
                </Alert>
            );
        }

        if (foundItems.length === 0) {
            return <p className="text-muted-foreground">No found items recently reported.</p>;
        }

        // Render found item cards
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"> {/* Ensure this div closes */}
                {foundItems.map(item => (
                    <Card key={item._id}>
                        <CardHeader>
                             {item.image_filenames && item.image_filenames.length > 0 && (
                                 <img
                                     src={`/images/${item.image_filenames[0]}`}
                                     alt="Found item preview"
                                     className="rounded border aspect-video object-cover mb-2"
                                     onError={(e) => e.target.style.display='none'}
                                 />
                             )}
                            <CardTitle className="text-lg truncate">{item.description.substring(0, 50)}{item.description.length > 50 ? '...' : ''}</CardTitle>
                             <CardDescription>Found on: {formatDate(item.date_found)}</CardDescription>
                        </CardHeader>
                        <CardFooter>
                             {/* No detail page for found items yet */}
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
            <main className="flex-1 p-6 space-y-8">
                {/* Header Section */}
                <div className="flex justify-between items-center">
                     {/* Mobile Branding */}
                     <h1 className="text-xl font-bold md:hidden">Lost & Found</h1>
                     {/* Desktop Title - hidden on small screens */}
                     <h1 className="text-2xl font-bold hidden md:block">Welcome to Lost & Found</h1>
                     <div className="flex space-x-2">
                         <Link href="/report-found" passHref>
                             <Button>Report Found Item</Button>
                         </Link>
                         <Link href="/report" passHref>
                            <Button>Report Lost Item</Button>
                         </Link>
                     </div>
                 </div>

                 {/* Lost Items Section */}
                 <section>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">Recently Lost Items</h2>
                        <Link href="/lost" passHref>
                             <Button variant="link" size="sm">View All Lost</Button>
                        </Link>
                    </div>
                    {renderLostItems()}
                 </section>

                 {/* Found Items Section */}
                 <section>
                     <div className="flex justify-between items-center mb-4">
                         <h2 className="text-xl font-semibold">Recently Found Items</h2>
                         <Link href="/found" passHref>
                              <Button variant="link" size="sm">View All Found</Button>
                         </Link>
                     </div>
                     {renderFoundItems()}
                 </section>

                 {/* TODO: Add combined activity feed or search later */}
            </main>
        </div>
    );
}