import * as fs from "fs";
import * as path from "path";
import { Options } from "./options";

export class Logger {
	logs: Array<string>;
	startDate: Date;

	constructor(
		public options: Options
	) {
		this.logs = new Array<string>();
		this.startDate = new Date();
	}

	log(message: string, fullname: string | null) {
		let msg = `[${this.getTime()}] ${message}`;
		if (fullname) {
			msg += " [" + fullname + "]";
		}
		/* tslint:disable-next-line:no-console */
		console.log(msg);
		this.logs.push(msg);
	}

	error(message: string) {
		const msg = `[${this.getTime()}] ${message}`;
		/* tslint:disable-next-line:no-console */
		console.error(msg);
		this.logs.push(msg);
	}

	flush() {
		this.log("Flushing log", null);
		const filename = path.join(this.options.directoryPath, this.getLogFilename());
		const _t = this;
		fs.appendFile(filename, this.logs.join("\n"), err => {
			if (err) {
				/* tslint:disable-next-line:no-console */
				console.error(err);
			}
			else {
				_t.logs = new Array<string>();
			}
		});
	}

	private getTime(date: Date = new Date()) {
		return date.toISOString().substring(0, 10) + " " + date.toTimeString().substring(0, 8);
	}

	private getLogFilename() {
		return "log-"
			+ this.getTime(this.startDate)
				.replace(/ /g, "-")
				.replace(/:/g, "-")
				.trim()
			+ ".txt";
	}
}
