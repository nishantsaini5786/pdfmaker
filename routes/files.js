const express = require('express');
const router = express.Router();
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const File = require('../models/File');
const { requireAuth } = require('../middleware/auth');

const getCloudinaryOptions = (type) => {
  const map = {
    image: { folder: 'pdfmaker/images', resource_type: 'image' },
    video: { folder: 'pdfmaker/videos', resource_type: 'video' },
    song:  { folder: 'pdfmaker/songs',  resource_type: 'video' },
    file:  { folder: 'pdfmaker/files',  resource_type: 'raw'   },
  };
  return map[type] || map.file;
};

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const type = req.params.type || 'file';
    const opts = getCloudinaryOptions(type);
    return {
      folder: opts.folder,
      resource_type: opts.resource_type,
      public_id: Date.now() + '_' + file.originalname.replace(/[^a-zA-Z0-9.]/g, '_'),
      ...(type === 'image' && { transformation: [{ quality: 'auto', fetch_format: 'auto' }] }),
    };
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const type = req.params.type;
    const allowed = {
      image: ['image/jpeg','image/png','image/gif','image/webp','image/heic'],
      video: ['video/mp4','video/webm','video/avi','video/mov','video/mkv','video/3gpp'],
      song:  ['audio/mpeg','audio/wav','audio/ogg','audio/m4a','audio/aac','audio/flac'],
      file:  [],
    };
    const list = allowed[type];
    if (!list || list.length === 0 || list.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type'));
  }
});

router.post('/upload/:type', requireAuth, upload.array('files', 20), async (req, res) => {
  try {
    const { type } = req.params;
    const savedFiles = [];
    for (const file of req.files) {
      const newFile = await File.create({
        userId:       req.session.userId,
        originalName: file.originalname,
        filename:     file.filename,
        type,
        mimetype:     file.mimetype,
        size:         file.size,
        path:         file.path,
        cloudinaryId: file.filename,
      });
      savedFiles.push(newFile);
    }
    res.json({ success: true, files: savedFiles });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:type', requireAuth, async (req, res) => {
  try {
    const files = await File.find({ userId: req.session.userId, type: req.params.type }).sort({ uploadedAt: -1 });
    res.json({ success: true, files });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.id, userId: req.session.userId });
    if (!file) return res.status(404).json({ success: false, message: 'File not found.' });
    if (file.cloudinaryId) {
      const opts = getCloudinaryOptions(file.type);
      try { await cloudinary.uploader.destroy(file.cloudinaryId, { resource_type: opts.resource_type }); }
      catch (e) { console.error('Cloudinary delete:', e.message); }
    }
    await File.deleteOne({ _id: file._id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;