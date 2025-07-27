


class AuthManager {
    // Google login using Cognito Hosted UI
    async loginWithGoogle() {
        try {
            const clientId = '4ksaku2s44fpcpc0g2ft5qqfrb';
            const redirectUri = encodeURIComponent('https://main.djvt9w321pewe.amplifyapp.com');
            const scope = encodeURIComponent('email openid profile');
            const url = `https://eu-north-1peak2w5hi.auth.eu-north-1.amazoncognito.com/oauth2/authorize?identity_provider=Google&redirect_uri=${redirectUri}&response_type=token&client_id=${clientId}&scope=${scope}&prompt=select_account`;
            window.location.href = url;
        } catch (error) {
            alert('Google login failed to start. Please try again.');
            console.error('loginWithGoogle error:', error);
        }
    }

    // Parse token from URL after Cognito Hosted UI redirect
    handleCognitoRedirect() {
        // Check if URL contains access_token or id_token
        const hash = window.location.hash.substr(1);
        if (!hash) return;
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const idToken = params.get('id_token');
        const error = params.get('error');
        if(error){
            window.location.href = 'login.html';
            alert('Google login failed: ' + error);
        }
        if (accessToken) {
            sessionStorage.setItem('authToken', accessToken);
        }
        if (idToken) {
            // Try to extract email from idToken
            let email = '';
            try {
                const payload = JSON.parse(atob(idToken.split('.')[1]));
                if (payload.email) email = payload.email;
            } catch (e) {
                console.warn('Could not decode idToken for email:', e);
            }
            // Save user info
            const user = { role: 'user', username: email, email };
            sessionStorage.setItem('currentUser', JSON.stringify(user));
        }
        // Remove token from URL for cleanliness
        if (accessToken || idToken) {
            this.notifyAuthChange();
            window.location.hash = '';
            // Optionally, redirect to home page if on login page
            if (window.location.pathname.endsWith('login.html')) {
                window.location.href = 'index.html';
            }
        }
    }

    // Signup function for both roles
    async signup(email, username, password, role) {
        const cognitoEndpoint = 'https://cognito-idp.eu-north-1.amazonaws.com/';
        let clientId;
        if (role === 'user') {
            clientId = '4ksaku2s44fpcpc0g2ft5qqfrb';
        } else if (role === 'organisation') {
            clientId = '3erjjfeu52d0m418tgc3r1tgo4';
        } else {
            throw new Error('Invalid role');
        }

        // Step 1: Sign up the user
        const signupPayload = {
            ClientId: clientId,
            Username: username,
            Password: password,
            UserAttributes: [
                {
                    Name: 'email',
                    Value: email
                }
            ]
        };

        try {
            const signupResponse = await fetch(cognitoEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-amz-json-1.1',
                    'X-Amz-Target': 'AWSCognitoIdentityProviderService.SignUp'
                },
                body: JSON.stringify(signupPayload)
            });

            if (!signupResponse.ok) {
                let errorMsg = 'Signup failed';
                try {
                    const errData = await signupResponse.json();
                    if (errData && errData.message) errorMsg = errData.message;
                } catch { }
                throw new Error(errorMsg);
            }

            const signupData = await signupResponse.json();

            if (signupData.UserConfirmed === false) {
                try {
                    const confirmPayload = {
                        ClientId: clientId,
                        Username: username,
                        ConfirmationCode: '123456'
                    };

                    const confirmResponse = await fetch(cognitoEndpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-amz-json-1.1',
                            'X-Amz-Target': 'AWSCognitoIdentityProviderService.ConfirmSignUp'
                        },
                        body: JSON.stringify(confirmPayload)
                    });

