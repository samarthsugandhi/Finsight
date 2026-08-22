import bcrypt from "bcryptjs";
import { prisma } from "@/database/prisma";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "@/utils/jwt";
import { AppError } from "@/middlewares/error.middleware";
import { SignupInput, LoginInput, RefreshInput } from "@/validators/auth.validator";

const SALT_ROUNDS = 12;

export const authService = {
  async signup(input: SignupInput) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new AppError("An account with this email already exists", 409);
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: { name: input.name, email: input.email, passwordHash },
    });

    return {
      user: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt },
      accessToken: signAccessToken(user.id),
      refreshToken: signRefreshToken(user.id),
    };
  },

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    // Deliberately generic error — don't reveal whether the email is registered.
    if (!user) throw new AppError("Invalid email or password", 401);

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) throw new AppError("Invalid email or password", 401);

    return {
      user: { id: user.id, name: user.name, email: user.email },
      accessToken: signAccessToken(user.id),
      refreshToken: signRefreshToken(user.id),
    };
  },

  async getById(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, createdAt: true },
    });
    if (!user) throw new AppError("User not found", 404);
    return user;
  },

  async refresh(input: RefreshInput) {
    let payload;
    try {
      payload = verifyRefreshToken(input.refreshToken);
    } catch {
      throw new AppError("Invalid or expired refresh token", 401);
    }

    // Re-check the user still exists (e.g. wasn't deleted since the refresh
    // token was issued) before minting a new access token for them.
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new AppError("Invalid or expired refresh token", 401);

    return { accessToken: signAccessToken(user.id) };
  },
};
