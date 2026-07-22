const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Use environment variable for SECRET_KEY in production
const SECRET_KEY = process.env.JWT_SECRET || 'hr-module-system-secret-key-2024';
const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Initialize users file
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(USERS_FILE)) {
    const defaultUsers = [
        {
            id: 'admin1',
            username: 'admin',
            password: bcrypt.hashSync('admin123', 10),
            email: 'admin@hrsystem.com',
            role: 'admin',
            fullName: 'System Admin',
            phone: '+1234567890',
            createdAt: new Date().toISOString()
        },
        {
            id: 'candidate1',
            username: 'john_doe',
            password: bcrypt.hashSync('candidate123', 10),
            email: 'john@example.com',
            role: 'candidate',
            fullName: 'John Doe',
            phone: '+1234567890',
            createdAt: new Date().toISOString()
        }
    ];
    fs.writeFileSync(USERS_FILE, JSON.stringify(defaultUsers, null, 2));
}

// Read users
const readUsers = () => {
    try {
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
};

// Write users
const writeUsers = (users) => {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
};

// Register new user
const registerUser = async (userData) => {
    const { username, email, password, role, fullName, phone } = userData;
    const users = readUsers();
    
    if (users.find(u => u.username === username)) {
        throw new Error('Username already exists');
    }
    
    if (users.find(u => u.email === email)) {
        throw new Error('Email already exists');
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
        id: Date.now().toString(),
        username,
        email,
        password: hashedPassword,
        role: role || 'candidate',
        fullName: fullName || username,
        phone: phone || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    users.push(newUser);
    writeUsers(users);
    
    const { password: _, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
};

// Login user
const loginUser = async (username, password) => {
    const users = readUsers();
    const user = users.find(u => u.username === username);
    
    if (!user) {
        throw new Error('Invalid credentials');
    }
    
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
        throw new Error('Invalid credentials');
    }
    
    const token = jwt.sign(
        { 
            id: user.id, 
            username: user.username, 
            email: user.email, 
            role: user.role,
            fullName: user.fullName 
        },
        SECRET_KEY,
        { expiresIn: '24h' }
    );
    
    const { password: _, ...userWithoutPassword } = user;
    return { token, user: userWithoutPassword };
};

// Verify token
const verifyToken = (token) => {
    try {
        return jwt.verify(token, SECRET_KEY);
    } catch (error) {
        return null;
    }
};

// Middleware for authentication
const authenticate = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = verifyToken(token);
    if (!decoded) {
        return res.status(401).json({ error: 'Invalid token' });
    }
    
    req.user = decoded;
    next();
};

// Middleware for HR/Admin only
const isHR = (req, res, next) => {
    if (req.user && (req.user.role === 'hr' || req.user.role === 'admin')) {
        next();
    } else {
        res.status(403).json({ error: 'HR access required' });
    }
};

// Middleware for Admin only
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Admin access required' });
    }
};

// Get user by ID
const getUserById = (id) => {
    const users = readUsers();
    const user = users.find(u => u.id === id);
    if (!user) return null;
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
};

// Update user profile
const updateUser = async (id, updates) => {
    const users = readUsers();
    const index = users.findIndex(u => u.id === id);
    if (index === -1) throw new Error('User not found');
    
    users[index] = { ...users[index], ...updates, updatedAt: new Date().toISOString() };
    writeUsers(users);
    
    const { password, ...userWithoutPassword } = users[index];
    return userWithoutPassword;
};

module.exports = {
    registerUser,
    loginUser,
    verifyToken,
    authenticate,
    isHR,
    isAdmin,
    getUserById,
    updateUser,
    readUsers,
    writeUsers
};