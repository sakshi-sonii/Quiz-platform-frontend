import type { VercelRequest, VercelResponse } from "@vercel/node";
import clientPromise from "./_db.js";
import jwt from "jsonwebtoken";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const client = await clientPromise;
  const db = client.db();

  const token = req.headers.authorization?.split(" ")[1];
  const decoded: any = jwt.verify(token!, process.env.JWT_SECRET!);

  if (req.method === "POST") {
    const attempt = {
      ...req.body,
      studentId: decoded.id,
      submittedAt: new Date(),
    };
    await db.collection("attempts").insertOne(attempt);
    return res.json(attempt);
  }

  if (req.method === "GET") {
    const attempts = await db
      .collection("attempts")
      .find({ studentId: decoded.id })
      .toArray();
    return res.json(attempts);
  }

  res.status(405).end();
}
