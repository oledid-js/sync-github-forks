import * as path from "path";
import { Options } from "./options";
import { Logger } from "./logger";

const execa = require("execa");

export class GitService {
	constructor(
		public options: Options,
		public logger: Logger
	) { }

	clone(name: string, cloneUrl: string) {
		return execa("git", [
			"clone",
			cloneUrl,
			path.join(this.options.directoryPath, name)
		]);
	}

	setUpstream(name: string, fullname: string, upstreamCloneUrl: string) {
		this.logger.log("Setting upstream for repository '" + name + "' to " + upstreamCloneUrl, fullname);
		return new Promise((resolve, reject) => {
			const opts = {
				cwd: path.join(this.options.directoryPath, name)
			};
			execa("git", [
				"remote",
				"remove",
				"upstream"
			], opts)
				.catch(err => {
					if (!err.toString().match(/No such remote: upstream/)) {
						throw new Error(err);
					}
				})
				.then(() => {
					return execa("git", [
						"remote",
						"add",
						"upstream",
						upstreamCloneUrl
					], opts);
				})
				.then(() => {
					resolve();
				})
				.catch(err => {
					reject(err);
				});
		});
	}

	pullUpstream(name: string, fullname: string, branch: string) {
		return new Promise((resolve, reject) => {
			const opts = {
				cwd: path.join(this.options.directoryPath, name)
			};
			this.logger.log("Checking out " + branch, fullname);
			return execa("git", [
				"checkout",
				branch
			], opts)
				.catch(err => {
					if (!err.toString().match(/A branch named '(.*)' already exists/)) {
						throw new Error(err);
					}
				})
				.then(() => {
					this.logger.log("Pulling upstream/" + branch, fullname);
					return execa("git", [
						"pull",
						"upstream",
						branch
					], opts);
				})
				.then(() => {
					resolve();
				})
				.catch(err => {
					reject(err);
				});
		});
	}

	pushOrigin(name: string, fullname: string, branch: string) {
		const opts = {
			cwd: path.join(this.options.directoryPath, name)
		};
		this.logger.log("Pushing to origin/" + branch, fullname);
		return execa("git", [
			"push",
			"-u",
			"origin",
			branch
		], opts);
	}

	syncTags(name: string, fullname: string) {
		const opts = {
			cwd: path.join(this.options.directoryPath, name)
		};
		return new Promise((resolve, reject) => {
			this.logger.log("Fetching tags from upstream", fullname);
			execa("git", [
				"fetch",
				"upstream",
				"--prune",
				"--tags"
			], opts)
				.then(() => {
					this.logger.log("Pushing tags to origin", fullname);
					return execa("git", [
						"push",
						"--tags"
					], opts);
				})
				.then(() => {
					resolve();
				})
				.catch(err => {
					reject(err);
				});
		});
	}
}
