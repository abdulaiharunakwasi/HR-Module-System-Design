// This file can be used for mock data or frontend-only mode
// Currently using API calls, so this file is just for future expansion

const MOCK_DATA = {
    applicants: [
        {
            id: '1',
            fullName: 'John Doe',
            email: 'john@example.com',
            phone: '+1234567890',
            position: 'Software Engineer',
            experience: 5,
            skills: ['JavaScript', 'React', 'Node.js'],
            coverLetter: 'Passionate developer with 5 years of experience',
            appliedDate: new Date().toISOString(),
            status: 'pending'
        },
        {
            id: '2',
            fullName: 'Jane Smith',
            email: 'jane@example.com',
            phone: '+0987654321',
            position: 'Data Analyst',
            experience: 3,
            skills: ['Python', 'SQL', 'Tableau'],
            coverLetter: 'Data enthusiast with strong analytical skills',
            appliedDate: new Date().toISOString(),
            status: 'shortlisted'
        }
    ],
    shortlisted: [
        {
            id: '2',
            fullName: 'Jane Smith',
            email: 'jane@example.com',
            phone: '+0987654321',
            position: 'Data Analyst',
            experience: 3,
            skills: ['Python', 'SQL', 'Tableau'],
            coverLetter: 'Data enthusiast with strong analytical skills',
            appliedDate: new Date().toISOString(),
            shortlistedDate: new Date().toISOString(),
            status: 'shortlisted'
        }
    ]
};

// Export for potential future use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MOCK_DATA;
}