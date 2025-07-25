// Create a global API object to avoid polluting the global namespace
window.eventApi = {
    BASE_URL: 'https://i08bww0j0l.execute-api.eu-north-1.amazonaws.com',

    checkUserSignups: async function(username) {
        try {
            const response = await fetch(`${this.BASE_URL}/signups/${username}`);
            if (!response.ok) {
                if (response.status === 404) return []; // No signups found is not an error
                throw new Error('Failed to fetch user signups');
            }
            const signups = await response.json();
            return signups.map(signup => signup.event_id);
        } catch (error) {
            console.error('Error checking user signups:', error);
            return []; // Return empty on failure
        }
    },

    signUpForEvent: async function(userName, eventId) {
        try {
            const response = await fetch(`${this.BASE_URL}/event-signup`, {
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
            
            return true; // Success

        } catch (error) {
            console.error('Error signing up for event:', error);
            alert('Failed to sign up for the event. Please try again.');
            return false; // Failure
        }
    }
};
