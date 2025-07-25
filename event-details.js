document.addEventListener('DOMContentLoaded', () => {
    const eventTitleElement = document.getElementById('event-title');
    const eventContentElement = document.getElementById('event-content');
    const eventActionsElement = document.getElementById('event-actions');

    function getEventDataFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const interests = urlParams.get('interests');
        return {
            id: urlParams.get('id'),
            title: urlParams.get('title') || '',
            description: urlParams.get('description') || '',
            location: urlParams.get('location') || '',
            date: urlParams.get('date') || '',
            orgUsername: urlParams.get('orgUsername') || '',
            image: urlParams.get('image') || '',
            interests: interests ? interests.split(',') : []
        };
    }

    async function renderEventDetails() {
        const event = getEventDataFromUrl();
        
        if (!event.id) {
            eventContentElement.innerHTML = '<p style="color:red;">Event not found.</p>';
            return;
        }

        eventTitleElement.textContent = event.title;

        let interestsHTML = '';
        if (event.interests.length > 0) {
            interestsHTML = `
                <div class="event-interests-container">
                    <h3>Interests</h3>
                    <div class="interests-list">
                        ${event.interests.map(interest => `<div class="interest-tag">${interest}</div>`).join('')}
                    </div>
                </div>
            `;
        }

        eventContentElement.innerHTML = `
            ${event.image ? `<img src="${event.image}" alt="${event.title}" class="event-image-header">` : ''}
            <div class="event-meta">
                <div class="event-meta-item">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    <span>${event.date ? new Date(event.date).toLocaleString() : 'N/A'}</span>
                </div>
                <div class="event-meta-item">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 22s-8-4.48-8-12a8 8 0 0116 0c0 7.52-8 12-8 12z"/><circle cx="12" cy="10" r="3"/></svg>
                    <span>${event.location || 'N/A'}</span>
                </div>
            </div>
            <p class="event-description"><b>Description</b><br><br>${event.description.replace(/\n/g, '<br>')}</p>
            ${interestsHTML}
        `;

        // Handle Signup Button
        const currentUser = authManager.getCurrentUser();
        if (currentUser && currentUser.role === 'user') {
            const userSignups = await eventApi.checkUserSignups(currentUser.username);
            const hasSignedUp = userSignups.includes(event.id);

            const signupButton = document.createElement('button');
            signupButton.className = 'button signup-button';
            signupButton.textContent = hasSignedUp ? 'Signed Up' : 'Sign Up';
            if (hasSignedUp) {
                signupButton.disabled = true;
            }

            signupButton.addEventListener('click', async function() {
                this.classList.add('button-loading');
                const success = await eventApi.signUpForEvent(currentUser.username, event.id);
                if (success) {
                    this.textContent = 'Signed Up';
                    this.disabled = true;
                    alert('Successfully signed up for the event!');
                }
                this.classList.remove('button-loading');
            });

            eventActionsElement.appendChild(signupButton);
        }
    }

    // Set up auth change listener to render the page
    authManager.onAuthChange(renderEventDetails);
});