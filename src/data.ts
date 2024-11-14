import * as path from "path"
import * as vscode from "vscode";

export interface Item {
	name: string,
	value: string[]
}

export interface DataEntry {
	fmt?: string,
	opt?: Item[],
	req?: Item[],
	doc?: string,
	ikgo: boolean
	//[propName: string]: any; // TYPESCRIPT👎🦟
}

export type TSVData = Record<string, Record<string, DataEntry>>;

export const Parameters: (keyof DataEntry)[] = ["opt", "req"];

export function readData(context: vscode.ExtensionContext){
	return new Promise((res, rej) => {
		let mug: TSVData = {
			trigger: {},
			sctrl: {}
		}
		let datapath = vscode.Uri.joinPath(context.extension.extensionUri, "out/data/data.tsv");
		vscode.workspace.fs.readFile(datapath).then((array) => {
			let data = Buffer
				.from(array)
				.toString("utf-8");
			let lines = data
				.split(/(?:\r\n|\n)/)
				.filter((x) => x.length > 0);
			let obj: DataEntry | undefined;
			let doc: string | undefined;
			for(let line of lines){
				let fields = line.split("\t");
				if(fields.length >= 1){
					let command: string = fields[0];
					let key = command as keyof DataEntry;
					switch(command as string){
						case "sctrl":
						case "trigger":
							obj = {
								doc: "",
								ikgo: fields[2] === "ikgo"
							}
							mug[command][fields[1]] = obj;
						break;
						case "opt":
						case "req":
							let item: Item = {
								name: fields[1],
								value: []
							}
							for(let i = fields.length-1; i > 1; i--){
								item.value.unshift(fields[i]);
							}
							if(obj){
								if(obj[key]){
									(obj[key] as Item[]).push(item);
								} else {
									(obj[key] as Item[]) = ([] as Item[]);
								}
							}
						break;
						case "docbgn":
							doc = "";
						break;
						case "docend":
							if(obj) obj.doc = doc?.trim();
							doc = undefined;
						break;
						default:
							if(doc != null) {
								doc += line.trim()+"\n";
							} else {
								if(obj) (obj[key] as string) = fields[1];
							}
						break;
					}
				}
			}
			res(mug);
		}, rej)
	})
}
