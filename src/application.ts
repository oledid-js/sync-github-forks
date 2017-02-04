import * as Promise from "bluebird";
import { Options } from "./options";
import { GitHubService, RepoResult, DetailedRepoResult } from "./gitHubService";
import { GitService } from "./gitService";
import { Logger } from "./logger";

export class Application {
	constructor(
		public options: Options,
		public logger: Logger,
		public githubService: GitHubService = new GitHubService(options, logger),
		public gitService: GitService = new GitService(options, logger),
		public maxGitHubConcurrency: number = 3,
		public maxGitConcurrency: number = Infinity
	) { }

	main() {
		if (this.options.isValid() === false) {
			throw new Error("Invalid options");
		}

		this.start();
	}

	start() {
		this.getForkedRepositories()
			.then(repos => this.getRepositoryDetails(repos))
			.then(values => this.syncRepositories(values))
			.then(() => {
				this.logger.log("Finished", null);
				this.logger.flush();
			})
			.catch(err => {
				throw Error(err);
			});
	}

	getForkedRepositories(page: number = 1, repositories: Array<RepoResult> = new Array<RepoResult>()) {
		this.logger.log("Looking for forked repositories at page " + page, null);
		return this.githubService.getRepos(this.options.username, page)
			.then(repos => {
				if (repos.length === 0) {
					return new Promise(resolve => {
						resolve(repositories);
					});
				}
				for (const repo of repos) {
					if (repo.fork === true) {
						repositories.push(repo);
					}
				}
				return this.getForkedRepositories(page + 1, repositories);
			});
	}

	getRepositoryDetails(repos: Array<RepoResult>) {
		this.logger.log("Found " + repos.length + " forks. Fetching details...", null);
		const queue = new Array<any>();
		const results = new Array<DetailedRepoResult>();
		for (const repo of repos) {
			queue.push(new Promise((innerResolve, innerReject) => {
				this.logger.log("Fetching details for repository", repo.full_name);
				this.githubService.getRepo(this.options.username, repo.name)
					.then(repoResult => {
						innerResolve(repoResult);
					})
					.catch(err => {
						innerReject(err);
					});
			}));
		}
		return Promise.map(queue, (item: DetailedRepoResult) => {
			return item;
		}, { concurrency: this.maxGitHubConcurrency });
	}

	syncRepositories(repos: Array<DetailedRepoResult>) {
		const queue = new Array<any>();
		const self = this;
		for (const value of repos) {
			queue.push(new Promise((resolve, reject) => {
				self.syncRepository(value)
					.then(() => {
						resolve();
					})
					.catch(err => {
						reject(err);
					});
			}));
		}
		return Promise.map(queue, (item: DetailedRepoResult) => {
			return item;
		}, { concurrency: this.maxGitConcurrency });
	}

	syncRepository(repo: DetailedRepoResult) {
		return new Promise((resolve, reject) => {
			this.cloneRepository(repo.name, repo.full_name, repo.clone_url)
				.then(() => {
					return this.gitService.setUpstream(repo.name, repo.full_name, repo.parent.clone_url);
				})
				.then(() => {
					return this.gitService.pullUpstream(repo.name, repo.full_name, repo.default_branch);
				})
				.then(() => {
					return this.gitService.pushOrigin(repo.name, repo.full_name, repo.default_branch);
				})
				.then(() => {
					return this.trySyncMasterBranch(repo.name, repo.full_name, repo.default_branch);
				})
				.then(() => {
					return this.gitService.syncTags(repo.name, repo.full_name);
				})
				.then(() => {
					resolve();
				})
				.catch(err => {
					reject(err);
				});
		});
	}

	cloneRepository(name: string, fullname: string, cloneUrl: string) {
		this.logger.log("Cloning repository " + cloneUrl, fullname);
		return new Promise((resolve, reject) => {
			this.gitService.clone(name, cloneUrl)
				.then(out => {
					resolve();
				})
				.catch(err => {
					if (err.toString().match(/destination path (.*) already exists and is not an empty directory/).length > 0) {
						this.logger.log("Repository folder already existed. Continuing.", fullname);
						resolve();
					}
					else {
						reject(err);
					}
				});
		});
	}

	trySyncMasterBranch(name: string, fullname: string, branch: string) {
		return new Promise((resolve, reject) => {
			if (branch === "master") {
				resolve();
				return;
			}
			this.logger.log("Trying to sync master branch", fullname);
			this.gitService.pullUpstream(name, fullname, "master")
				.then(() => {
					return this.gitService.pushOrigin(name, fullname, "master");
				})
				.then(() => {
					this.logger.log("Master branch synced", fullname);
					resolve();
				})
				.catch(err => {
					this.logger.log("Failed syncing master branch for repository", fullname);
					resolve();
				});
		});
	}
}
