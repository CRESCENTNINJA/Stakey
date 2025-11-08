const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = (req, res, next) => {
  // Get token from the header (x-auth-token is a common convention)
  const token = req.header('x-auth-token');

  // Check if no token
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  // Verify token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Add user from payload to the request object
    req.user = decoded.user;
    next(); // Move to the next function
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};
