import mongoose from "mongoose";
import { connectDB } from "./_db.js";
import { auth } from "./auth.js";

const AttemptSchema = new mongoose.Schema({
  testId: String,
  studentId: String,
  answers: [Number],
  score: Number,
  submittedAt: String
});

const Attempt =
  mongoose.models.Attempt || mongoose.model("Attempt", AttemptSchema);

export default async function handler(req: any, res: any) {
  await connectDB();
  const user = auth(req);

  // Submit test
  if (req.method === "POST") {
    if (user.role !== "student") return res.status(403).end();

    const attempt = await Attempt.create({
      ...req.body,
      studentId: user.id,
      submittedAt: new Date().toISOString()
    });

    return res.status(201).json(attempt);
  }

  // Student results
  if (req.method === "GET") {
    const attempts = await Attempt.find({ studentId: user.id });
    return res.json(attempts);
  }

  res.status(405).end();
}
