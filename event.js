const token = sessionStorage.getItem("authToken");
document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.getElementById('main-content');

    let events = [];

    const BASE_URL = 'https://i08bww0j0l.execute-api.eu-north-1.amazonaws.com';

    // Function to check if user has already signed up for events
    async function checkUserSignups(username) {
        try {
            const response = await fetch(`${BASE_URL}/signups/${username}`);
            if (!response.ok) {
                if (response.status === 404) {
                    // User hasn't signed up for any events
                    return [];
                }
                throw new Error('Failed to fetch user signups');
            }
            const signups = await response.json();
            console.log('User signups:', signups);
            return signups.map(signup => signup.event_id);
        } catch (error) {
            console.error('Error checking user signups:', error);
            return []; // Return empty array if check fails
        }
    }

    async function fetchEvents() {
        try {
            const response = await fetch(`${BASE_URL}/events`);
            if (!response.ok) {
                throw new Error('Failed to fetch events');
            }
            const data = await response.json();
            events = data;
            renderEvents();
        } catch (error) {
            console.error('Error fetching events:', error);
            // Fallback to real event data if API fails
            events = [
                {
                    id: "9b3d6240-9e05-487d-98bd-8ba3f5ecad5a",
                    title: "placeholder 5",
                    description: "Join industry leaders and innovators for a comprehensive discussion on renewable energy solutions, solar technology advancements, and the future of clean power generation. Network with professionals driving the green energy revolution.",
                    date: "2025-8-30",
                    location: "Singapore Expo Hall 5",
                    email: "Abigail.Wehner72@hotmail.com",
                    image: "https://ecohub-bucket-cadv.s3.us-east-1.amazonaws.com/ecp.jpg",
                },
            ];
            renderEvents();
        }
    }

    async function renderEvents() {
        mainContent.innerHTML = ''; 
        mainContent.className = 'events-grid';
        
        // Get current user and their signups
        const currentUser = authManager.getCurrentUser();
        let userSignups = [];
        
        if (currentUser && currentUser.role === 'user') {
            userSignups = await checkUserSignups(currentUser.username);
        }
        
        events
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .forEach(event => {
            const eventCard = document.createElement('a');
            eventCard.className = 'event-card';
            // Build query string for event-details.html
            const query = new URLSearchParams({
                id: event.id,
                title: event.title || '',
                description: event.description || '',
                location: event.location || '',
                date: event.date || '',
                orgUsername: event.orgUsername || '',
                image: event.image || '',
                interests: event.interests ? event.interests.join(',') : []
            }).toString();
            eventCard.href = `event-details.html?${query}`;

            // Check if user has already signed up for this event
            const hasSignedUp = userSignups.includes(event.id);
            const isUser = currentUser && currentUser.role === 'user';

            let signupButtonHtml = '';
            if (isUser) {
                if (hasSignedUp) {
                    signupButtonHtml = `<button class="signup-btn" data-id="${event.id}" disabled aria-disabled="true" tabindex="-1" style="background-color: #ccc; cursor: not-allowed;">Signed Up</button>`;
                } else {
                    signupButtonHtml = `<button class="signup-btn" data-id="${event.id}">Sign Up</button>`;
                }
            } else {
                signupButtonHtml = `<button class="signup-btn" data-id="${event.id}" data-requires-login="true">Sign Up</button>`;
            }

            eventCard.innerHTML = `
                ${event.image ? `<img src="${event.image}" alt="${event.title || event.name}" class="event-card-image">` : ''}
                <div class="event-card-content">
                    <div class="event-card-title">${event.title || 'Untitled Event'}</div>
                    <p class="event-card-desc event-desc-clamp">${event.description || 'No description available.'}</p>
                    <div class="event-card-meta">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                <span>${event.date ? new Date(event.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</span>
                    </div>
                    <div class="event-card-meta">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 22s-8-4.48-8-12a8 8 0 0116 0c0 7.52-8 12-8 12z"/><circle cx="12" cy="10" r="3"/></svg>
                        <span>${event.location || 'N/A'}</span>
                    </div>
                    <div class="event-card-actions">
                        ${signupButtonHtml}
                    </div>
                </div>
            `;

            mainContent.appendChild(eventCard);
        });
        
    }


    async function signUpForEvent(userName, eventId) {
        try {
            const response = await fetch(`${BASE_URL}/event-signup`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authManager.getAuthToken()}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ user_id: userName, event_id: eventId }),
            });

            if (!response.ok) {
                throw new Error('Failed to sign up for event');
            }

            // Re-render events to update signup button states
            await renderEvents();
            alert('Successfully signed up for the event!');
        } catch (error) {
            console.error('Error signing up for event:', error);
            alert('Failed to sign up for the event. Please try again.');
        }
    }

    // Set up auth change listener to re-render events when user logs in/out
    authManager.onAuthChange(() => {
        if (mainContent) {
            renderEvents();
        }
    });

    if (mainContent) {
        mainContent.addEventListener('click', async e => {
            if (e.target.classList.contains('signup-btn')) {
                if (e.target.disabled) {
                    return;
                }
                const eventId = e.target.dataset.id; // Remove parseInt() for UUID strings
                const currentUser = authManager.getCurrentUser();
                
                // Check if login is required
                if (e.target.dataset.requiresLogin === 'true') {
                    alert('You need to login to sign up for events');
                    return;
                }
                
                if (currentUser) {
                    await signUpForEvent(currentUser.username, eventId); // username, eventId order
                }
            }
        });
    }

    // Initialize the app by fetching events
    if (mainContent) {
        fetchEvents();
    }
});
