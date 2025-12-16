import { connectDB } from "./_db";

export default async function handler(req: any, res: any) {
  try {
    await connectDB();
    return res.status(200).json([]);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
