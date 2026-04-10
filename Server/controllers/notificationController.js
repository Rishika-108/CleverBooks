import Notification from '../models/Notification.js';

export const getNotifications = async (req, res) => {
   try {
     const notifications = await Notification.find().sort({ createdAt: -1 }).limit(20);
     res.json(notifications);
   } catch (error) {
     res.status(500).json({ error: error.message });
   }
};
