import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Button } from "@/components/ui/button"; // Assuming shadcn setup
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
// TODO: import { DatePicker } from "@/components/ui/datepicker"; // Assuming a datepicker component exists or needs creation
import LocationSelector from '@/components/LocationSelector'; // Import the new component
import { createLostItem } from '@/lib/apiClient';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const ReportLostItemPage = () => {
    const router = useRouter();
    const [description, setDescription] = useState('');
    const [reporterEmail, setReporterEmail] = useState('');
    const [dateLost, setDateLost] = useState(null);
    const [productLink, setProductLink] = useState('');
    const [location, setLocation] = useState({ country: '', state: '', city: '' }); // State for location
    const [images, setImages] = useState([]); // Store File objects
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');

    const MAX_IMAGES = 5;

    const handleImageChange = (event) => {
        const files = Array.from(event.target.files);
        if (images.length + files.length > MAX_IMAGES) {
            setError(`You can upload a maximum of ${MAX_IMAGES} images.`);
            // Optionally clear the file input
             event.target.value = null;
        } else {
            setImages(prevImages => [...prevImages, ...files]);
            setError(null); // Clear error if adding was successful
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccessMessage('');

        if (!dateLost) {
             setError("Please select the date the item was lost.");
             setIsLoading(false);
             return;
        }
        const formData = new FormData();
        formData.append('description', description);
        formData.append('reporter_email', reporterEmail);
        // Format date to ISO string as expected by backend (ensure it's UTC or has timezone)
        formData.append('date_lost', dateLost.toISOString());
        formData.append('product_link', productLink);
    // Add location data if available
   if (location.country) formData.append('country', location.country);
   if (location.state) formData.append('state', location.state);
   if (location.city) formData.append('city', location.city);

   images.forEach(imageFile => {
       formData.append('images', imageFile);
   });

        try {
            const result = await createLostItem(formData);
            setSuccessMessage(`Report submitted successfully! Your management link has been sent to ${reporterEmail}.`);
            // Optionally clear the form
            setDescription('');
            setReporterEmail('');
            setDateLost(null);
            setProductLink('');
            setLocation({ country: '', state: '', city: '' }); // Reset location
            setImages([]);
            // Clear file input visually if possible (might need ref)
            const fileInput = document.getElementById('images');
            if (fileInput) fileInput.value = null;

            // Maybe redirect after a delay?
            // setTimeout(() => router.push('/'), 5000);
        } catch (err) {
            setError(err.message || 'Failed to submit report.');
        } finally {
            setIsLoading(false);
        }
    };

    // Basic Date Input (Replace with shadcn DatePicker later)
    const handleDateChange = (e) => {
        try {
             const selectedDate = new Date(e.target.value);
             // Basic validation: check if it's a valid date
             if (!isNaN(selectedDate.getTime())) {
                 setDateLost(selectedDate);
                 setError(null); // Clear date-related error
             } else {
                 setDateLost(null); // Reset if invalid input
             }
        } catch (err) {
            setDateLost(null); // Reset on error
        }
    };

    return (
        <div className="container mx-auto p-4 max-w-2xl">
            <Card>
                <CardHeader>
                    <CardTitle>Report a Lost Item</CardTitle>
                    <CardDescription>Fill in the details of the item you lost. We'll send a management link to your email.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="description">Item Description *</Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Detailed description of the lost item..."
                                required
                                minLength={10}
                                maxLength={1000}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="reporterEmail">Your Email *</Label>
                            <Input
                                id="reporterEmail"
                                type="email"
                                value={reporterEmail}
                                onChange={(e) => setReporterEmail(e.target.value)}
                                placeholder="your.email@example.com"
                                required
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="dateLost">Date Lost *</Label>
                            {/* Replace with shadcn DatePicker */}
                            <Input
                                id="dateLost"
                                type="date"
                                onChange={handleDateChange}
                                required
                                className="mt-1"
                            />
                            {/* Example using a potential shadcn DatePicker: */}
                            {/* <DatePicker date={dateLost} onDateChange={setDateLost} /> */}
                        </div>
                        <div>
                            <Label htmlFor="productLink">Product Link (Optional)</Label>
                            <Input
                                id="productLink"
                                type="url"
                                value={productLink}
                                onChange={(e) => setProductLink(e.target.value)}
                                placeholder="https://example.com/product-page"
                                className="mt-1"
                            />
                        </div>
                         {/* --- Location Selector --- */}
                        <LocationSelector onLocationChange={setLocation} />
                         {/* ------------------------- */}
                        <div>
                            <Label htmlFor="images">Images (Up to {MAX_IMAGES})</Label>
                            <Input
                                id="images"
                                type="file"
                                multiple
                                accept="image/jpeg, image/png, image/webp, image/gif"
                                onChange={handleImageChange}
                                className="mt-1"
                            />
                            <div className="mt-2 text-sm text-muted-foreground">
                                Selected images: {images.length}
                            </div>
                            {images.length > 0 && (
                                <ul className="mt-2 list-disc list-inside">
                                    {images.map((file, index) => (
                                        <li key={index} className="text-xs">{file.name}</li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {error && <p className="text-red-500 text-sm">{error}</p>}
                        {successMessage && <p className="text-green-600 text-sm">{successMessage}</p>}

                        <Button type="submit" disabled={isLoading} className="w-full">
                            {isLoading ? 'Submitting...' : 'Submit Report'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default ReportLostItemPage;