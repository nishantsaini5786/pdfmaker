const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../public/uploads/profiles')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, uuidv4() + ext);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Check if user has cookie — NEVER auto-login, always require PIN
router.get('/check', async (req, res) => {
  try {
    // Cookie se sirf user identify karo, session se nahi (security fix)
    const rememberedUser = req.cookies.pdfmaker_user;
    if (rememberedUser) {
      const user = await User.findById(rememberedUser).select('-pin');
      if (user) return res.json({ success: true, loggedIn: false, hasAccount: true, user });
    }
    res.json({ success: true, loggedIn: false, hasAccount: false });
  } catch (err) {
    res.json({ success: false, loggedIn: false, hasAccount: false });
  }
});

// Clear session (called on page load for security)
router.post('/clear-session', (req, res) => {
  req.session.destroy(() => {});
  res.json({ success: true });
});

// Login by email or username (for home page login button)
router.post('/login-by-identifier', async (req, res) => {
  try {
    const { identifier, pin } = req.body;
    if (!identifier || !pin) return res.status(400).json({ success: false, message: 'All fields required.' });

    // Email ya username dono se dhundo
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { username: identifier }
      ]
    });
    if (!user) return res.status(404).json({ success: false, message: 'No account found with this email/username.' });

    const isMatch = await user.comparePin(pin);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Wrong PIN. Try again.' });

    user.lastLogin = new Date();
    await user.save();

    req.session.userId = user._id;
    res.cookie('pdfmaker_user', user._id.toString(), { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true });

    res.json({ success: true, user: { _id: user._id, username: user.username, email: user.email, profileImage: user.profileImage, createdAt: user.createdAt } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Register
router.post('/register', upload.single('profileImage'), async (req, res) => {
  try {
    const { username, email, pin, confirmPin } = req.body;
    if (!username || !email || !pin) return res.status(400).json({ success: false, message: 'All fields required.' });
    if (!/^\d{6}$/.test(pin)) return res.status(400).json({ success: false, message: 'PIN must be exactly 6 digits.' });
    if (pin !== confirmPin) return res.status(400).json({ success: false, message: 'PINs do not match.' });

    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) return res.status(400).json({ success: false, message: 'Username or email already exists.' });

    const userData = { username, email, pin };
    if (req.file) userData.profileImage = '/uploads/profiles/' + req.file.filename;

    const user = await User.create(userData);
    req.session.userId = user._id;
    res.cookie('pdfmaker_user', user._id.toString(), { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true });

    res.json({ success: true, message: 'Registered successfully!', user: { username: user.username, email: user.email, profileImage: user.profileImage } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// Login with PIN
router.post('/login', async (req, res) => {
  try {
    const { pin, userId } = req.body;
    const id = userId || req.cookies.pdfmaker_user;
    if (!id) return res.status(400).json({ success: false, message: 'No account found.' });

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const isMatch = await user.comparePin(pin);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Wrong PIN. Try again.' });

    user.lastLogin = new Date();
    await user.save();

    req.session.userId = user._id;
    res.cookie('pdfmaker_user', user._id.toString(), { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true });

    res.json({ success: true, user: { _id: user._id, username: user.username, email: user.email, profileImage: user.profileImage, createdAt: user.createdAt } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.clearCookie('pdfmaker_user');
  res.json({ success: true });
});

module.exports = router;
