/**
 * KARIBU GROCERIES LTD (KGL) - API Configuration
 * PROFESSIONAL VERSION - FULLY WORKING
 * UPDATED: Fixed token handling for all API calls
 * NOW USING REAL BACKEND (MOCK DISABLED)
 */

// ========================================
// API CONFIGURATION
// ========================================

const API = {
    USE_MOCK: false,
    BASE_URL: window.location.hostname === 'localhost' 
        ? 'http://localhost:3000/api'                          
        : 'https://kgl-backend-ozz5.onrender.com/api',
    
    endpoints: {
        login: '/auth/login',
        logout: '/auth/logout',
        users: '/users',
        createUser: '/users',
        updateUser: '/users/',
        deleteUser: '/users/',
        produce: '/produce',
        createProduce: '/produce',
        updateProduce: '/produce/',
        sales: '/sales',
        createSale: '/sales',
        creditSales: '/creditsales',
        createCreditSale: '/creditsales',
        reports: '/reports',
        branchReports: '/reports/branch/',
        directorReports: '/reports/director'
    },
    
    getHeaders: function(token = null) {
        const headers = {
            'Content-Type': 'application/json'
        };
        if (token) {
            headers['Authorization'] = 'Bearer ' + token;
        }
        return headers;
    }
};

// ========================================
// MOCK DATA
// ========================================

const MOCK_DATA = {
    users: [
        {
            id: '1',
            name: 'Mr. Orban',
            email: 'director@karibugroceries.com',
            role: 'Director',
            branch: 'Head Office',
            contact: '+256700123456',
            password: 'password123'
        },
        {
            id: '2',
            name: 'John Manager',
            email: 'manager.matugga@karibugroceries.com',
            role: 'Manager',
            branch: 'MATUGGA',
            contact: '+256700123457',
            password: 'password123'
        },
        {
            id: '3',
            name: 'Sarah Manager',
            email: 'manager.maganjo@karibugroceries.com',
            role: 'Manager',
            branch: 'MAGANJO',
            contact: '+256700123458',
            password: 'password123'
        },
        {
            id: '4',
            name: 'Peter Agent',
            email: 'agent.matugga@karibugroceries.com',
            role: 'Sales',
            branch: 'MATUGGA',
            contact: '+256700123459',
            password: 'password123'
        },
        {
            id: '5',
            name: 'Paul Agent',
            email: 'agent.maganjo@karibugroceries.com',
            role: 'Sales',
            branch: 'MAGANJO',
            contact: '+256700123460',
            password: 'password123'
        },
        {
            id: '6',
            name: 'Grace Agent',
            email: 'agent2.matugga@karibugroceries.com',
            role: 'Sales',
            branch: 'MATUGGA',
            contact: '+256700123461',
            password: 'password123'
        },
        {
            id: '7',
            name: 'Anna Agent',
            email: 'agent2.maganjo@karibugroceries.com',
            role: 'Sales',
            branch: 'MAGANJO',
            contact: '+256700123462',
            password: 'password123'
        }
    ],
    produce: [],
    sales: [],
    creditSales: []
};

// ========================================
// MOCK API SERVICE
// ========================================

