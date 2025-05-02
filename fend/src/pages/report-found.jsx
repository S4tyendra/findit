import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import LocationSelector from '@/components/LocationSelector';
import { createFoundItem } from '@/lib/apiClient'; // Use the new API function
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from 'sonner';

const MAX_IMAGES = 5; // Consistent max images

const ReportFoundItemPage = () => {
    const router = useRouter();
    const [description, setDescription] = useState('');
    const [dateFound, setDateFound] = useState(null); // Date FOUND
    const [finderContact, setFinderContact] = useState(''); // Optional contact
    const [location, setLocation] = useState({ country: '', state: '', city: '' });
    const [images, setImages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');

    const handleImageChange = (event) => {
        const files = Array.from(event.target.files);
        if (images.length + files.length > MAX_IMAGES) {
            setError(`Maximum ${MAX_IMAGES} images allowed.`);
            event.target.value = null;
        } else {
            setImages(prevImages => [...prevImages, ...files]);
            setError(null);
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccessMessage('');

        if (!dateFound) {
             setError("Please select the date you found the item.");
             setIsLoading(false);
             return;
        }

        const formData = new FormData();
        formData.append('description', description);
        formData.append('date_found', dateFound.toISOString()); // Use 'date_found' key
        if (finderContact) formData.append('finder_contact', finderContact);
        if (location.country) formData.append('country', location.country);
        if (location.state) formData.append('state', location.state);
        if (location.city) formData.append('city', location.city);
        images.forEach(imageFile => {
            formData.append('images', imageFile);
        });

        try {
            const result = await createFoundItem(formData); // Call the correct API function
            toast(`Found item report submitted successfully! Thank you.`);
            router.push('/found');
            setDescription('');
            setFinderContact('');
            setDateFound(null);
            setLocation({ country: '', state: '', city: '' });
            setImages([]);
            const fileInput = document.getElementById('images');
            if (fileInput) fileInput.value = null;
             // Maybe redirect to a "found items" list page later?
             // setTimeout(() => router.push('/found-items'), 5000); // Example
        } catch (err) {
            setError(err.message || 'Failed to submit report.');
        } finally {
            setIsLoading(false);
        }
    };

    // Basic Date Input Handler
    const handleDateChange = (e) => {
        try {
             const selectedDate = new Date(e.target.value);
             if (!isNaN(selectedDate.getTime())) {
                 setDateFound(selectedDate);
                 setError(null);
             } else {
                 setDateFound(null);
             }
        } catch (err) { setDateFound(null); }
    };

    return (
        <div className="container mx-auto p-4 max-w-2xl">
            <Card>
                <CardHeader>
                    <CardTitle>Report an Item You Found</CardTitle>
                    <CardDescription>Provide details about the item you found to help reunite it with its owner.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Description */}
                        <div>
                            <Label htmlFor="description">Item Description *</Label>
                            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detailed description of the item you found..." required minLength={10} maxLength={1000} className="mt-1"/>
                        </div>
                        {/* Date Found */}
                        <div>
                            <Label htmlFor="dateFound">Date Found *</Label>
                             {/* TODO: Replace with shadcn DatePicker */}
                            <Input id="dateFound" type="date" onChange={handleDateChange} required className="mt-1"/>
                        </div>
                        {/* Finder Contact (Optional) */}
                        <div>
                            <Label htmlFor="finderContact">Your email *</Label>
                            <Input id="finderContact" type="email" required value={finderContact} onChange={(e) => setFinderContact(e.target.value)} placeholder="Email (If you want the owner to contact you)" className="mt-1"/>
                             <p className="text-xs text-muted-foreground mt-1">If provided, this may be shown publicly or shared if a match is found.</p>
                        </div>
                        {/* Location Found */}
                         <div>
                            <Label>Location Found (Optional but helpful)</Label>
                            <div className="mt-1 border p-3 rounded-md">
                                <LocationSelector onLocationChange={setLocation} />
                            </div>
                        </div>
                        {/* Images */}
                        <div>
                            <Label htmlFor="images">Images (Up to {MAX_IMAGES})</Label>
                            <Input id="images" type="file" multiple accept="image/jpeg, image/png, image/webp, image/gif" onChange={handleImageChange} className="mt-1"/>
                             <div className="mt-2 text-sm text-muted-foreground"> Selected: {images.length} </div>
                             {images.length > 0 && (<ul className="mt-2 list-disc list-inside text-xs">{images.map((file, index) => (<li key={index}>{file.name}</li>))}</ul>)}
                        </div>

                        {error && <p className="text-red-500 text-sm">{error}</p>}
                        {successMessage && <p className="text-green-600 text-sm">{successMessage}</p>}

                        <Button type="submit" disabled={isLoading} className="w-full">
                            {isLoading ? 'Submitting...' : 'Submit Found Item Report'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default ReportFoundItemPage;