import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

dotenv.config();

const verifyAdmin = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (user.role !== "ADMIN") {
      return res.status(403).json({ message: "Access Denied: Admin only" });
    }

    req.user = user;   // attach full user to request
    next();

  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token please login again" });
  }
};

export default verifyAdmin;
