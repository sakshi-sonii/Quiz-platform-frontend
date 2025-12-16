import { connectDB } from "../api/_db";
import mongoose from "mongoose";

const QuestionSchema = new mongoose.Schema({
  question: String,
  options: [String],
  correct: Number
});

const TestSchema = new mongoose.Schema({
  title: String,
  course: String,
  subject: String,
  duration: Number,
  questions: [QuestionSchema],
  teacherId: String,
  approved: Boolean,
  active: Boolean,
  createdAt: String
});

const Test =
  mongoose.models.Test || mongoose.model("Test", TestSchema);

export default async function handler(req: any, res: any) {
  await connectDB();

  if (req.method === "GET") {
    const tests = await Test.find();
    return res.status(200).json(tests);
  }

  if (req.method === "POST") {
    const test = await Test.create({
      ...req.body,
      approved: false,
      active: false,
      createdAt: new Date().toISOString()
    });

    return res.status(201).json(test);
  }

  if (req.method === "PATCH") {
    const { id, ...updates } = req.body;

    const updated = await Test.findByIdAndUpdate(
      id,
      updates,
      { new: true }
    );

    return res.status(200).json(updated);
  }

  return res.status(405).json({ message: "Method not allowed" });
}
