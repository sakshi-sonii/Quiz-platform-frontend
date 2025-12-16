import type { VercelRequest, VercelResponse } from "@vercel/node";
import clientPromise from "./_db.js";
import jwt from "jsonwebtoken";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const client = await clientPromise;
  const db = client.db();

  const token = req.headers.authorization?.split(" ")[1];
  const decoded: any = jwt.verify(token!, process.env.JWT_SECRET!);

  if (req.method === "POST") {
    const test = {
      ...req.body,
      teacherId: decoded.id,
      approved: false,
      active: false,
      createdAt: new Date(),
    };
    await db.collection("tests").insertOne(test);
    return res.json(test);
  }

  if (req.method === "GET") {
    const tests = await db.collection("tests").find().toArray();
    return res.json(tests);
  }

  if (req.method === "PUT") {
    const { testId, approved, active } = req.body;
    await db.collection("tests").updateOne(
      { _id: testId },
      { $set: { approved, active } }
    );
    return res.json({ success: true });
  }

  res.status(405).end();
}