                    if (!confirmResponse.ok) {
                        console.warn('Auto-confirmation failed, user may need to verify email');
                    }
                } catch (confirmError) {
                    console.warn('Auto-confirmation attempt failed:', confirmError.message);
                }
            }

            return signupData;
        } catch (error) {
            throw new Error(error.message || 'Signup failed');
        }
    }
    constructor() {
        this.currentUser = null;
        this.userLoginBtn = null;
        this.orgLoginBtn = null;
        this.logoutBtn = null;
        this.onAuthChangeCallbacks = [];
        this.initialized = false;
    }

    // Initialize auth-related DOM elements and event listeners
    init() {
        this.loadUserFromSession();

        this.setupEventListeners();
        this.updateUIForAuthState();
        this.initialized = true;
    }

    // Check if auth manager is initialized
    isInitialized() {
        return this.initialized;
    }

    // Load user from sessionStorage if exists
    loadUserFromSession() {
        const savedUser = sessionStorage.getItem('currentUser');
        const savedToken = sessionStorage.getItem('authToken');

        if (savedUser && savedToken) {
            try {
                this.currentUser = JSON.parse(savedUser);
                this.updateUIForAuthState(); // Update UI after loading user
            } catch (error) {
                console.error('Error loading user from session:', error);
                this.logout();
            }
        }
    }

    // Get stored auth token
    getAuthToken() {
        return sessionStorage.getItem('authToken');
    }

    // Authenticate user with email and password (called from login.html)
    async login(role, usernameParam, passwordParam) {
        const username = usernameParam;
        const password = passwordParam;

        // Show loading state
        let loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            loginBtn.disabled = true;
            loginBtn.textContent = 'Logging in...';
        }
        // Show loader overlay
        let loaderOverlay = document.createElement('div');
        loaderOverlay.id = 'login-loader-overlay';
        loaderOverlay.style.cssText = `
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(255,255,255,0.7);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        loaderOverlay.innerHTML = '<div class="loader"></div>';
        document.body.appendChild(loaderOverlay);

        try {
            const res = await this.authenticateWithCognito(username, password, role);

            var email = '';
            try {
                const idToken = res.IdToken;
                const payload = JSON.parse(atob(idToken.split('.')[1]));
                if (payload.email) email = payload.email;
            } catch (e) {
                console.warn('Could not decode token for email:', e);
            }

            this.currentUser = {
                role,
                username,
                email
            };

            // Store in sessionStorage
            sessionStorage.setItem('authToken', res.AccessToken);
            sessionStorage.setItem('currentUser', JSON.stringify(this.currentUser));

            // Save credentials for auto-relogin (only if successful)
            const credentials = {
                username: username,
                password: password,
                role: role
            };
            sessionStorage.setItem('loginCredentials', JSON.stringify(credentials));

            // Update UI
            this.updateUIForAuthState();
            this.notifyAuthChange();

            window.location.href = 'index.html';
        } catch (error) {
            // Clear any saved credentials on login failure
            sessionStorage.removeItem('loginCredentials');
            throw error; // Re-throw for caller to handle
        } finally {
            // Hide loading state
            if (loginBtn) {
                loginBtn.disabled = false;
                loginBtn.textContent = 'Login';
            }
            // Remove loader overlay
            const overlay = document.getElementById('login-loader-overlay');
            if (overlay) overlay.remove();
        }
    }

    async authenticateWithCognito(username, password, role) {
        const cognitoEndpoint = 'https://cognito-idp.eu-north-1.amazonaws.com/';
        try {
            let response;
            if (role == "user") {
                //user login
                response = await fetch(cognitoEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-amz-json-1.1',
                        'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth'
                    },
                    body: JSON.stringify({
                        AuthFlow: 'USER_PASSWORD_AUTH',
                        ClientId: '4ksaku2s44fpcpc0g2ft5qqfrb',
                        AuthParameters: {
                            USERNAME: username,
                            PASSWORD: password
                        }
                    })
                });
            } else if (role == "organisation") {
                // org login
                response = await fetch(cognitoEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-amz-json-1.1',
                        'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth'
                    },
                    body: JSON.stringify({
                        AuthFlow: 'USER_PASSWORD_AUTH',
                        ClientId: '3erjjfeu52d0m418tgc3r1tgo4',
                        AuthParameters: {
                            USERNAME: username,
                            PASSWORD: password
                        }
                    })
                });
            } else {
                throw new Error('Invalid role specified');
            }

            if (!response.ok) {
                let errorMsg = 'Authentication failed';
                try {
                    const errData = await response.json();
                    if (errData && errData.message) errorMsg = errData.message;
                } catch { }
                throw new Error(errorMsg);
            }
            const data = await response.json();
            if (!data.AuthenticationResult || !data.AuthenticationResult.AccessToken) {
                throw new Error('No access token returned from Cognito.');
            }
            return data.AuthenticationResult;
        } catch (error) {
            throw new Error(error.message || 'Authentication failed');
        }
    }

    // Logout function
    logout() {
        this.currentUser = null;

        // Clear sessionStorage
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('currentUser');
        sessionStorage.removeItem('loginCredentials'); // Clear saved credentials

        this.updateUIForAuthState();
        this.notifyAuthChange();
    }

    // Get current user
    getCurrentUser() {
        // If currentUser is null but we have session data, load it
        if (!this.currentUser) {
            const savedUser = sessionStorage.getItem('currentUser');
            const savedToken = sessionStorage.getItem('authToken');

            if (savedUser && savedToken) {
                try {
                    this.currentUser = JSON.parse(savedUser);
                } catch (error) {
                    console.error('Error parsing saved user:', error);
                    return null;
                }
            }
        }

        return this.currentUser;
    }

    // Check if user is logged in
    isLoggedIn() {
        // Check sessionStorage directly for more reliable authentication check
        const savedUser = sessionStorage.getItem('currentUser');
        const savedToken = sessionStorage.getItem('authToken');

        if (savedUser && savedToken) {
            // Check if token is expired
            if (this.isTokenExpired(savedToken)) {
                this.logout();
                return false;
            }

            // If we have session data but currentUser is null, load it
            if (!this.currentUser) {
                try {
                    this.currentUser = JSON.parse(savedUser);
                } catch (error) {
                    console.error('Error parsing saved user:', error);
                    return false;
                }
            }
            return true;
        }

        return false;
    }

    // Check if JWT token is expired
    isTokenExpired(token) {
        if (!token) return true;

        try {
            // Parse JWT token (basic parsing without verification)
            const parts = token.split('.');
            if (parts.length !== 3) return true;

            const payload = JSON.parse(atob(parts[1]));
            const currentTime = Math.floor(Date.now() / 1000);

            // Check if token is expired (with 30 second buffer)
            return payload.exp < (currentTime + 30);
        } catch (error) {
            console.error('Error parsing token:', error);
            return true;
        }
    }

    // Enhanced authentication check with automatic relogin
    async checkAuthWithRelogin() {
        const savedToken = sessionStorage.getItem('authToken');

        if (!savedToken) {
            return false;
        }

        // If token is expired, attempt relogin
        if (this.isTokenExpired(savedToken)) {
            // Token expired, attempting relogin...

            // Try to get saved credentials for relogin
            const savedCredentials = sessionStorage.getItem('loginCredentials');
            if (savedCredentials) {
                try {
                    const { username, password, role } = JSON.parse(savedCredentials);
                    await this.login(username, password, role);
                    return this.isLoggedIn();
                } catch (error) {
                    console.error('Auto-relogin failed:', error);
                    this.logout();
                    return false;
                }
            } else {
                this.logout();
                return false;
            }
        }

        return this.isLoggedIn();
    }

    // Universal auth check for all pages - handles relogin automatically
    async ensureAuthenticated() {
        const isAuthenticated = await this.checkAuthWithRelogin();

        if (!isAuthenticated) {
            alert('Your session has expired. Attempting to re-login.');
            let relogin = await this.checkAuthWithRelogin();
            if (!relogin) {
                window.location.href = 'login.html';
            }
            return false;
        }

        return isAuthenticated;
    }



    // Check if current user is of specific type
    isUserType(type) {
        return this.currentUser && this.currentUser.role === type;
    }

    // Add callback for auth state changes
    onAuthChange(callback) {
        this.onAuthChangeCallbacks.push(callback);
    }

    // Notify all callbacks of auth state change
    notifyAuthChange() {
        this.onAuthChangeCallbacks.forEach(callback => {
            try {
                callback(this.currentUser);
            } catch (error) {
                console.error('Error in auth change callback:', error);
            }
        });
    }

    // Setup event listeners for UI elements
    setupEventListeners() {
        if (this.logoutBtn) {
            this.logoutBtn.addEventListener('click', () => {
                this.logout();
                window.location.href = 'login.html';
            });
        }
    }


    // Update UI based on authentication state
    updateUIForAuthState() {
        const isLoggedIn = this.isLoggedIn();

        // Toggle visibility of auth-related buttons
        if (this.profileBtn) {
            this.profileBtn.parentElement.classList.toggle('hidden', !isLoggedIn);
        }
        if (this.logoutBtn) {
            this.logoutBtn.classList.toggle('hidden', !isLoggedIn);
        }
        if (this.loginBtn) {
            this.loginBtn.parentElement.classList.toggle('hidden', isLoggedIn);
        }
        if (this.signupBtn) {
            this.signupBtn.parentElement.classList.toggle('hidden', isLoggedIn);
        }
    }
}

// Create global auth manager instance
const authManager = new AuthManager();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Handle Cognito Hosted UI redirect tokens if present
    authManager.handleCognitoRedirect();
    authManager.init();
});

