const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const auth = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;

// ============ MULTER CONFIGURATION ============
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '..', 'uploads', 'cvs');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'cv-' + uniqueSuffix + ext);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only PDF, DOC, and DOCX files are allowed'), false);
    }
};

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: fileFilter
});

// ============ CORS MIDDLEWARE - UPDATED FOR RENDER ============
app.use(cors({
    origin: ['http://localhost:3000', 'https://hr-module-system.onrender.com'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, '..')));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ============ DATA FILE PATHS ============
const DATA_DIR = path.join(__dirname, '..', 'data');
const APPLICANTS_FILE = path.join(DATA_DIR, 'applicants.json');
const SHORTLISTED_FILE = path.join(DATA_DIR, 'shortlisted.json');
const JOBS_FILE = path.join(DATA_DIR, 'jobs.json');
const INTERVIEWS_FILE = path.join(DATA_DIR, 'interviews.json');

// Initialize data files
const initializeFile = (filePath, defaultData) => {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
    }
};

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

initializeFile(APPLICANTS_FILE, []);
initializeFile(SHORTLISTED_FILE, []);
initializeFile(INTERVIEWS_FILE, []);
initializeFile(JOBS_FILE, [
    {
        id: 'job1',
        title: 'Software Engineer',
        department: 'Engineering',
        location: 'Remote',
        type: 'Full-time',
        description: 'Looking for experienced software engineer with React and Node.js skills',
        requirements: ['5+ years experience', 'React', 'Node.js', 'TypeScript'],
        postedDate: new Date().toISOString(),
        status: 'active'
    },
    {
        id: 'job2',
        title: 'Data Analyst',
        department: 'Analytics',
        location: 'New York',
        type: 'Full-time',
        description: 'Data analyst needed for business intelligence and reporting',
        requirements: ['Python', 'SQL', 'Tableau', 'Statistics'],
        postedDate: new Date().toISOString(),
        status: 'active'
    },
    {
        id: 'job3',
        title: 'Product Manager',
        department: 'Product',
        location: 'San Francisco',
        type: 'Full-time',
        description: 'Product manager to lead our SaaS product development',
        requirements: ['5+ years PM experience', 'Agile', 'SaaS', 'Technical background'],
        postedDate: new Date().toISOString(),
        status: 'active'
    }
]);

// Read/write helpers
const readData = (filePath) => {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
};

const writeData = (filePath, data) => {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

// ============ AUTH ROUTES ============

app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password, role, fullName, phone } = req.body;
        
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        
        const user = await auth.registerUser({ 
            username, 
            email, 
            password, 
            role: role || 'candidate',
            fullName,
            phone
        });
        
        res.status(201).json({ 
            message: 'User created successfully', 
            user,
            redirect: user.role === 'candidate' ? '/candidate-dashboard.html' : '/dashboard.html'
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }
        
        const result = await auth.loginUser(username, password);
        res.json(result);
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
});

app.get('/api/auth/me', auth.authenticate, (req, res) => {
    const user = auth.getUserById(req.user.id);
    res.json(user);
});

