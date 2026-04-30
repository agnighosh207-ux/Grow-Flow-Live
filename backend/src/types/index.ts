import { Request, Response } from "express";
import { User } from "@workspace/db";

export interface AuthenticatedRequest extends Request {
  userId: string;
  user?: User;
  trialMode?: boolean;
  rawBody?: Buffer;
}

export type AuthMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: (err?: any) => void
) => void | Promise<void>;
