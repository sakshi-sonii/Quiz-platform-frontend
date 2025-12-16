import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;

export function auth(req: any) {
  const header = req.headers.authorization;
  if (!header) throw new Error("No token");

  const token = header.split(" ")[1];
  return jwt.verify(token, JWT_SECRET);
}
