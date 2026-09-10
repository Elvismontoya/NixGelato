// Puerto de hashing de contraseñas (bcrypt). Sustituible en test por un
// doble rápido y determinista.
import bcrypt from "bcrypt";

const rounds = () => Number(process.env.BCRYPT_SALT_ROUNDS || 10);

export const hasher = {
  hash: (plain) => bcrypt.hash(String(plain).trim(), rounds()),
  compare: (plain, hash) => bcrypt.compare(String(plain).trim(), hash),
};
