import * as https from "https";
import { Options } from "./options";
import { Logger } from "./logger";

export class GitHubService {
	constructor(
		public options: Options,
		public logger: Logger
	) { }

	getRepos(username: string, pageNumber: number) {
		return new Promise<Array<RepoResult>>((resolve, reject) => {
			const url = `/users/${username}/repos?page=${pageNumber}&per_page=30`;
			this.call(url, "GET", {}, result => { resolve(JSON.parse(result)); }, reject);
		});
	}

	getRepo(username: string, name: string) {
		return new Promise<DetailedRepoResult>((resolve, reject) => {
			const url = `/repos/${username}/${name}`;
			this.call(url, "GET", {}, result => { resolve(JSON.parse(result)); }, reject);
		});
	}

	private call(url, method, parameterData, resolve, reject) {
		const options = {
			host: "api.github.com",
			port: 443,
			method: method,
			path: url,
			headers: {
				"User-Agent": `${this.options.appName}/${this.options.version} (+${this.options.homepage})`,
				"Authorization": `token ${this.options.apiToken}`,
				"Content-Type": "application/json",
				"Accept": "application/vnd.github.v3+json"
			}
		};

		let output = "";

		const req = https.request(options, res => {
			res.setEncoding("utf8");

			res.on("data", data => {
				output += data;
			});

			res.on("end", () => {
				resolve(output);
			});
		});

		req.on("error", err => {
			reject(err);
		});

		req.end();
	};
}

export class RepoResult {
	/* tslint:disable:variable-name */
	id: number;
	name: string;
	full_name: string;
	fork: boolean;
	clone_url: string;
	/* tslint:enable:variable-name */
}

export class DetailedRepoResult extends RepoResult {
	/* tslint:disable:variable-name */
	parent: RepoResult;
	default_branch: string;
	/* tslint:enable:variable-name */
}
