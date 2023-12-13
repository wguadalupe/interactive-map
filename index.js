let lat, lng, myMap;

if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(function(position) { 
        lat = position.coords.latitude;
        lng = position.coords.longitude;

        // Create map here to use lat and lng
        myMap = L.map('map').setView([lat, lng], 13);

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            minZoom: '13',
        }).addTo(myMap);

        // Create and add a geolocation marker
        const marker = L.marker([lat, lng]);
        marker.addTo(myMap).bindPopup('<p><b>Your Location</b></p>').openPopup();

        initializeBusinessInteraction();
    }, function(error) {
        // Geolocation error
        console.error("Geolocation error:", error);
    });
}

function initializeBusinessInteraction() {
    document.getElementById('searchButton').addEventListener('click', addBusinesses);
}

async function addBusinesses() {
    if (!myMap) {
        console.error('Map is not initialized');
        return;
    }

    const businessType = document.getElementById('businessType').value;
    const data = await placeSearch(businessType, lat, lng);

    if (data && data.results) {
        const businessList = document.getElementById('businessList');
        businessList.innerHTML = ''; 

        data.results.forEach((business, index) => {
            const listItem = document.createElement('li');
            listItem.textContent = business.name;
            listItem.id = `business-${index}`; // Assign a unique ID
            listItem.setAttribute('data-lat', business.geocode.main.lat);
            listItem.setAttribute('data-lng', business.geocode.main.lng);
            listItem.addEventListener('click', function() {
                placeMarker(this);
            });
            businessList.appendChild(listItem);
        });
    }
}

function placeMarker(listItem) {
    const lat = listItem.getAttribute('data-lat');
    const lng = listItem.getAttribute('data-lng');
    const marker = L.marker([lat, lng]);
    marker.addTo(myMap).bindPopup(`<p><b>${listItem.textContent}</b></p>`).openPopup();
}

// Function for place search
async function placeSearch(query, lat, lng) {
    try {
        const searchParams = new URLSearchParams({
            query: query,
            ll: `${lat},${lng}`,
            sort: 'DISTANCE'
        });

        const response = await fetch(
            `https://api.foursquare.com/v3/places/search?${searchParams}`,
            {
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                    Authorization: 'fsq3Xb+wqv1rmZC2svyt24c8cvGfRnYhbK+kM8xm9lCn3KY='
                }
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data && Array.isArray(data.results)) {
            return {
                results: data.results.map(business => ({
                    name: business.name,
                    geocode: {
                        main: {
                            lat: business.location.lat,
                            lng: business.location.lng
                        }
                    }
                    
                }))
            };
        } else {
            return { results: [] }; 
        }
    } catch (err) {
        console.error('Error occurred during place search:', err);
        return { error: err.message, results: [] };
    }
}