app.put('/api/auth/profile', auth.authenticate, async (req, res) => {
    try {
        const { fullName, phone, email } = req.body;
        const updates = { fullName, phone, email };
        const user = await auth.updateUser(req.user.id, updates);
        res.json(user);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// ============ JOB ROUTES ============

app.get('/api/jobs', (req, res) => {
    try {
        const jobs = readData(JOBS_FILE);
        const activeJobs = jobs.filter(j => j.status === 'active');
        res.json(activeJobs);
    } catch (error) {
        console.error('Error loading jobs:', error);
        res.json([]);
    }
});

app.get('/api/jobs/:id', (req, res) => {
    const jobs = readData(JOBS_FILE);
    const job = jobs.find(j => j.id === req.params.id);
    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }
    res.json(job);
});

app.post('/api/jobs', auth.authenticate, auth.isHR, (req, res) => {
    try {
        const jobs = readData(JOBS_FILE);
        const newJob = {
            id: 'job_' + Date.now(),
            title: req.body.title || '',
            department: req.body.department || '',
            location: req.body.location || '',
            type: req.body.type || 'Full-time',
            description: req.body.description || '',
            requirements: req.body.requirements || [],
            postedDate: new Date().toISOString(),
            postedBy: req.user.username || 'Admin',
            status: 'active'
        };
        jobs.push(newJob);
        writeData(JOBS_FILE, jobs);
        console.log('✅ New job posted:', newJob.title);
        res.status(201).json(newJob);
    } catch (error) {
        console.error('Error posting job:', error);
        res.status(500).json({ error: 'Failed to post job' });
    }
});

app.put('/api/jobs/:id', auth.authenticate, auth.isHR, (req, res) => {
    try {
        const jobs = readData(JOBS_FILE);
        const index = jobs.findIndex(j => j.id === req.params.id);
        if (index === -1) {
            return res.status(404).json({ error: 'Job not found' });
        }
        jobs[index] = { ...jobs[index], ...req.body, updatedAt: new Date().toISOString() };
        writeData(JOBS_FILE, jobs);
        res.json(jobs[index]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update job' });
    }
});

app.delete('/api/jobs/:id', auth.authenticate, auth.isHR, (req, res) => {
    try {
        let jobs = readData(JOBS_FILE);
        jobs = jobs.filter(j => j.id !== req.params.id);
        writeData(JOBS_FILE, jobs);
        res.json({ message: 'Job deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete job' });
    }
});

// ============ APPLICANT ROUTES ============

app.post('/api/applicants', upload.single('cv'), (req, res) => {
    try {
        const applicants = readData(APPLICANTS_FILE);
        
        const newApplicant = {
            id: Date.now().toString(),
            userId: req.body.userId || '',
            jobId: req.body.jobId || '',
            position: req.body.position || 'Unknown Position',
            fullName: req.body.fullName || '',
            email: req.body.email || '',
            phone: req.body.phone || '',
            experience: parseInt(req.body.experience) || 0,
            skills: req.body.skills ? req.body.skills.split(',').map(s => s.trim()) : [],
            coverLetter: req.body.coverLetter || '',
            cvFile: req.file ? {
                filename: req.file.filename,
                originalName: req.file.originalname,
                path: `/uploads/cvs/${req.file.filename}`,
                size: req.file.size,
                mimetype: req.file.mimetype
            } : null,
            appliedDate: new Date().toISOString(),
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        
        applicants.push(newApplicant);
        writeData(APPLICANTS_FILE, applicants);
        res.status(201).json(newApplicant);
    } catch (error) {
        console.error('Error saving application:', error);
        res.status(500).json({ error: 'Failed to submit application: ' + error.message });
    }
});

app.get('/api/applicants/my-applications', auth.authenticate, (req, res) => {
    const applicants = readData(APPLICANTS_FILE);
    const myApplications = applicants.filter(a => a.userId === req.user.id || a.email === req.user.email);
    res.json(myApplications);
});

app.get('/api/applicants', auth.authenticate, auth.isHR, (req, res) => {
    const applicants = readData(APPLICANTS_FILE);
    res.json(applicants);
});

app.get('/api/applicants/:id', auth.authenticate, (req, res) => {
    const applicants = readData(APPLICANTS_FILE);
    const applicant = applicants.find(a => a.id === req.params.id);
    
    if (!applicant) {
        return res.status(404).json({ error: 'Applicant not found' });
    }
    
    if (req.user.role === 'hr' || req.user.role === 'admin' || 
        applicant.userId === req.user.id || applicant.email === req.user.email) {
        return res.json(applicant);
    }
    
    res.status(403).json({ error: 'Access denied' });
});

app.post('/api/shortlist/:id', auth.authenticate, auth.isHR, (req, res) => {
    const applicants = readData(APPLICANTS_FILE);
    const shortlisted = readData(SHORTLISTED_FILE);
    
    const applicantIndex = applicants.findIndex(a => a.id === req.params.id);
    if (applicantIndex === -1) {
        return res.status(404).json({ error: 'Applicant not found' });
    }
    
    const applicant = applicants[applicantIndex];
    
    if (shortlisted.some(s => s.id === applicant.id)) {
        return res.status(400).json({ error: 'Applicant already shortlisted' });
    }
    
    shortlisted.push({
        ...applicant,
        shortlistedDate: new Date().toISOString(),
        shortlistedBy: req.user.username
    });
    writeData(SHORTLISTED_FILE, shortlisted);
    
    applicants[applicantIndex].status = 'shortlisted';
    writeData(APPLICANTS_FILE, applicants);
    
    res.json({ message: 'Applicant shortlisted successfully', applicant });
});

app.delete('/api/shortlist/:id', auth.authenticate, auth.isHR, (req, res) => {
    const shortlisted = readData(SHORTLISTED_FILE);
    const applicants = readData(APPLICANTS_FILE);
    
    const shortlistIndex = shortlisted.findIndex(s => s.id === req.params.id);
    if (shortlistIndex === -1) {
        return res.status(404).json({ error: 'Applicant not found in shortlist' });
    }
    
    shortlisted.splice(shortlistIndex, 1);
    writeData(SHORTLISTED_FILE, shortlisted);
    
    const applicantIndex = applicants.findIndex(a => a.id === req.params.id);
    if (applicantIndex !== -1) {
        applicants[applicantIndex].status = 'pending';
        writeData(APPLICANTS_FILE, applicants);
    }
    
    res.json({ message: 'Applicant removed from shortlist' });
});

app.delete('/api/applicants/:id', auth.authenticate, auth.isHR, (req, res) => {
    let applicants = readData(APPLICANTS_FILE);
    applicants = applicants.filter(a => a.id !== req.params.id);
    writeData(APPLICANTS_FILE, applicants);
    
    let shortlisted = readData(SHORTLISTED_FILE);
    shortlisted = shortlisted.filter(s => s.id !== req.params.id);
    writeData(SHORTLISTED_FILE, shortlisted);
    
    res.json({ message: 'Applicant deleted successfully' });
});

// ============ UPDATE APPLICANT STATUS ============
app.put('/api/applicants/:id/status', auth.authenticate, auth.isHR, (req, res) => {
    const { status, notes } = req.body;
    const applicants = readData(APPLICANTS_FILE);
    const interviews = readData(INTERVIEWS_FILE);
    const shortlisted = readData(SHORTLISTED_FILE);
    
    const applicantIndex = applicants.findIndex(a => a.id === req.params.id);
    if (applicantIndex === -1) {
        return res.status(404).json({ error: 'Applicant not found' });
    }
    
    const applicant = applicants[applicantIndex];
    const oldStatus = applicant.status;
    
    console.log(`📝 Status change: ${applicant.fullName} from ${oldStatus} to ${status}`);
    
    // Update applicant status
    applicants[applicantIndex].status = status;
    applicants[applicantIndex].statusUpdatedBy = req.user.username;
    applicants[applicantIndex].statusUpdatedAt = new Date().toISOString();
    if (notes) {
        applicants[applicantIndex].notes = notes;
    }
    
    // Handle SHORTLISTED status - ADD TO SHORTLISTED LIST
    if (status === 'shortlisted') {
        const alreadyShortlisted = shortlisted.some(s => s.id === applicant.id);
        if (!alreadyShortlisted) {
            shortlisted.push({
                ...applicant,
                shortlistedDate: new Date().toISOString(),
                shortlistedBy: req.user.username
            });
            writeData(SHORTLISTED_FILE, shortlisted);
            console.log(`✅ Added ${applicant.fullName} to shortlisted`);
        }
    }
    
    // If status is 'hired' or 'rejected', remove from shortlisted and delete interview
    if (status === 'hired' || status === 'rejected') {
        const updatedShortlisted = shortlisted.filter(s => s.id !== req.params.id);
        writeData(SHORTLISTED_FILE, updatedShortlisted);
        
        const interviewIndex = interviews.findIndex(i => i.candidateId === req.params.id);
        if (interviewIndex !== -1) {
            interviews.splice(interviewIndex, 1);
            writeData(INTERVIEWS_FILE, interviews);
            console.log(`✅ Interview removed for ${status} candidate: ${applicant.fullName}`);
        }
    }
    
    // If status is 'pending', remove from shortlisted
    if (status === 'pending') {
        const updatedShortlisted = shortlisted.filter(s => s.id !== req.params.id);
        writeData(SHORTLISTED_FILE, updatedShortlisted);
    }
    
    // If status is 'interview', make sure it's NOT in shortlisted
    if (status === 'interview') {
        const updatedShortlisted = shortlisted.filter(s => s.id !== req.params.id);
        writeData(SHORTLISTED_FILE, updatedShortlisted);
    }
    
    writeData(APPLICANTS_FILE, applicants);
    console.log(`✅ Status updated: ${applicant.fullName} → ${status}`);
    res.json(applicants[applicantIndex]);
});

// ============ INTERVIEW ROUTES ============

app.post('/api/interviews', auth.authenticate, auth.isHR, (req, res) => {
    try {
        const interviews = readData(INTERVIEWS_FILE);
        const applicants = readData(APPLICANTS_FILE);
        
        const existingInterview = interviews.find(i => i.candidateId === req.body.candidateId);
        if (existingInterview) {
            return res.status(400).json({ error: 'Interview already scheduled for this candidate' });
        }
        
        const newInterview = {
            id: 'int_' + Date.now(),
            candidateId: req.body.candidateId || '',
            candidateName: req.body.candidateName || '',
            candidateEmail: req.body.candidateEmail || '',
            candidatePhone: req.body.candidatePhone || '',
            position: req.body.position || '',
            date: req.body.date || '',
            type: req.body.type || 'Online',
            notes: req.body.notes || '',
            status: 'scheduled',
            scheduledBy: req.user.username,
            scheduledAt: new Date().toISOString(),
            createdAt: new Date().toISOString()
        };
        interviews.push(newInterview);
        writeData(INTERVIEWS_FILE, interviews);
        
        if (req.body.candidateId) {
            const applicantIndex = applicants.findIndex(a => a.id === req.body.candidateId);
            if (applicantIndex !== -1) {
                applicants[applicantIndex].status = 'interview';
                applicants[applicantIndex].interviewScheduled = newInterview.date;
                applicants[applicantIndex].interviewType = newInterview.type;
                writeData(APPLICANTS_FILE, applicants);
            }
        }
        
        console.log('✅ Interview scheduled:', newInterview.candidateName);
        res.status(201).json(newInterview);
    } catch (error) {
        console.error('Error scheduling interview:', error);
        res.status(500).json({ error: 'Failed to schedule interview' });
    }
});

app.get('/api/interviews', auth.authenticate, auth.isHR, (req, res) => {
    try {
        const interviews = readData(INTERVIEWS_FILE);
        res.json(interviews);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load interviews' });
    }
});

app.get('/api/interviews/my-interviews', auth.authenticate, (req, res) => {
    try {
        const interviews = readData(INTERVIEWS_FILE);
        const myInterviews = interviews.filter(i => 
            i.candidateEmail === req.user.email || 
            i.candidateName.toLowerCase() === (req.user.fullName || req.user.username).toLowerCase()
        );
        res.json(myInterviews);
    } catch (error) {
        console.error('Error loading interviews:', error);
        res.status(500).json({ error: 'Failed to load interviews' });
    }
});

app.get('/api/interviews/:id', auth.authenticate, (req, res) => {
    try {
        const interviews = readData(INTERVIEWS_FILE);
        const interview = interviews.find(i => i.id === req.params.id);
        if (!interview) {
            return res.status(404).json({ error: 'Interview not found' });
        }
        res.json(interview);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load interview' });
    }
});

app.delete('/api/interviews/:id', auth.authenticate, auth.isHR, (req, res) => {
    try {
        let interviews = readData(INTERVIEWS_FILE);
        interviews = interviews.filter(i => i.id !== req.params.id);
        writeData(INTERVIEWS_FILE, interviews);
        res.json({ message: 'Interview deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete interview' });
    }
});

// ============ SHORTLISTED ROUTES ============

app.get('/api/shortlisted', auth.authenticate, auth.isHR, (req, res) => {
    try {
        const shortlisted = readData(SHORTLISTED_FILE);
        if (!shortlisted || !Array.isArray(shortlisted)) {
            return res.json([]);
        }
        res.json(shortlisted);
    } catch (error) {
        console.error('Error loading shortlisted:', error);
        res.json([]);
    }
});

// ============ DASHBOARD STATS ============

app.get('/api/dashboard/stats', auth.authenticate, auth.isHR, (req, res) => {
    try {
        const applicants = readData(APPLICANTS_FILE);
        const shortlisted = readData(SHORTLISTED_FILE);
        
        const stats = {
            totalApplicants: applicants.length,
            shortlistedCount: shortlisted.length,
            pendingCount: applicants.filter(a => a.status === 'pending').length,
            hiredCount: applicants.filter(a => a.status === 'hired').length,
            rejectedCount: applicants.filter(a => a.status === 'rejected').length,
            interviewCount: applicants.filter(a => a.status === 'interview').length,
            positions: {},
            applicationsByDay: {},
            recentApplicants: applicants.slice(-5).reverse()
        };
        
        applicants.forEach(a => {
            const pos = a.position || 'Unknown';
            stats.positions[pos] = (stats.positions[pos] || 0) + 1;
        });
        
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            stats.applicationsByDay[dateStr] = 0;
        }
        
        applicants.forEach(a => {
            const dateStr = a.appliedDate.split('T')[0];
            if (stats.applicationsByDay[dateStr] !== undefined) {
                stats.applicationsByDay[dateStr]++;
            }
        });
        
        res.json(stats);
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to load stats' });
    }
});

// ============ DOWNLOAD CV ============

app.get('/api/download-cv/:filename', (req, res) => {
    const filePath = path.join(__dirname, '..', 'uploads', 'cvs', req.params.filename);
    if (fs.existsSync(filePath)) {
        res.download(filePath);
    } else {
        res.status(404).json({ error: 'File not found' });
    }
});

// ============ START SERVER ============

app.listen(PORT, () => {
    console.log(`✅ HR Module System running on http://localhost:${PORT}`);
    console.log(`👤 Demo Users:`);
    console.log(`   Admin: username: admin, password: admin123`);
    console.log(`   Candidate: username: john_doe, password: candidate123`);
    console.log(`📁 Uploads folder created for CV files`);
});