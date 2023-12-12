export type Tokens = {
  access_token: string;
  refresh_token: string;
};

export type PasswordResetToken = {
  resetToken: string;
  resetTokenExpiresAt: Date;
  resetMailRecipient: string;
};

export type ResetTokenValidity = {
  isExpired: boolean;
  email?: string;
};
