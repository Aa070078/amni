import { Injectable } from "@nestjs/common";
import { hash, verify } from "@node-rs/argon2";

const OWASP_OPTIONS = {
  memoryCost: 19456, // 19 MiB (OWASP argon2id recommendation)
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
  algorithm: 2, // Algorithm.Argon2id (ambient const enum; use literal)
};

@Injectable()
export class PasswordService {
  hash(password: string): Promise<string> {
    return hash(password, OWASP_OPTIONS);
  }

  verify(passwordHash: string, password: string): Promise<boolean> {
    return verify(passwordHash, password, OWASP_OPTIONS).catch(() => false);
  }
}
