/*
    mugen-vscode: Visual Studio Code language extension for M.U.G.E.N/Ikemen-GO
    Copyright (C) 2024  wily-coyote

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import * as vscode from "vscode";
import * as data from "./data/";

class CNSUtil{
	public static readonly function_regex_zss = /^\s*\[function\s+([^(]+)\(([^\)]*)\)\s*([^\]]*)?\]/i;
	public static readonly comment_regex = /^\s*;\s*(.*)$/;
	public static readonly comment_regex_zss = /^\s*#\s*(.*)$/;
	public static readonly comment_section_regex = /^[=-]+$/;
	public static readonly section_regex = /^\s*\[(.*?)\]/;
	public static readonly section_regex_zss = /^\s*\[(.*?)(?:\]|\s*;\s*$)/;
	public static readonly comma_regex = /,\s*/;
	public static readonly stateorfunction_regex = /^(?:state|function)/i;
	public static readonly statedef_regex = /^statedef\b/i;
	public static readonly state_regex = /^state\b/i;

	public static data: data.TSVData;
	public static normalizeText(text:string): string{
		return text.replace(/\s*;.*((?:\n|\r\n)+|$)/g, "\n")
					.replace(/(?:\n|\r\n){2,}/g, "\n")
					.replace(/(?!^)\[/g, "\n[")
					.replace(/^(?:\r\n|\n)+|(?:\r\n|\n)+$/g, "");
	}
	public static isZantei(document: vscode.TextDocument){
		return document.languageId === "zss";
	}
}

class CNSHoverProvider implements vscode.HoverProvider {
	public buildHoverItems(){
		// sctrls
		let hovers: Record<string, vscode.Hover> = {}
		for(let sctrl of Object.keys(CNSUtil.data.sctrl)){
			let entry = CNSUtil.data.sctrl[sctrl];
			let link = `[Elecbyte documentation](http://www.elecbyte.com/mugendocs/sctrls.html#${sctrl.toLowerCase()})`;
			if(entry.ikgo === true){
				link = `[Github documentation](https://github.com/ikemen-engine/Ikemen-GO/wiki/State-controllers-(new)#${sctrl.toLowerCase()})`;
			}
			hovers[sctrl] = (new vscode.Hover([
				new vscode.MarkdownString().appendCodeblock(sctrl, "cns"),
				entry.doc?.replace("\n", "  \n") ?? "",
				link
			]));
		}
		for(let trigger of Object.keys(CNSUtil.data.trigger)){
			let entry = CNSUtil.data.trigger[trigger];
			let link = `[Elecbyte documentation](http://www.elecbyte.com/mugendocs/trigger.html#${trigger.toLowerCase()})`;
			if(entry.ikgo === true){
				link = `[Github documentation](https://github.com/ikemen-engine/Ikemen-GO/wiki/Triggers-(new)#${trigger.toLowerCase()})`;
			}
			hovers[trigger] = (new vscode.Hover([
				new vscode.MarkdownString().appendCodeblock(entry.fmt ?? trigger, "cns"),
				entry.doc?.replace("\n", "  \n") ?? "",
				link
			]));
		}
		return hovers;
	}

	public provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken):
	vscode.ProviderResult<vscode.Hover>{
		let wordRange = document.getWordRangeAtPosition(position);
		if(!wordRange) return;
		let word = document.getText(wordRange);
		let items = this.buildHoverItems();
		let found = Object.keys(items).find(k => word.toLowerCase() == k.toLowerCase())
		if(found) return items[found];
	}
}

class CNSCompletionItemProvider implements vscode.CompletionItemProvider{
	private formatItem(string: vscode.SnippetString, item: data.Item, zss: boolean = false, opt: boolean = false){
		let endl = "\n";
		let name = `${opt ? "; " : ""}${item.name}=`;
		if(zss){
			name = `\t${opt ? "# " : ""}${item.name}: `;
			endl = ";\n";
		}
		string.appendText(name);
		for(let i = 0; i < item.value.length; i++){
			string.appendPlaceholder(item.value[i]);
			if(i < item.value.length-1){
				string.appendText(", ");
			}
		}
		string.appendText(endl);
	}

