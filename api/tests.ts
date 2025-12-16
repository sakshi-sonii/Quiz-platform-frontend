import mongoose from "mongoose";
import { connectDB } from "./_db.js";
import { auth } from "./auth.js";

const QuestionSchema = new mongoose.Schema(
  {
    question: String,
    options: [String],
    correct: Number
  },
  { _id: false }
);

const TestSchema = new mongoose.Schema({
  title: String,
  subject: String,
  duration: Number,
  questions: [QuestionSchema],
  teacherId: String,
  approved: { type: Boolean, default: false },
  active: { type: Boolean, default: false },
  createdAt: String
});

const Test = mongoose.models.Test || mongoose.model("Test", TestSchema);

export default async function handler(req: any, res: any) {
  try {
    await connectDB();

    // GET → students see only approved + active
    if (req.method === "GET") {
      const tests = await Test.find({ approved: true, active: true });
      return res.json(tests);
    }

    // POST → teacher creates test
    if (req.method === "POST") {
      const user = auth(req);
      if (user.role !== "teacher") return res.status(403).end();

      const test = await Test.create({
        ...req.body,
        teacherId: user.id,
        createdAt: new Date().toISOString()
      });

      return res.status(201).json(test);
    }

    // PATCH → admin approve / activate
    if (req.method === "PATCH") {
      const user = auth(req);
      if (user.role !== "admin") return res.status(403).end();

      const { id, ...updates } = req.body;
      const updated = await Test.findByIdAndUpdate(id, updates, { new: true });
      return res.json(updated);
    }

    res.status(405).end();
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