const MockAPIService = {
    login: function(email, password) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const user = MOCK_DATA.users.find(u => u.email === email);
                if (user && password === 'password123') {
                    const { password, ...userWithoutPassword } = user;
                    resolve({
                        success: true,
                        user: userWithoutPassword,
                        token: 'mock-token-' + Date.now()
                    });
                } else {
                    reject({ success: false, message: 'Invalid email or password' });
                }
            }, 800);
        });
    },
    
    getUsers: function() {
        return new Promise((resolve) => {
            setTimeout(() => {
                const usersWithoutPasswords = MOCK_DATA.users.map(user => {
                    const { password, ...userWithoutPassword } = user;
                    return userWithoutPassword;
                });
                resolve({ success: true, users: usersWithoutPasswords });
            }, 300);
        });
    },
    
    createUser: function(userData) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const newUser = {
                    id: 'user_' + Date.now(),
                    name: userData.name,
                    email: userData.email,
                    role: userData.role,
                    branch: userData.branch,
                    contact: userData.contact,
                    password: userData.password
                };
                MOCK_DATA.users.push(newUser);
                const { password, ...userWithoutPassword } = newUser;
                resolve({ success: true, user: userWithoutPassword, message: 'User created successfully' });
            }, 300);
        });
    },
    
    deleteUser: function(userId) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const index = MOCK_DATA.users.findIndex(u => u.id === userId);
                if (index !== -1) {
                    if (MOCK_DATA.users[index].role === 'Director') {
                        reject({ success: false, message: 'Cannot delete director' });
                        return;
                    }
                    MOCK_DATA.users.splice(index, 1);
                    resolve({ success: true, message: 'User deleted successfully' });
                } else {
                    reject({ success: false, message: 'User not found' });
                }
            }, 300);
        });
    },
    
    getProduce: function(branch = null) {
        return new Promise((resolve) => {
            setTimeout(() => {
                let produce = MOCK_DATA.produce.filter(p => !branch || p.branch === branch);
                resolve({ success: true, produce: produce });
            }, 300);
        });
    },
    
    createProduce: function(produceData) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const newProduce = { id: 'prod_' + Date.now(), ...produceData };
                MOCK_DATA.produce.push(newProduce);
                resolve({ success: true, produce: newProduce });
            }, 300);
        });
    },
    
    updateProduce: function(produceId, produceData) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const index = MOCK_DATA.produce.findIndex(p => p.id === produceId);
                if (index !== -1) {
                    if (produceData.sellingPrice) {
                        MOCK_DATA.produce[index].sellingPrice = produceData.sellingPrice;
                    }
                    resolve({ success: true, produce: MOCK_DATA.produce[index], message: 'Produce updated successfully' });
                } else {
                    reject({ success: false, message: 'Produce not found' });
                }
            }, 300);
        });
    },
    
    createSale: function(saleData) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const newSale = { id: 'sale_' + Date.now(), ...saleData, dateTime: new Date().toISOString() };
                MOCK_DATA.sales.push(newSale);
                const produceIndex = MOCK_DATA.produce.findIndex(p => p.name === saleData.produceName && p.branch === saleData.branch);
                if (produceIndex !== -1) {
                    MOCK_DATA.produce[produceIndex].tonnage -= saleData.quantity;
                }
                resolve({ success: true, sale: newSale });
            }, 300);
        });
    },
    
    createCreditSale: function(creditData) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const newCreditSale = { id: 'credit_' + Date.now(), ...creditData, status: 'Pending', dateTime: new Date().toISOString() };
                MOCK_DATA.creditSales.push(newCreditSale);
                const produceIndex = MOCK_DATA.produce.findIndex(p => p.name === creditData.produceName && p.branch === creditData.branch);
                if (produceIndex !== -1) {
                    MOCK_DATA.produce[produceIndex].tonnage -= creditData.quantity;
                }
                resolve({ success: true, creditSale: newCreditSale });
            }, 300);
        });
    },
    
    getReports: function(type, branch = null) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ success: true, reports: {} });
            }, 300);
        });
    },
    
    logout: function() {
        localStorage.clear();
        window.location.href = '/pages/login.html';
    },
    
    getCurrentUser: function() {
        const userStr = localStorage.getItem('kgl_user');
        return userStr ? JSON.parse(userStr) : null;
    },
    
    isAuthenticated: function() {
        return !!localStorage.getItem('kgl_token') && !!localStorage.getItem('kgl_user');
    },
    
    redirectToDashboard: function(role) {
        console.log('➡️ Redirecting to:', role, 'dashboard');
        switch(role) {
            case 'Director':
                window.location.href = '/pages/director/dashboard.html';
                break;
            case 'Manager':
                window.location.href = '/pages/manager/dashboard.html';
                break;
            case 'Sales':
                window.location.href = '/pages/sales/dashboard.html';
                break;
            default:
                window.location.href = '/pages/login.html';
        }
    }
};

// ========================================
// REAL API SERVICE
// ========================================

