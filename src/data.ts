import * as path from "path"
import * as vscode from "vscode";

interface Item {
	name: string,
	value: string[]
}

interface DataEntry {
	fmt?: string,
	opt?: string[][],
	req?: string[][],
	doc: string,
	ikgo: boolean
}

export function readData(context: vscode.ExtensionContext){
	return new Promise((res, rej) => {
		let mug: Record<string, Record<string, DataEntry>> = {
			trigger: {},
			sctrl: {}
		}
		let datapath = vscode.Uri.joinPath(context.extension.extensionUri, "out/data/data.tsv");
		console.log(datapath);
		vscode.workspace.fs.readFile(datapath).then((array) => {
			let data = Buffer
				.from(array)
				.toString("utf-8");
			let lines = data
				.split(/(?:\r\n|\n)/)
				.filter((x) => x.length > 0);
			let obj: DataEntry | undefined;
			for(let line of lines){
				let fields = line.split("\t");
				if(fields.length >= 1){
					let command: string = fields[1];
					if(command === "sctrl" || command === "trigger"){
						obj = {
							doc: "",
							ikgo: false
						}
						mug[command][fields[2]] = obj;
					} else {
						if(command === "opt" || command === "req") {
							let item: Item = {
								name: fields[2],
								value: []
							}
							for(let i = fields.length; i > 1; i--){
								item.value.unshift(fields[i]);
							}
							if(obj) {
								if(obj[fields[2]]){

								} else {

								}
							} else {

							}
						}
					}
				}
			}
			res(mug);
		}, rej)
	})
}