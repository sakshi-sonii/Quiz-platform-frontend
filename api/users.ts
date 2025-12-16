import type { VercelRequest, VercelResponse } from "@vercel/node";
import clientPromise from "./_db.js";
import jwt from "jsonwebtoken";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const client = await clientPromise;
  const db = client.db();

  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).end();

  const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
  if (decoded.role !== "admin") return res.status(403).end();

  if (req.method === "GET") {
    const users = await db.collection("users").find().toArray();
    return res.json(users);
  }

  if (req.method === "PUT") {
    const { userId, approved } = req.body;
    await db.collection("users").updateOne(
      { _id: userId },
      { $set: { approved } }
    );
    return res.json({ success: true });
  }

  res.status(405).end();
}
