import User from '../models/User.js';
import Drive from '../models/Drive.js';
import Candidate from '../models/Candidate.js';

// GET /api/admin/users
export const getAllUsers = async (req, res, next) => {
  try {
    const { role, search, status } = req.query;
    const query = {};
    if (role) query.role = role;
    if (status === 'active') query.isActive = true;
    if (status === 'inactive') query.isActive = false;
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
    const users = await User.find(query).sort('-createdAt');
    res.json({ success: true, count: users.length, users });
  } catch (err) { next(err); }
};

// PUT /api/admin/users/:id/toggle-status
export const toggleUserStatus = async (req, res, next) => {
  try {
    if (req.params.id === req.user._id.toString())
      return res.status(400).json({ success: false, message: 'Cannot deactivate yourself' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.isActive = !user.isActive;
    await user.save({ validateBeforeSave: false });
    res.json({ success: true, message: `User ${user.isActive ? 'activated' : 'deactivated'}`, user });
  } catch (err) { next(err); }
};

// PUT /api/admin/users/:id/role
export const changeUserRole = async (req, res, next) => {
  try {
    if (req.params.id === req.user._id.toString())
      return res.status(400).json({ success: false, message: 'Cannot change your own role' });
    const { role } = req.body;
    if (!['admin', 'recruiter'].includes(role))
      return res.status(400).json({ success: false, message: 'Invalid role' });
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: 'Role updated', user });
  } catch (err) { next(err); }
};

// DELETE /api/admin/users/:id
export const deleteUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user._id.toString())
      return res.status(400).json({ success: false, message: 'Cannot delete yourself' });
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    // Cascade: reassign drives and candidates to admin or delete
    await Drive.updateMany({ createdBy: req.params.id }, { createdBy: req.user._id });
    res.json({ success: true, message: 'User deleted and drives reassigned to you' });
  } catch (err) { next(err); }
};

// GET /api/admin/analytics — real DB data for charts
export const getAnalytics = async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const userFilter = isAdmin ? {} : { createdBy: req.user._id };
    const candidateFilter = isAdmin ? {} : { addedBy: req.user._id };

    // Monthly drive creation (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const [drivesByMonth, candidatesByMonth, statusBreakdown, userStats, topRecruiters] = await Promise.all([
      Drive.aggregate([
        { $match: { createdAt: { $gte: sixMonthsAgo }, ...userFilter } },
        { $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        }},
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
      Candidate.aggregate([
        { $match: { createdAt: { $gte: sixMonthsAgo }, ...candidateFilter } },
        { $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          total: { $sum: 1 },
          selected: { $sum: { $cond: [{ $eq: ['$status', 'selected'] }, 1, 0] } },
        }},
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
      Candidate.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 }, active: { $sum: { $cond: ['$isActive', 1, 0] } } } },
      ]),
      Candidate.aggregate([
        { $group: { _id: '$addedBy', count: { $sum: 1 }, selected: { $sum: { $cond: [{ $eq: ['$status', 'selected'] }, 1, 0] } } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: { path: '$user', preserveNullAndEmpty: true } },
        { $project: { name: '$user.name', email: '$user.email', count: 1, selected: 1 } },
      ]),
    ]);

    // Merge drive + candidate monthly data
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const monthMap = {};

    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      monthMap[key] = { month: MONTHS[d.getMonth()], drives: 0, candidates: 0, selected: 0 };
    }

    drivesByMonth.forEach(({ _id, count }) => {
      const key = `${_id.year}-${_id.month}`;
      if (monthMap[key]) monthMap[key].drives = count;
    });
    candidatesByMonth.forEach(({ _id, total, selected }) => {
      const key = `${_id.year}-${_id.month}`;
      if (monthMap[key]) { monthMap[key].candidates = total; monthMap[key].selected = selected; }
    });

    const monthlyData = Object.values(monthMap);

    res.json({ success: true, monthlyData, statusBreakdown, userStats, topRecruiters });
  } catch (err) { next(err); }
};

// GET /api/admin/system-stats
export const getSystemStats = async (req, res, next) => {
  try {
    const [totalUsers, totalDrives, totalCandidates, activeDrives, selectedCount, activeUsers] = await Promise.all([
      User.countDocuments(),
      Drive.countDocuments(),
      Candidate.countDocuments(),
      Drive.countDocuments({ status: 'active' }),
      Candidate.countDocuments({ status: 'selected' }),
      User.countDocuments({ isActive: true }),
    ]);
    res.json({ success: true, stats: { totalUsers, activeUsers, totalDrives, activeDrives, totalCandidates, selectedCount } });
  } catch (err) { next(err); }
};

// GET /api/admin/pending-users
export const getPendingUsers = async (req, res, next) => {
  try {
    const users = await User.find({ approvalStatus: 'pending' }).sort('-createdAt');
    res.json({ success: true, count: users.length, users });
  } catch (err) { next(err); }
};

// PUT /api/admin/users/:id/approve
export const approveUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { approvalStatus: 'approved', isActive: true, approvedBy: req.user._id, approvedAt: new Date() },
      { new: true }
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: `${user.name} approved successfully`, user });
  } catch (err) { next(err); }
};

// PUT /api/admin/users/:id/reject
export const rejectUser = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { approvalStatus: 'rejected', isActive: false },
      { new: true }
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: `${user.name}'s request rejected`, user });
  } catch (err) { next(err); }
};
