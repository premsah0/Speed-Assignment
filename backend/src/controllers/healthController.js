/**
 * Health Check Controller
 * Returns system status and verification message.
 */
export const getHealth = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Speed Assignment API is running',
  });
};