	private findZssFunctions(document: vscode.TextDocument){
		let cmps: vscode.CompletionItem[] = [];
		for(let i=document.lineCount-1; i>=1; i--){
			let line = document.lineAt(i);
			let match = line.text.match(CNSUtil.function_regex_zss);
			if(match){
				let name = match[1];
				let args: string[] = [];
				let ret: string | undefined = match[3];
				if(match[2]) args = match[2].split(CNSUtil.comma_regex)
				console.log(name, args, ret);
				let cmp = new vscode.CompletionItem(name, vscode.CompletionItemKind.Function);
				cmp.documentation = `function ${name}(${args.join(", ")})`;
				if(ret) cmp.documentation += " ${ret}";
				cmp.detail = `${name}: user-defined function`;
				let insertText = new vscode.SnippetString(`call ${name}(`);
				for(let i=0; i < args.length; i++){
					insertText.appendPlaceholder(args[i]);
					if(i < args.length-1)
						insertText.appendText(", ");
				}
				insertText.appendText(");")
				cmp.insertText = insertText;
				cmp.filterText = "call"+name;
				cmps.push(cmp);
			}
		}
		return cmps
	}

	public buildCompletions(document: vscode.TextDocument, zss: boolean = false){
		// sctrls
		let completions: vscode.CompletionItem[] = zss ? this.findZssFunctions(document) : [];
		for(let sctrl of Object.keys(CNSUtil.data.sctrl)){
			let completion = new vscode.CompletionItem(sctrl, vscode.CompletionItemKind.Function);
			let entry = CNSUtil.data.sctrl[sctrl];
			completion.documentation = entry.doc?.replace("\n", "  \n");
			let insertText = new vscode.SnippetString("");
			if(zss)
				insertText.value = `${sctrl}{\n`;
			else
				insertText.value = `[State ${sctrl}]\ntype=${sctrl}\ntrigger1=1\n`;
			entry.req?.forEach(param => {
				this.formatItem(insertText, param, zss, false);
			})
			entry.opt?.forEach(param => {
				this.formatItem(insertText, param, zss, true);
			})
			if(zss)
				insertText.appendText(`}`);
			insertText.value = insertText.value.trim();
			completion.insertText = insertText;
			completion.detail = `${sctrl}: state controller`;
			completions.push(completion);
		}
		for(let trigger of Object.keys(CNSUtil.data.trigger)){
			let completion = new vscode.CompletionItem(trigger, vscode.CompletionItemKind.Function);
			let entry = CNSUtil.data.trigger[trigger];
			completion.documentation = entry.doc?.replace("\n", "  \n");
			let insertText = new vscode.SnippetString(entry.fmt??"");
			let idx = 1;
			insertText.value = insertText.value.replace(/\$([A-Za-z_]+[0-9]?)/g, (_, g1) => {
				let ret = `\${${idx}:${g1}}`;
				idx++;
				return ret;
			}).trim();
			completion.insertText = insertText;
			completion.detail = `${trigger}: trigger`;
			completions.push(completion);
		}
		return completions;
	}

	public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList<vscode.CompletionItem>> {
		return this.buildCompletions(document, CNSUtil.isZantei(document));
	}
}

interface LineMatch{
	line: vscode.TextLine
	match: RegExpMatchArray
}

class CNSDocumentSymbolProvider implements vscode.DocumentSymbolProvider {

	private getStatedefComment(line:vscode.TextLine, document:vscode.TextDocument){
		let curLineNo = line.lineNumber-1;
		let curLine = document.lineAt(Math.max(0, curLineNo));
		let comments: string[] = [];
		let regex = CNSUtil.isZantei(document) ? CNSUtil.comment_regex_zss : CNSUtil.comment_regex;
		while(true){
			let comment = curLine.text.match(regex)
			if(comment == null) break;
			let text = comment[1].trim()
			if((text.match(CNSUtil.comment_section_regex) == null) && text.length > 0) {
				comments.unshift(comment[1])
			}
			if(curLineNo == 0) break;
			curLineNo--;
			curLine = document.lineAt(Math.max(0, curLineNo));
		}
		return comments.length > 0 ? comments[0] : "";
	}

