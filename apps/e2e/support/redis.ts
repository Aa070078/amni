import { connect } from "node:net";

/** Probes a Redis server with a raw RESP PING, without adding an ioredis dep. */
export function redisPing(host: string, port: number, timeoutMs = 1500): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ host, port });
    const timer = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, timeoutMs);
    socket.on("connect", () => socket.write("*1\r\n$4\r\nPING\r\n"));
    socket.on("data", (chunk) => {
      clearTimeout(timer);
      socket.destroy();
      resolve(String(chunk).includes("+PONG"));
    });
    socket.on("error", () => {
      clearTimeout(timer);
      resolve(false);
    });
  });
}
