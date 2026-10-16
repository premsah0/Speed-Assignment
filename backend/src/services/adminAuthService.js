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

  const token = generateAdminToken({ id: admin.id, email: admin.email });

  return {
    token,
    admin: {
      id: admin.id,
      email: admin.email,
    },
  };
};

/**
 * Generates JWT token for admin payload.
 * @param {Object} payload - Admin identity payload (id, email).
 * @param {string} [expiresIn='1d'] - Token duration.
 * @returns {string} Signed JWT.
 */
export const generateAdminToken = (payload, expiresIn = '1d') => {
  return jwt.sign(payload, config.jwtSecret, { expiresIn });
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
