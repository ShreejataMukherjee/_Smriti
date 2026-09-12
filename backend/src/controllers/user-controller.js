/**
 * SMRITI USER CONTROLLER
 * Handles user profile endpoints and role-specific queries.
 */

import { userService } from '../services/user-service.js';
import { specialistService } from '../services/specialist-service.js';

export const userController = {
  /**
   * GET /api/users/me
   */
  async getMyProfile(req, res) {
    return res.status(200).json({
      success: true,
      user: req.user
    });
  },

  /**
   * PUT /api/users/profile
   */
  async updateMyProfile(req, res) {
    try {
      const updated = await userService.updateProfile(req.user.id, req.body);
      return res.status(200).json({
        success: true,
        user: updated
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }
  },

  /**
   * GET /api/users/caretaker-studio/summary
   * Protected: Caretaker only
   */
  async getCaretakerStudioSummary(req, res) {
    return res.status(200).json({
      success: true,
      message: 'Your personalization studio is being prepared.',
      role: req.user.role,
      plan: req.user.plan,
      status: 'active'
    });
  },

  /**
   * GET /api/users/senior-space/summary
   * Protected: Elderly User only
   */
  async getSeniorSpaceSummary(req, res) {
    return res.status(200).json({
      success: true,
      message: 'Your personalized memory space is being prepared.',
      role: req.user.role,
      plan: req.user.plan,
      status: 'active'
    });
  },

  /**
   * GET /api/users/specialist-dashboard/summary
   * Protected: Medical Specialist only
   */
  async getSpecialistDashboardSummary(req, res) {
    try {
      const specialistProfile = await specialistService.getSpecialistProfile(req.user.id);
      return res.status(200).json({
        success: true,
        message: 'Your clinical specialist dashboard is ready.',
        role: req.user.role,
        plan: req.user.plan,
        status: 'active',
        specialistProfile: specialistProfile || null
      });
    } catch (err) {
      return res.status(200).json({
        success: true,
        message: 'Your clinical specialist dashboard is ready.',
        role: req.user.role,
        plan: req.user.plan,
        status: 'active',
        specialistProfile: null
      });
    }
  }
};
