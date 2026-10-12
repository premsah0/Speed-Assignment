import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import { config } from '../config/env.js';

/**
 * Authenticates admin by email and password, returning JWT token and admin data if valid.
 * @param {Object} credentials - Email and password.
 * @returns {Promise<Object|null>} Token and admin object or null if invalid.
 */
export const authenticateAdmin = async ({ email, password }) => {
  const admin = await prisma.admin.findUnique({
    where: { email },
  });

  if (!admin) {
    return null;
  }

  const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);
  if (!isPasswordValid) {
    return null;
  }

  const token = jwt.sign(
    { id: admin.id, email: admin.email },
    config.jwtSecret,
    { expiresIn: '1d' }
  );

  return {
    token,
    admin: {
      id: admin.id,
      email: admin.email,
    },
  };
};

/**
 * Verifies JWT token and returns decoded payload.
 * @param {string} token - JWT token string.
 * @returns {Object|null} Decoded payload or null if invalid/expired.
 */
export const verifyAdminToken = (token) => {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch (error) {
    return null;
  }
};
