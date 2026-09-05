import { customAlphabet } from "nanoid";

// Sin caracteres ambiguos (0/O, 1/I) para que sea fácil de transcribir a mano.
const generateCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);

export function generateRoomCode(): string {
  return generateCode();
}