	private adjustRanges(symbols: vscode.DocumentSymbol[], document: vscode.TextDocument){
		for(let i=0; i<symbols.length; i++){
			let curr = symbols[i];
			let next: vscode.DocumentSymbol | undefined = symbols[i+1];
			let start: vscode.Position = curr.range.start;
			let finish: vscode.Position = new vscode.Position(document.lineCount - 1, 0)
			if(next != null){
				finish = next.range.start;
				finish = document.lineAt(finish.line-1).range.end;
			}
			curr.range = new vscode.Range(
				start,
				finish
			);
		}
	}

	public provideDocumentSymbols(document: vscode.TextDocument, _: vscode.CancellationToken): vscode.ProviderResult<vscode.SymbolInformation[] | vscode.DocumentSymbol[]> {
		return new Promise((res, _) => {
			let regex = CNSUtil.isZantei(document) ? CNSUtil.section_regex_zss : CNSUtil.section_regex;
			let symbols: vscode.DocumentSymbol[] = [];
			// first pass, find section lines and construct symbols
			for (let i=document.lineCount-1; i>=1; i--){
				let line = document.lineAt(i);
				let match = line.text.match(regex);
				if(match != null){
					let name = match[1];
					let range = new vscode.Range(
						line.lineNumber,
						(match.index ?? 0),
						line.lineNumber,
						(match.index ?? 0) + (match[0].length-1)
					) // temporary range that encompasses the section
					symbols.unshift(new vscode.DocumentSymbol(
						name,
						this.getStatedefComment(line, document),
						name.match(CNSUtil.stateorfunction_regex) != null ? vscode.SymbolKind.Function : vscode.SymbolKind.Field,
						range,
						range
					));
				}
			}
			// second pass, adjust ranges
			this.adjustRanges(symbols, document);
			// third pass, build hiearchy
			let parent: vscode.DocumentSymbol | undefined;
			let remove: vscode.DocumentSymbol[] = [];
			for (let symbol of symbols){
				let isStatedef = symbol.name.match(CNSUtil.statedef_regex) != null;
				if(!isStatedef && parent != null){
					// the section is a child of this parent,
					// stage it for removal from the symbols list
					parent.children.push(symbol);
					remove.push(symbol);
				}
				if(isStatedef){
					parent = symbol;
				} else if (symbol.name.match(CNSUtil.state_regex) == null){
					// symbols that aren't states shouldn't be parented to anything
					parent = undefined;
				}
			}
			// fourth pass, adjust statedef ranges (needed for CNS)
			symbols = symbols.filter(x => !remove.includes(x));
			this.adjustRanges(symbols, document);
			res(symbols);
		})
	}
}

export function activate(context:vscode.ExtensionContext){
	data.readData(context).then((returnal)=>{
		CNSUtil.data = (returnal as data.TSVData);
	});
	const subscriptions = [
		vscode.languages.registerHoverProvider(["cns", "zss"], new CNSHoverProvider()),
		vscode.languages.registerCompletionItemProvider(["cns", "zss"], new CNSCompletionItemProvider()),
		vscode.languages.registerDocumentSymbolProvider(["cns", "air", "zss"], new CNSDocumentSymbolProvider()),
		vscode.commands.registerTextEditorCommand("mugen-vscode.normalizeSelection", (textEditor:vscode.TextEditor, edit:vscode.TextEditorEdit) => {
			textEditor.selections.map(sel => {
				let text = textEditor.document.getText(sel);
				let selection:(vscode.Selection|vscode.Range) = sel;
				if(sel.isEmpty){
					text = textEditor.document.lineAt(sel.start.line).text;
					selection = textEditor.document.lineAt(sel.start.line).range;
				}
				text = CNSUtil.normalizeText(text);
				edit.replace(selection, text)
			});
		}),
		vscode.commands.registerTextEditorCommand("mugen-vscode.normalizeAll", (textEditor:vscode.TextEditor, edit:vscode.TextEditorEdit) => {
			const doc = textEditor.document;
			let text = doc.getText();
			edit.replace(
				doc.validateRange(new vscode.Range(0, 0, doc.lineCount, 0)),
				CNSUtil.normalizeText(text)
			);
		})
	];
	subscriptions.forEach((k) => {
		context.subscriptions.push(k);
	});
}
