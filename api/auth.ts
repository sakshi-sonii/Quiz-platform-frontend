import type { VercelRequest, VercelResponse } from "@vercel/node";
import clientPromise from "./_db.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const client = await clientPromise;
  const db = client.db();

  if (req.method === "POST") {
    const { email, password, name, role, course, mode } = req.body;

    // LOGIN
    if (mode === "login") {
      const user = await db.collection("users").findOne({ email });
      if (!user) return res.status(401).json({ message: "Invalid credentials" });

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return res.status(401).json({ message: "Invalid credentials" });

      if (!user.approved) {
        return res.status(403).json({ message: "Account pending approval" });
      }

      const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET!,
        { expiresIn: "7d" }
      );

      return res.json({ token, user });
    }

    // REGISTER
    const existing = await db.collection("users").findOne({ email });
    if (existing) return res.status(400).json({ message: "Email already exists" });

    const hashed = await bcrypt.hash(password, 10);

    const newUser = {
      email,
      password: hashed,
      name,
      role,
      course: role === "student" ? course : "",
      approved: role === "student",
      createdAt: new Date(),
    };

    await db.collection("users").insertOne(newUser);

    return res.json({ message: "Registered successfully" });
  }

  res.status(405).end();
}
