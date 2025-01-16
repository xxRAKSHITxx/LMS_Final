import AppError from "../utils/error.utils.js";
import jwt from "jsonwebtoken";
import userModel from '../models/user.model.js';

const isLoggedIn = async (req, res, next) => {
    try {
      // Check token from multiple sources
      const token = 
        req.cookies?.token || 
        req.header('Authorization')?.replace('Bearer ', '');
  
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized: No token provided'
        });
      }
  
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
  
      // Find user and attach to request
      const user = await userModel.findById(decoded.id);
  
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized: User not found'
        });
      }
  
      // Attach user to request
      req.user = {
        id: user._id,
        email: user.email,
        role: user.role || 'USER',
        fullName: user.fullName
      };
  
      next();
    } catch (error) {
      console.error('Authentication Error:', error);
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid token',
        error: error.message
      });
    }
  };

// authorised roles
const authorisedRoles = (...roles) => async (req, res, next) => {
    const currentUserRoles = req.user.role;
    if (!roles.includes(currentUserRoles)) {
        return next(new AppError("You do not have permission to access this routes", 403))
    }
    next();
}

// Optional: If you want to keep the function but make it a pass-through
const authorizeSubscriber = async (req, res, next) => {
    next();
}

export {
    isLoggedIn,
    authorisedRoles,
    authorizeSubscriber
}