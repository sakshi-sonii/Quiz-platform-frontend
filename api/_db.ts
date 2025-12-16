import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI not defined");
}

let connected = false;

export async function connectDB() {
  if (connected) return;
  await mongoose.connect(MONGODB_URI);
  connected = true;
}
