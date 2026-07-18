// Mock API Interceptor for Carpooling Platform Demo
// Overrides window.fetch to intercept authentication requests and route them locally.

const MOCK_USERS_KEY = 'carpooling_mock_users';
const DEFAULT_USER = {
  email: 'driver@carpool.com',
  password: 'password123',
  name: 'Dero Addict',
  phone: '+1 (555) 019-2834',
  organizationCode: 'KSV2026',
  photo: null
};

// Initialize default user if not exists
const getMockUsers = () => {
  const users = localStorage.getItem(MOCK_USERS_KEY);
  if (!users) {
    const initialUsers = [DEFAULT_USER];
    localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(initialUsers));
    return initialUsers;
  }
  return JSON.parse(users);
};

const saveMockUser = (user) => {
  const users = getMockUsers();
  // Check if user already exists
  const existingIndex = users.findIndex(u => u.email.toLowerCase() === user.email.toLowerCase());
  if (existingIndex > -1) {
    users[existingIndex] = { ...users[existingIndex], ...user };
  } else {
    users.push(user);
  }
  localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
};

export const setupMockApi = () => {
  // Store the original fetch
  const originalFetch = window.fetch;

  window.fetch = async function (url, options) {
    const urlString = typeof url === 'string' ? url : url.url || '';
    
    // Intercept Login
    if (urlString.includes('/api/auth/login') && options?.method === 'POST') {
      return new Promise((resolve) => {
        setTimeout(() => {
          try {
            const { email, password } = JSON.parse(options.body);
            
            if (!email || !password) {
              return resolve({
                ok: false,
                status: 400,
                json: async () => ({ message: 'Email and password are required.' })
              });
            }

            const users = getMockUsers();
            const matchedUser = users.find(
              u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
            );

            if (matchedUser) {
              // Exclude password from returned user profile
              const { password: _, ...userProfile } = matchedUser;
              
              resolve({
                ok: true,
                status: 200,
                json: async () => ({
                  token: 'mock-jwt-token-' + Math.random().toString(36).substring(2),
                  user: userProfile
                })
              });
            } else {
              resolve({
                ok: false,
                status: 401,
                json: async () => ({ message: 'Invalid email/mobile or password. Try driver@carpool.com / password123, or sign up for a new account!' })
              });
            }
          } catch (err) {
            resolve({
              ok: false,
              status: 500,
              json: async () => ({ message: 'Internal Server Error during login: ' + err.message })
            });
          }
        }, 600); // 600ms latency
      });
    }

    // Intercept Register
    if (urlString.includes('/api/auth/register') && options?.method === 'POST') {
      return new Promise((resolve) => {
        setTimeout(() => {
          try {
            const body = JSON.parse(options.body);
            const { email, password, name, organizationCode, phone, photo } = body;

            if (!email || !password || !name || !organizationCode) {
              return resolve({
                ok: false,
                status: 400,
                json: async () => ({ message: 'Name, Email, Password, and Organization Code are required.' })
              });
            }

            const users = getMockUsers();
            const userExists = users.some(u => u.email.toLowerCase() === email.toLowerCase());

            if (userExists) {
              return resolve({
                ok: false,
                status: 409,
                json: async () => ({ message: 'An account with this email/mobile already exists.' })
              });
            }

            // Save new user
            const newUser = {
              name,
              email,
              password,
              phone: phone || '',
              organizationCode,
              photo: photo || null
            };
            
            saveMockUser(newUser);

            resolve({
              ok: true,
              status: 201,
              json: async () => ({
                message: 'Account created successfully! Please login to continue.'
              })
            });
          } catch (err) {
            resolve({
              ok: false,
              status: 500,
              json: async () => ({ message: 'Internal Server Error during registration: ' + err.message })
            });
          }
        }, 600);
      });
    }

    // Intercept Profile Update (optional helper to update user details in local storage)
    if (urlString.includes('/api/user/profile') && options?.method === 'PUT') {
      return new Promise((resolve) => {
        setTimeout(() => {
          try {
            const body = JSON.parse(options.body);
            const { email, name, photo } = body;

            if (!email) {
              return resolve({
                ok: false,
                status: 400,
                json: async () => ({ message: 'User email is required to update profile.' })
              });
            }

            const users = getMockUsers();
            const userIndex = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());

            if (userIndex === -1) {
              return resolve({
                ok: false,
                status: 404,
                json: async () => ({ message: 'User not found.' })
              });
            }

            // Update user properties
            if (name) users[userIndex].name = name;
            if (photo !== undefined) users[userIndex].photo = photo;

            localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));

            const { password: _, ...updatedProfile } = users[userIndex];

            resolve({
              ok: true,
              status: 200,
              json: async () => ({
                message: 'Profile updated successfully!',
                user: updatedProfile
              })
            });
          } catch (err) {
            resolve({
              ok: false,
              status: 500,
              json: async () => ({ message: 'Internal Server Error during profile update: ' + err.message })
            });
          }
        }, 500);
      });
    }

    // Call the original fetch if not intercepted
    return originalFetch.apply(this, arguments);
  };
};
