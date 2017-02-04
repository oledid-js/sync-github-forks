const packageJson = require("../package.json");

export class Options {
	appName: string;
	version: string;
	homepage: string;

	constructor(
		public username: string,
		public directoryPath: string,
		public apiToken: string
	) {
		this.appName = packageJson.name;
		this.version = packageJson.version;
		this.homepage = packageJson.homepage;
	}

	isValid(): boolean {
		return !!this.username
			&& this.username.length > 0
			&& !!this.apiToken
			&& this.apiToken.length > 0
			&& !!this.directoryPath
			&& this.directoryPath.length > 0;
	}
}
