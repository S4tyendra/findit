import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { listPublicItems, listPublicFoundItems } from '@/lib/apiClient';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Search, Map, Bell } from 'lucide-react';

export default function HomePage() {
    const [lostItems, setLostItems] = useState([]);
    const [foundItems, setFoundItems] = useState([]);
    const [isLoadingLost, setIsLoadingLost] = useState(true);
    const [isLoadingFound, setIsLoadingFound] = useState(true);
    const [errorLost, setErrorLost] = useState(null);
    const [errorFound, setErrorFound] = useState(null);

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

    return (
        <div className="space-y-12 pb-8">
            {/* Hero Section */}
            <section className="relative py-20 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/10 to-secondary/10" />
                <div className="container relative">
                    <div className="max-w-3xl mx-auto text-center space-y-8">
                        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                            Lost Something?<br />We'll Help You Find It
                        </h1>
                        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
                            Our community-driven platform helps connect lost items with their owners. Report what you've lost or found, and let's make reuniting easier.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4">
                            <Link href="/report" passHref>
                                <Button size="lg" className="gap-2">
                                    Report Lost Item <ArrowRight className="w-4 h-4" />
                                </Button>
                            </Link>
                            <Link href="/found" passHref>
                                <Button size="lg" variant="outline" className="gap-2">
                                    Browse Found Items <Search className="w-4 h-4" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="container">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-card/50 backdrop-blur-sm">
                        <CardHeader>
                            <Search className="w-8 h-8 text-primary mb-2" />
                            <CardTitle>Easy Search</CardTitle>
                            <CardDescription>
                                Quickly search through reported items with our smart filtering system.
                            </CardDescription>
                        </CardHeader>
                    </Card>
                    <Card className="bg-card/50 backdrop-blur-sm">
                        <CardHeader>
                            <Map className="w-8 h-8 text-primary mb-2" />
                            <CardTitle>Location Tracking</CardTitle>
                            <CardDescription>
                                Track items with precise location information to increase chances of recovery.
                            </CardDescription>
                        </CardHeader>
                    </Card>
                    <Card className="bg-card/50 backdrop-blur-sm">
                        <CardHeader>
                            <Bell className="w-8 h-8 text-primary mb-2" />
                            <CardTitle>Instant Alerts</CardTitle>
                            <CardDescription>
                                Get notified immediately when someone finds an item matching your description.
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </div>
            </section>

            {/* Recent Items Sections */}
            <section className="container">
                <div className="space-y-12">
                    {/* Lost Items */}
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold">Recently Lost Items</h2>
                            <Link href="/lost" className="text-primary hover:text-primary/80 transition-colors">
                                View all <ArrowRight className="w-4 h-4 inline ml-1" />
                            </Link>
                        </div>
                        
                        {errorLost && (
                            <Alert variant="destructive">
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{errorLost}</AlertDescription>
                            </Alert>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {isLoadingLost ? (
                                Array(3).fill(0).map((_, i) => (
                                    <Card key={i} className="bg-card/50 backdrop-blur-sm">
                                        <CardHeader>
                                            <Skeleton className="h-4 w-2/3" />
                                            <Skeleton className="h-4 w-full mt-2" />
                                        </CardHeader>
                                        <CardContent>
                                            <Skeleton className="h-20 w-full rounded-lg" />
                                        </CardContent>
                                    </Card>
                                ))
                            ) : (
                                lostItems.map(item => (
                                    <Card key={item._id} className="group hover:shadow-lg transition-all duration-300 bg-card/50 backdrop-blur-sm">
                                        <CardHeader>
                                            <CardTitle className="line-clamp-1">{item.title}</CardTitle>
                                            <CardDescription className="line-clamp-2">{item.description}</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-muted-foreground">
                                                Lost on: {formatDate(item.date)}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                Location: {item.location || 'Not specified'}
                                            </p>
                                        </CardContent>
                                        <CardFooter>
                                            <Link href={`/item/${item._id}`} passHref>
                                                <Button variant="ghost" className="w-full group-hover:bg-primary/10">
                                                    View Details
                                                </Button>
                                            </Link>
                                        </CardFooter>
                                    </Card>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Found Items */}
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold">Recently Found Items</h2>
                            <Link href="/found" className="text-primary hover:text-primary/80 transition-colors">
                                View all <ArrowRight className="w-4 h-4 inline ml-1" />
                            </Link>
                        </div>

                        {errorFound && (
                            <Alert variant="destructive">
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{errorFound}</AlertDescription>
                            </Alert>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {isLoadingFound ? (
                                Array(3).fill(0).map((_, i) => (
                                    <Card key={i} className="bg-card/50 backdrop-blur-sm">
                                        <CardHeader>
                                            <Skeleton className="h-4 w-2/3" />
                                            <Skeleton className="h-4 w-full mt-2" />
                                        </CardHeader>
                                        <CardContent>
                                            <Skeleton className="h-20 w-full rounded-lg" />
                                        </CardContent>
                                    </Card>
                                ))
                            ) : (
                                foundItems.map(item => (
                                    <Card key={item._id} className="group hover:shadow-lg transition-all duration-300 bg-card/50 backdrop-blur-sm">
                                        <CardHeader>
                                            <CardTitle className="line-clamp-1">{item.title}</CardTitle>
                                            <CardDescription className="line-clamp-2">{item.description}</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-muted-foreground">
                                                Found on: {formatDate(item.date)}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                Location: {item.location || 'Not specified'}
                                            </p>
                                        </CardContent>
                                        <CardFooter>
                                            <Link href={`/item/${item._id}`} passHref>
                                                <Button variant="ghost" className="w-full group-hover:bg-primary/10">
                                                    View Details
                                                </Button>
                                            </Link>
                                        </CardFooter>
                                    </Card>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}