const RealAPIService = {
    login: async function(email, password) {
        console.log('🔍 [REAL] Attempting login for:', email);
        try {
            const response = await fetch(API.BASE_URL + API.endpoints.login, {
                method: 'POST',
                headers: API.getHeaders(),
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            console.log('🔍 [REAL] Login response:', data);
            return data;
        } catch (error) {
            console.log('🔍 [REAL] Login error:', error);
            throw error;
        }
    },
    
    updateUser: async function(userId, userData, token) {
        try {
            const response = await fetch(API.BASE_URL + API.endpoints.updateUser + userId, {
                method: 'PUT',
                headers: API.getHeaders(token),
                body: JSON.stringify(userData)
            });
            return await response.json();
        } catch (error) {
            throw error;
        }
    },
    
    updateProduce: async function(produceId, produceData, token) {
        try {
            const response = await fetch(API.BASE_URL + API.endpoints.updateProduce + produceId, {
                method: 'PUT',
                headers: API.getHeaders(token),
                body: JSON.stringify(produceData)
            });
            return await response.json();
        } catch (error) {
            throw error;
        }
    },
    
    getUsers: async function(token) {
        try {
            const response = await fetch(API.BASE_URL + API.endpoints.users, {
                method: 'GET',
                headers: API.getHeaders(token)
            });
            return await response.json();
        } catch (error) {
            throw error;
        }
    },
    
    createUser: async function(userData, token) {
        try {
            const response = await fetch(API.BASE_URL + API.endpoints.createUser, {
                method: 'POST',
                headers: API.getHeaders(token),
                body: JSON.stringify(userData)
            });
            return await response.json();
        } catch (error) {
            throw error;
        }
    },
    
    deleteUser: async function(userId, token) {
        try {
            const response = await fetch(API.BASE_URL + API.endpoints.deleteUser + userId, {
                method: 'DELETE',
                headers: API.getHeaders(token)
            });
            return await response.json();
        } catch (error) {
            throw error;
        }
    },
    
    getProduce: async function(branch = null, token) {
        try {
            let url = API.BASE_URL + API.endpoints.produce;
            if (branch) url += '?branch=' + branch;
            const response = await fetch(url, { 
                method: 'GET',
                headers: API.getHeaders(token)
            });
            return await response.json();
        } catch (error) {
            throw error;
        }
    },
    
    createProduce: async function(produceData, token) {
        try {
            const response = await fetch(API.BASE_URL + API.endpoints.createProduce, {
                method: 'POST',
                headers: API.getHeaders(token),
                body: JSON.stringify(produceData)
            });
            return await response.json();
        } catch (error) {
            throw error;
        }
    },
    
    createSale: async function(saleData, token) {
        try {
            const response = await fetch(API.BASE_URL + API.endpoints.createSale, {
                method: 'POST',
                headers: API.getHeaders(token),
                body: JSON.stringify(saleData)
            });
            return await response.json();
        } catch (error) {
            throw error;
        }
    },
    
    createCreditSale: async function(creditData, token) {
        try {
            const response = await fetch(API.BASE_URL + API.endpoints.createCreditSale, {
                method: 'POST',
                headers: API.getHeaders(token),
                body: JSON.stringify(creditData)
            });
            return await response.json();
        } catch (error) {
            throw error;
        }
    },
    
    getSales: async function(token) {
        try {
            const response = await fetch(API.BASE_URL + API.endpoints.sales, {
                method: 'GET',
                headers: API.getHeaders(token)
            });
            return await response.json();
        } catch (error) {
            throw error;
        }
    },

    getCreditSales: async function(token) {
        try {
            const response = await fetch(API.BASE_URL + API.endpoints.creditSales, {
                method: 'GET',
                headers: API.getHeaders(token)
            });
            return await response.json();
        } catch (error) {
            throw error;
        }
    },
    
    getReports: async function(type, branch = null, token) {
        try {
            let url = API.BASE_URL + API.endpoints.reports;
            if (type === 'director') {
                url = API.BASE_URL + API.endpoints.directorReports;
            } else if (type === 'branch' && branch) {
                url = API.BASE_URL + API.endpoints.branchReports + branch;
            }
            const response = await fetch(url, {
                method: 'GET',
                headers: API.getHeaders(token)
            });
            return await response.json();
        } catch (error) {
            throw error;
        }
    },
    
    logout: function() {
        localStorage.clear();
        window.location.href = '/pages/login.html';
    },
    
    getCurrentUser: MockAPIService.getCurrentUser,
    isAuthenticated: MockAPIService.isAuthenticated,
    redirectToDashboard: MockAPIService.redirectToDashboard
};

// ========================================
// EXPORT THE SERVICE
// ========================================

const APIService = API.USE_MOCK ? MockAPIService : RealAPIService;

console.log(` API Service running in ${API.USE_MOCK ? 'MOCK' : 'REAL'} mode`);
console.log(' Connected to backend at:', API.BASE_URL);