import { existsSync } from "node:fs";

const SOCK = "/tmp/playwriter.sock";
const DAEMON_SCRIPT = new URL("./daemon.ts", import.meta.url).pathname;

const isDaemonRunning = () => existsSync(SOCK);

const startDaemon = async (): Promise<void> => {
	const proc = Bun.spawn({
		cmd: [process.execPath, DAEMON_SCRIPT],
		stdout: "ignore",
		stderr: "inherit",
		stdin: "ignore",
	});
	proc.unref();

	for (let i = 0; i < 100; i++) {
		if (isDaemonRunning()) return;
		await Bun.sleep(100);
	}
	throw new Error("Daemon failed to start");
};

const send = async (code: string, timeout?: number): Promise<string> => {
	if (!isDaemonRunning()) {
		console.error("Starting daemon...");
		await startDaemon();
	}

	return new Promise((resolve, reject) => {
		let response = "";

		Bun.connect({
			unix: SOCK,
			socket: {
				open(socket) {
					socket.write(JSON.stringify({ code, timeout }));
					socket.flush();
				},
				data(_, data) {
					response += data.toString();
				},
				close() {
					try {
						const parsed = JSON.parse(response) as { ok: boolean; result?: string; error?: string };
						if (!parsed.ok) {
							reject(new Error(parsed.error));
						} else {
							resolve(parsed.result || "");
						}
					} catch (e: any) {
						reject(new Error(`Invalid response: ${response}`));
					}
				},
				error(_, error) {
					reject(error);
				},
			},
		}).catch(reject);
	});
};

const code = process.argv[2];
if (!code) {
	console.error("Usage: bun cmd.ts '<code>'");
	process.exit(1);
}

try {
	const result = await send(code, process.argv[3] ? Number(process.argv[3]) : undefined);
	console.log(result);
} catch (e: any) {
	console.error("Error:", e.message);
	process.exit(1);
}
