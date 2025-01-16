import userModel from "../models/user.model.js";
import jwt from "jsonwebtoken";
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import fs from 'fs';
import cloudinary from 'cloudinary';
import AppError from "../utils/error.utils.js";
import sendEmail from "../utils/sendEmail.js";

const cookieOptions = {
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    domain: process.env.NODE_ENV === 'production' 
      ? 'http://localhost:5173' 
      : undefined,
    path: '/'
  };

// Register  
const register = async (req, res, next) => {
    try {
        const { fullName, email, password } = req.body;

        // Check if user misses any fields
        if (!fullName || !email || !password) {
            return next(new AppError("All fields are required", 400));
        }

        // Check if the user already exists
        const userExist = await userModel.findOne({ email });
        if (userExist) {
            return next(new AppError("Email already exists, please login", 400));
        }

        // Save user in the database and log the user in
        const user = await userModel.create({
            fullName,
            email,
            password,
            avatar: {
                public_id: email,
                secure_url: "",
            },
        });

        if (!user) {
            return next(new AppError("User registration failed, please try again", 400));
        }

        // File upload
        if (req.file) {
            try {
                const result = await cloudinary.v2.uploader.upload(req.file.path, {
                    folder: "Learning-Management-System",
                    width: 250,
                    height: 250,
                    gravity: "faces",
                    crop: "fill",
                });

                if (result) {
                    user.avatar.public_id = result.public_id;
                    user.avatar.secure_url = result.secure_url;

                    // Remove the file from the server
                    fs.rmSync(`uploads/${req.file.filename}`);
                }
            } catch (e) {
                return next(new AppError(e.message || "File not uploaded, please try again", 500));
            }
        }

        await user.save();

        user.password = undefined;

        const token = await user.generateJWTToken();

        res.cookie("token", token, cookieOptions);

        res.status(201).json({
            success: true,
            message: "User registered successfully",
            user,
        });
    } catch (e) {
        return next(new AppError(e.message, 500));
    }
};

// Login
const login = async (req, res, next) => {
    try {
      const { email, password } = req.body;
  
      console.log('Login Attempt:', { email }); // Logging
  
      // Find user with password
      const user = await userModel.findOne({ email }).select('+password');
  
      if (!user) {
        console.log('User not found'); // Logging
        return res.status(400).json({
          success: false,
          message: 'Invalid credentials'
        });
      }
  
      // Compare passwords
      const isMatch = await bcrypt.compare(password, user.password);
  
      if (!isMatch) {
        console.log('Password mismatch'); // Logging
        return res.status(400).json({
          success: false,
          message: 'Invalid credentials'
        });
      }
  
      // Generate token
      const token = user.generateJWTToken();
  
      // Prepare user data (exclude sensitive info)
      const userData = {
        _id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role || 'USER',
        avatar: user.avatar
      };
  
      // Set cookie
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
  
      console.log('Login Successful:', { userData }); // Logging
  
      res.status(200).json({
        success: true,
        message: 'Login successful',
        user: userData,
        token
      });
  
    } catch (error) {
      console.error('Login Error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  };

// Logout
const logout = async (req, res, next) => {
    try {
        res.cookie('token', null, {
            secure: true,
            maxAge: 0,
            httpOnly: true
        });

        res.status(200).json({
            success: true,
            message: 'User logged out successfully'
        });
    } catch (e) {
        return next(new AppError(e.message, 500));
    }
};

// Get Profile
const getProfile = async (req, res, next) => {
    try {
        const { id } = req.user;
        const user = await userModel.findById(id);

        res.status(200).json({
            success: true,
            message: 'User details',
            user
        });
    } catch (e) {
        return next(new AppError('Failed to fetch user profile', 500));
    }
};

// Forgot Password
const forgotPassword = async (req, res, next) => {
    const { email } = req.body;
    if (!email) {
        return next(new AppError('Email is required', 400));
    }

    const user = await userModel.findOne({ email });
    if (!user) {
        return next(new AppError('Email not registered', 400));
    }

    const resetToken = await user.generatePasswordResetToken();

    await user.save();

    const resetPasswordURL = `${process.env.CLIENT_URL}/user/profile/reset-password/${resetToken}`;

    const subject = 'Reset Password';
    const message = `You can reset your password by clicking ${resetPasswordURL}.\nIf the above link does not work, copy-paste this link into a new tab ${resetPasswordURL}.\nIf you did not request this, kindly ignore.`;

    try {
        await sendEmail(email, subject, message);

        res.status(200).json({
            success: true,
            message: `Reset password token has been sent to ${email}`,
        });
    } catch (e) {
        user.forgotPasswordExpiry = undefined;
        user.forgotPasswordToken = undefined;
        await user.save();
        return next(new AppError(e.message, 500));
    }
};

// Reset Password
const resetPassword = async (req, res, next) => {
    try {
        const { resetToken } = req.params;
        const { password } = req.body;

        const forgotPasswordToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        const user = await userModel.findOne({
            forgotPasswordToken,
            forgotPasswordExpiry: { $gt: Date.now() }
        });

        if (!user) {
            return next(new AppError("Token is invalid or expired, please try again", 400));
        }

        user.password = password;
        user.forgotPasswordToken = undefined;
        user.forgotPasswordExpiry = undefined;

        await user.save();

        res.status(200).json({
            success: true,
            message: "Password changed successfully"
        });
    } catch (e) {
        return next(new AppError(e.message, 500));
    }
};

// Change Password
const changePassword = async (req, res, next) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const { id } = req.user;

        if (!oldPassword || !newPassword) {
            return next(new AppError("All fields are required", 400));
        }

        const user = await userModel.findById(id).select('+password');

        if (!user) {
            return next(new AppError("User does not exist", 400));
        }

        if (!(bcrypt.compareSync(oldPassword, user.password))) {
            return next(new AppError("Invalid Old Password", 400));
        }

        user.password = newPassword;

        await user.save();

        res.status(200).json({
            success: true,
            message: "Password changed successfully"
        });
    } catch (e) {
        return next(new AppError(e.message, 500));
    }
};

// Update Profile
const updateUser = async (req, res, next) => {
    try {
        const { fullName } = req.body;
        const { id } = req.user;

        const user = await userModel.findById(id);

        if (!user) {
            return next(new AppError("User does not exist", 400));
        }

        if (fullName) {
            user.fullName = fullName;
        }

        if (req.file) {
            await cloudinary.v2.uploader.destroy(user.avatar.public_id);

            try {
                const result = await cloudinary.v2.uploader.upload(req.file.path, {
                    folder: 'Learning-Management-System',
                    width: 250,
                    height: 250,
                    gravity: 'faces',
                    crop: 'fill'
                });

                if (result) {
                    user.avatar.public_id = result.public_id;
                    user.avatar.secure_url = result.secure_url;

                    // Remove file from server
                    fs.rmSync(`uploads/${req.file.filename}`);
                }
            } catch (e) {
                return next(new AppError(e.message || 'File not uploaded, please try again', 500));
            }
        }

        await user.save();

        res.status(200).json({
            success: true,
            message: "User updated successfully",
            user
        });
    } catch (e) {
        return next(new AppError(e.message, 500));
    }
};

export {
    register,
    login,
    logout,
    getProfile,
    forgotPassword,
    resetPassword,
    changePassword,
    updateUser
};
