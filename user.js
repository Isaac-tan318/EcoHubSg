const BASE_URL = 'https://i08bww0j0l.execute-api.eu-north-1.amazonaws.com';

// Fetch interests for a user
async function fetchUserInterests(email, token) {
    const response = await fetch(`${BASE_URL}/user-interests/${email}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    if (!response.ok) throw new Error('Failed to fetch interests');
    const data = await response.json();
    if (data && Array.isArray(data.interests)) return data.interests;
    return [];
}

// Add a new interest for a user
async function addUserInterest(email, interests, token) {
    const response = await fetch(`${BASE_URL}/user-interests`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ user_id: email, interests: interests })
    });
    if (!response.ok) throw new Error('Failed to add interest');
    return await response.json();
}
