let lat, lng, myMap;

// Check if geolocation is available in the browser
if ('geolocation' in navigator) {
    // Get the current position of the user
    navigator.geolocation.getCurrentPosition(function(position) { 
        lat = position.coords.latitude; // User's latitude
        lng = position.coords.longitude; // User's longitude

        // Initialize the map with the user's current location
        myMap = L.map('map').setView([lat, lng], 13);

        // Add OpenStreetMap tiles to the map
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            minZoom: '13',
        }).addTo(myMap);

        // Add a marker to the map at the user's location
        const marker = L.marker([lat, lng]);
        marker.addTo(myMap).bindPopup('<p><b>Your Location</b></p>').openPopup();

        // Set up interaction for business search
        initializeBusinessInteraction();
    }, function(error) {
        // Handle geolocation errors
        console.error("Geolocation error:", error);
    });
}

// Set up event listener for the business search button
function initializeBusinessInteraction() {
    document.getElementById('searchButton').addEventListener('click', addBusinesses);
}


// Function to add businesses to the map based on the user's location
async function addBusinesses() {
    if (!myMap || isNaN(lat) || isNaN(lng)) {
        console.error('Map is not initialized or invalid lat/lng');
        return;
    }

    const data = await placeSearch(lat, lng);

    if (data && data.results) {
        const businessList = document.getElementById('businessList');
        businessList.innerHTML = '';

        data.results.forEach((business, index) => {
            // Extract latitude and longitude
            const businessLat = business.geocode.latitude;
            const businessLng = business.geocode.longitude;

            if (typeof businessLat === 'number' && typeof businessLng === 'number') {
                const listItem = document.createElement('li');
                listItem.innerHTML = `<strong>${business.name}</strong><br>${business.address}<br>Categories: ${business.categories}`;
                listItem.id = `business-${index}`;
                listItem.setAttribute('data-lat', businessLat);
                listItem.setAttribute('data-lng', businessLng);
                listItem.addEventListener('click', function() {
                    placeMarker(this);
                });
                businessList.appendChild(listItem);

                const businessMarker = L.marker([businessLat, businessLng]);
                businessMarker.addTo(myMap).bindPopup(`<p><b>${business.name}</b></p>`);
            } else {
                console.error('Invalid LatLng data for business:', business);
            }
        });
    }
}




// Function to place a marker on the map based on clicked list item
function placeMarker(listItem) {
    const lat = parseFloat(listItem.getAttribute('data-lat'));
    const lng = parseFloat(listItem.getAttribute('data-lng'));

    // Check if lat and lng are valid numbers
    if (!isNaN(lat) && !isNaN(lng)) {
        // Create and add a marker to the map at the specified location
        const marker = L.marker([lat, lng]);
        marker.addTo(myMap).bindPopup(`<p><b>${listItem.textContent}</b></p>`).openPopup();
    } else {
        console.error('Invalid LatLng for marker:', lat, lng);
    }
}


// Function to search for nearby places using Foursquare API
async function placeSearch(lat, lng) {
    try {
        // Switch to the 'nearby' endpoint
        const endpoint = 'https://api.foursquare.com/v3/places/nearby';

        // Set up the query parameters
        const searchParams = new URLSearchParams({
            ll: `${lat},${lng}`,
            radius: 1000, // Radius in meters (adjust as needed)
            limit: 30,
        });

        // Make the API request to the 'nearby' endpoint
        const response = await fetch(`${endpoint}?${searchParams}`, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                Authorization: 'fsq3Xb+wqv1rmZC2svyt24c8cvGfRnYhbK+kM8xm9lCn3KY=' 
            }
        });

        // Handle non-successful responses
        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorBody.message}`);
        }

        // Parse the JSON response
        const data = await response.json();

        if (data && Array.isArray(data.results)) {
            return {
                results: data.results.map(place => {
                    // Ensure that main geocode is available
                    if (place.geocodes && place.geocodes.main) {
                        return {
                            name: place.name, 
                            geocode: place.geocodes.main, // Geolocation data
                            address: place.location ? place.location.formatted_address : '',
                            categories: place.categories ? place.categories.map(c => c.name).join(', ') : '',
                            
                        };
                    } else {
                        console.error('Invalid geocode data for place:', place);
                        return null;
                    }
                }).filter(place => place !== null)
            };
        } else {
            // Handle cases where no results are returned
            return { results: [] };
        }

    } catch (err) {
        // Handle errors during the API request
        console.error('Error occurred during place search:', err);
        return { error: err.message, results: [] };
    }
}

