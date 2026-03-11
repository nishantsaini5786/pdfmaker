const express = require('express');
const router = express.Router();
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const User = require('../models/User');
const File = require('../models/File');
const { requireAuth } = require('../middleware/auth');

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'pdfmaker/profiles',
    resource_type: 'image',
    transformation: [{ width: 300, height: 300, crop: 'fill', quality: 'auto' }],
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('-pin');
    const stats = await File.aggregate([
      { $match: { userId: user._id } },
      { $group: { _id: '$type', count: { $sum: 1 }, totalSize: { $sum: '$size' } } }
    ]);
    res.json({ success: true, user, stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/update', requireAuth, upload.single('profileImage'), async (req, res) => {
  try {
    const { username, email } = req.body;
    const user = await User.findById(req.session.userId);
    if (username) user.username = username;
    if (email) user.email = email;
    if (req.file) {
      if (user.profileImageId) {
        try { await cloudinary.uploader.destroy(user.profileImageId, { resource_type: 'image' }); }
        catch (e) { console.error('Old profile delete:', e.message); }
      }
      user.profileImage   = req.file.path;
      user.profileImageId = req.file.filename;
    }
    await user.save();
    res.json({ success: true, user: { username: user.username, email: user.email, profileImage: user.profileImage } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/change-pin', requireAuth, async (req, res) => {
  try {
    const { currentPin, newPin } = req.body;
    if (!/^\d{6}$/.test(newPin)) return res.status(400).json({ success: false, message: 'PIN must be 6 digits.' });
    const user = await User.findById(req.session.userId);
    const isMatch = await user.comparePin(currentPin);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Current PIN is wrong.' });
    user.pin = newPin;
    await user.save();
    res.json({ success: true, message: 'PIN changed successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;