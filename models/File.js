const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  originalName:  { type: String, required: true },
  filename:      { type: String, required: true },
  type:          { type: String, enum: ['image', 'video', 'song', 'file'], required: true },
  mimetype:      { type: String },
  size:          { type: Number },
  path:          { type: String, required: true },  // Cloudinary URL
  cloudinaryId:  { type: String, default: null },   // delete ke liye zaruri
  uploadedAt:    { type: Date, default: Date.now }
});

module.exports = mongoose.model('File', fileSchema);
