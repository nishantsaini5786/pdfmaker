const User = require('../models/User');

const requireAuth = async (req, res, next) => {
  // Pehle session check karo
  if (req.session && req.session.userId) {
    return next();
  }

  // Session nahi hai to cookie se try karo aur session set karo
  const cookieUserId = req.cookies.pdfmaker_user;
  if (cookieUserId) {
    try {
      const user = await User.findById(cookieUserId).select('_id');
      if (user) {
        req.session.userId = user._id; // Session restore karo
        return next();
      }
    } catch (e) {
      console.error('Auth middleware error:', e.message);
    }
  }

  return res.status(401).json({ success: false, message: 'Unauthorized. Please login.' });
};

module.exports = { requireAuth };