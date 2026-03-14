import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Drive from '../models/Drive.js';
import Candidate from '../models/Candidate.js';

await mongoose.connect(process.env.MONGODB_URI);
console.log('✅ Connected to MongoDB');

// Clear existing
await Promise.all([User.deleteMany(), Drive.deleteMany(), Candidate.deleteMany()]);
console.log('🗑️  Cleared existing data');

// Create users
const admin = await User.create({
  name: 'Admin User',
  email: 'admin@smarthire.com',
  password: 'password123',
  role: 'admin',
      approvalStatus: 'approved',
      isActive: true,
});
const recruiter = await User.create({
  name: 'Jane Recruiter',
  email: 'recruiter@smarthire.com',
  password: 'password123',
  role: 'recruiter',
      approvalStatus: 'approved',
      isActive: true,
});
console.log('👤 Created users');

// Create drives
const drive1 = await Drive.create({
  name: 'Software Engineer 2024',
  description: 'Full-stack engineering roles for our product team',
  company: 'TechCorp',
  jobRole: 'Software Engineer',
  status: 'active',
  createdBy: recruiter._id,
  selectionThreshold: 75,
  waitlistThreshold: 60,
  rounds: [
    { name: 'Aptitude Test', type: 'aptitude', weightage: 20, maxScore: 100, cutoffScore: 50, order: 1 },
    { name: 'Technical Interview', type: 'technical', weightage: 40, maxScore: 100, cutoffScore: 60, order: 2 },
    { name: 'Coding Challenge', type: 'coding', weightage: 30, maxScore: 100, cutoffScore: 65, order: 3 },
    { name: 'HR Interview', type: 'hr', weightage: 10, maxScore: 100, cutoffScore: 50, order: 4 },
  ],
});

const drive2 = await Drive.create({
  name: 'Data Analyst Batch 2024',
  description: 'Data analysis and business intelligence roles',
  company: 'DataFirst',
  jobRole: 'Data Analyst',
  status: 'draft',
  createdBy: recruiter._id,
  selectionThreshold: 70,
  waitlistThreshold: 55,
  rounds: [
    { name: 'Aptitude', type: 'aptitude', weightage: 30, maxScore: 100, cutoffScore: 50, order: 1 },
    { name: 'Technical Round', type: 'technical', weightage: 50, maxScore: 100, cutoffScore: 60, order: 2 },
    { name: 'HR', type: 'hr', weightage: 20, maxScore: 100, cutoffScore: 40, order: 3 },
  ],
});
console.log('📋 Created drives');

// Seed candidates for drive1
const candidatesData = [
  { name: 'Arjun Sharma', email: 'arjun@example.com', phone: '9876543210', college: 'IIT Delhi', branch: 'CSE', cgpa: 9.1 },
  { name: 'Priya Nair', email: 'priya@example.com', phone: '9876543211', college: 'NIT Trichy', branch: 'IT', cgpa: 8.8 },
  { name: 'Rohan Mehta', email: 'rohan@example.com', phone: '9876543212', college: 'BITS Pilani', branch: 'CS', cgpa: 9.3 },
  { name: 'Sneha Patel', email: 'sneha@example.com', phone: '9876543213', college: 'IIT Bombay', branch: 'CSE', cgpa: 8.5 },
  { name: 'Vikram Singh', email: 'vikram@example.com', phone: '9876543214', college: 'VIT Vellore', branch: 'CSE', cgpa: 7.9 },
];

for (const c of candidatesData) {
  await Candidate.create({ ...c, drive: drive1._id, addedBy: recruiter._id });
}
await Drive.findByIdAndUpdate(drive1._id, { totalCandidates: candidatesData.length });
console.log('🎓 Created candidates');

console.log('\n✅ Seed complete!\n');
console.log('Admin:     admin@smarthire.com    / password123');
console.log('Recruiter: recruiter@smarthire.com / password123\n');

await mongoose.disconnect();
process.exit(0);
