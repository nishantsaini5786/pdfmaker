const express = require('express');
const router = express.Router();
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'pdfmaker/profiles',
    resource_type: 'image',
    transformation: [{ width: 300, height: 300, crop: 'fill', quality: 'auto' }],
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Check cookie
router.get('/check', async (req, res) => {
  try {
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

// Clear session
router.post('/clear-session', (req, res) => {
  req.session.destroy(() => {});
  res.json({ success: true });
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
    if (req.file) {
      userData.profileImage = req.file.path;
      userData.profileImageId = req.file.filename;
    }

    const user = await User.create(userData);
    req.session.userId = user._id;
    res.cookie('pdfmaker_user', user._id.toString(), {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    });

    res.json({ success: true, user: { _id: user._id, username: user.username, email: user.email, profileImage: user.profileImage, createdAt: user.createdAt } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// Login by ID + PIN (PIN screen)
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
    res.cookie('pdfmaker_user', user._id.toString(), {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    });

    res.json({ success: true, user: { _id: user._id, username: user.username, email: user.email, profileImage: user.profileImage, createdAt: user.createdAt } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Login by email/username (home page login button)
router.post('/login-by-identifier', async (req, res) => {
  try {
    const { identifier, pin } = req.body;
    if (!identifier || !pin) return res.status(400).json({ success: false, message: 'All fields required.' });

    const user = await User.findOne({
      $or: [{ email: identifier.toLowerCase() }, { username: identifier }]
    });
    if (!user) return res.status(404).json({ success: false, message: 'No account found.' });

    const isMatch = await user.comparePin(pin);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Wrong PIN. Try again.' });

    user.lastLogin = new Date();
    await user.save();

    req.session.userId = user._id;
    res.cookie('pdfmaker_user', user._id.toString(), {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    });

    res.json({ success: true, user: { _id: user._id, username: user.username, email: user.email, profileImage: user.profileImage, createdAt: user.createdAt } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {});
  res.clearCookie('pdfmaker_user');
  res.json({ success: true });
});

module.exports = router;