import type { VercelRequest, VercelResponse } from "@vercel/node";
import { connectDB, User, getUserFromRequest } from "./_db.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    await connectDB();
    const currentUser = await getUserFromRequest(req);

    if (!currentUser) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Only admin can access user list
    if (currentUser.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    // GET /api/users - Get all users
    if (req.method === "GET") {
      const users = await User.find().select("-password").sort({ createdAt: -1 });
      return res.status(200).json(users);
    }

    return res.status(405).json({ message: "Method not allowed" });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
}