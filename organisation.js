// Fetch and render events posted by the organisation
async function loadOrgEvents(username) {
    const orgEventsList = document.getElementById('org-events-list');
    orgEventsList.innerHTML = '<p>Loading...</p>';
    try {
        // Adjust the endpoint as needed for your API
        const token = sessionStorage.getItem('authToken');
        const response = await fetch(`https://i08bww0j0l.execute-api.eu-north-1.amazonaws.com/event?organisation=${encodeURIComponent(username)}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) throw new Error('Failed to fetch events');
        const events = await response.json();
        orgEventsList.innerHTML = '';
        if (!events || events.length === 0) {
            orgEventsList.innerHTML = '<p class="no-content-message">No events posted yet.</p>';
            return;
        }
        events.forEach(event => {
            const eventDiv = document.createElement('div');
            eventDiv.className = 'event-item';
            eventDiv.innerHTML = `
                <h4>${event.title || 'Untitled Event'}</h4>
                <p>${event.description || ''}</p>
                <p><strong>Date:</strong> ${event.date || 'N/A'}</p>
                <p><strong>Location:</strong> ${event.location || 'N/A'}</p>
            `;
            orgEventsList.appendChild(eventDiv);
        });
    } catch (err) {
        orgEventsList.innerHTML = '<p style="color:red;">Failed to load events.</p>';
    }
}

// Expose to global scope for inline script usage
window.loadOrgEvents = loadOrgEvents;


async function createEvent(eventData) {
    const token = sessionStorage.getItem("authToken");
    console.log("Event data:", eventData);
    console.log("Token exists:", !!token);
    console.log(
        "Token preview:",
        token ? token.substring(0, 50) + "..." : "No token"
    );

    // Check if user is still logged in with auto-relogin
    const isAuthenticated = await authManager.ensureAuthenticated(false);
    if (!isAuthenticated) {
        throw new Error("Please log in again to create events");
    }

    // Get fresh token after potential relogin
    const freshToken = sessionStorage.getItem("authToken");
    if (!freshToken) {
        throw new Error("No authentication token found. Please log in again.");
    }

    const response = await fetch(
        "https://i08bww0j0l.execute-api.eu-north-1.amazonaws.com/event",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${freshToken}`,
            },
            body: JSON.stringify(eventData),
        }
    )

    if (response.status === 401) {
        // Throw error with 401 status for retry logic
        throw new Error("401: Authentication failed");
    }

    if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error:", response.status, errorText);
        throw new Error(`Failed to create event: ${response.status} ${errorText}`);
    }

    const newEvent = await response.json();
    return newEvent;
}

// Function to delete an event via API
async function deleteEvent(eventId) {
    // Check authentication with auto-relogin
    const isAuthenticated = await authManager.ensureAuthenticated(false);
    if (!isAuthenticated) {
        throw new Error("Please log in again to delete events");
    }

    const token = sessionStorage.getItem("authToken");
    const response = await fetch(
        `https://i08bww0j0l.execute-api.eu-north-1.amazonaws.com/event`,
        {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ id: eventId }),
        }
    );

    if (response.status === 401) {
        throw new Error("401: Authentication failed");
    }

    if (!response.ok) {
        throw new Error("Failed to delete event");
    }
}

// Function to edit/update an event via API
async function editEvent(eventData) {
    // Check authentication with auto-relogin
    const isAuthenticated = await authManager.ensureAuthenticated(false);
    if (!isAuthenticated) {
        throw new Error("Please log in again to edit events");
    }

    const token = sessionStorage.getItem("authToken");
    const response = await fetch(
        `https://i08bww0j0l.execute-api.eu-north-1.amazonaws.com/event`,
        {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ ...eventData }),
        }
    );

    if (response.status === 401) {
        throw new Error("401: Authentication failed");
    }

    if (!response.ok) {
        throw new Error("Failed to update event");
    }
}
