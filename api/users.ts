import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { connectDB } from "./_db.js";

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ["admin", "teacher", "student"] }
});

const User = mongoose.models.User || mongoose.model("User", UserSchema);

const JWT_SECRET = process.env.JWT_SECRET as string;

export default async function handler(req: any, res: any) {
  await connectDB();

  // REGISTER
  if (req.method === "POST") {
    const { name, email, password, role } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hash, role });
    return res.status(201).json(user);
  }

  // LOGIN
  if (req.method === "PUT") {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).end();

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).end();

    const token = jwt.sign(
      { id: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({ token, user });
  }

  res.status(405).end();
}
