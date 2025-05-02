import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { listPublicItems, listPublicFoundItems } from '@/lib/apiClient';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Search, Map, Bell, ChevronLeft, ChevronRight } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";

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

    // Function to truncate description to 5 words
    const truncateDescription = (desc) => {
        if (!desc) return 'No description available';
        const words = desc.split(' ');
        return words.slice(0, 5).join(' ') + (words.length > 5 ? '...' : '');
    };

    // Function to render image carousel
    const renderImageCarousel = (images) => {
        if (!images || images.length === 0) {
            return (
                <div className="w-full aspect-square bg-muted/30 rounded-lg flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">No images</p>
                </div>
            );
        }

        return (
            <Carousel className="w-full">
                <CarouselContent>
                    {images.map((filename, index) => (
                        <CarouselItem key={index}>
                            <div className="relative aspect-square">
                                <img 
                                    src={`http://localhost:5424/images/${filename}`} 
                                    alt={`Item image ${index + 1}`}
                                    className="absolute inset-0 w-full h-full object-cover rounded-lg"
                                    loading="lazy"
                                />
                            </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>
                {images.length > 1 && (
                    <>
                        <CarouselPrevious className="left-2" />
                        <CarouselNext className="right-2" />
                    </>
                )}
            </Carousel>
        );
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
                            <Button size="lg" className="gap-2" asChild>
                                <Link href="/report">
                                    Report Lost Item <ArrowRight className="w-4 h-4" />
                                </Link>
                            </Button>
                            <Button size="lg" variant="outline" className="gap-2" asChild>
                                <Link href="/found">
                                    Browse Found Items <Search className="w-4 h-4" />
                                </Link>
                            </Button>
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
                                        <CardContent className="p-4">
                                            <Skeleton className="h-[300px] w-full rounded-lg mb-4" />
                                            <Skeleton className="h-4 w-2/3 mb-2" />
                                            <Skeleton className="h-4 w-full" />
                                        </CardContent>
                                    </Card>
                                ))
                            ) : (
                                lostItems.map(item => (
                                    <Card key={item._id} className="group hover:shadow-lg transition-all duration-300 bg-card/50 backdrop-blur-sm">
                                        <CardContent className="p-4">
                                            {renderImageCarousel(item.image_filenames)}
                                            <div className="mt-4 space-y-2">
                                                <p className="text-sm text-muted-foreground">
                                                    {truncateDescription(item.description)}
                                                </p>
                                                <div className="flex justify-between items-center text-xs text-muted-foreground">
                                                    <span>Lost: {formatDate(item.date_lost || item.created_at)}</span>
                                                    <span>{[item.city, item.state, item.country].filter(Boolean).join(', ') || 'Location N/A'}</span>
                                                </div>
                                                <Link href={`/item/${item._id}`} passHref>
                                                    <Button variant="ghost" size="sm" className="w-full border mt-2 group-hover:bg-primary/10">
                                                        View Details
                                                    </Button>
                                                </Link>
                                            </div>
                                        </CardContent>
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
                                        <CardContent className="p-4">
                                            <Skeleton className="h-[300px] w-full rounded-lg mb-4" />
                                            <Skeleton className="h-4 w-2/3 mb-2" />
                                            <Skeleton className="h-4 w-full" />
                                        </CardContent>
                                    </Card>
                                ))
                            ) : (
                                foundItems.map(item => (
                                    <Card key={item._id} className="group hover:shadow-lg transition-all duration-300 bg-card/50 backdrop-blur-sm">
                                        <CardContent className="p-4">
                                            {renderImageCarousel(item.image_filenames)}
                                            <div className="mt-4 space-y-2">
                                                <p className="text-sm text-muted-foreground">
                                                    {truncateDescription(item.description)}
                                                </p>
                                                <div className="flex justify-between items-center text-xs text-muted-foreground">
                                                    <span>Found: {formatDate(item.date_found || item.created_at)}</span>
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
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}