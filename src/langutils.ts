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

class CNSUtility{
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
		for(let sctrl of Object.keys(CNSUtility.data.sctrl)){
			let entry = CNSUtility.data.sctrl[sctrl];
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
		for(let trigger of Object.keys(CNSUtility.data.trigger)){
			let entry = CNSUtility.data.trigger[trigger];
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

	public buildCompletions(zss: boolean = false){
		// sctrls
		let completions: vscode.CompletionItem[] = []
		for(let sctrl of Object.keys(CNSUtility.data.sctrl)){
			let completion = new vscode.CompletionItem(sctrl, vscode.CompletionItemKind.Function);
			let entry = CNSUtility.data.sctrl[sctrl];
			completion.documentation = entry.doc?.replace("\n", "  \n");
			let insertText = new vscode.SnippetString("");;
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
		for(let trigger of Object.keys(CNSUtility.data.trigger)){
			let completion = new vscode.CompletionItem(trigger, vscode.CompletionItemKind.Function);
			let entry = CNSUtility.data.trigger[trigger];
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
		return this.buildCompletions(CNSUtility.isZantei(document));
	}
}

class CNSDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
	private readonly comment_regex = /^\s*;\s*(.*)$/;
	private readonly comment_regex_zss = /^\s*#\s*(.*)$/;
	private readonly comment_section_regex = /^[=-]+$/;
	private readonly section_regex = /^\s*\[(.*?)\]/;
	private readonly section_regex_zss = /^\s*\[(.*?)(?:\]|\s*;\s*$)/;

	private getStatedefComment(line:vscode.TextLine, document:vscode.TextDocument){
		let curLineNo = line.lineNumber-1;
		let curLine = document.lineAt(Math.max(0, curLineNo));
		let comments: string[] = [];
		let regex = CNSUtility.isZantei(document) ? this.comment_regex_zss : this.comment_regex;
		while(true){
			let comment = curLine.text.match(regex)
			if(comment == null) break;
			let text = comment[1].trim()
			if((text.match(this.comment_section_regex) == null) && text.length > 0) {
				comments.unshift(comment[1])
			}
			if(curLineNo == 0) break;
			curLineNo--;
			curLine = document.lineAt(Math.max(0, curLineNo));
		}
		return comments.length > 0 ? comments[0] : "";
	}

	private adjustSymbols(symbols:vscode.DocumentSymbol[], document:vscode.TextDocument){
		for(let i = 0; i < symbols.length; i++){
			let symbol = symbols[i];
			let nextSymbol = symbols[Math.min(i+1, symbols.length-1)];
			if(symbol == nextSymbol){
				symbol.range = new vscode.Range(
					symbol.range.start,
					document.validatePosition(new vscode.Position(document.lineCount, 0))
				);
				break;
			};
			symbol.range = new vscode.Range(
				symbol.range.start,
				document.lineAt(nextSymbol.range.start.translate(-1).line).range.end
			);
		}
	}

	private constructSymbol(document: vscode.TextDocument, line: vscode.TextLine, ignoreState: boolean = false): vscode.DocumentSymbol | undefined{
		let regex = CNSUtility.isZantei(document) ? this.section_regex_zss : this.section_regex;
		let section = line.text.match(regex);
		if(section != null && section.index != null){
			let idx = section.index;
			let range = new vscode.Range(
				line.lineNumber,
				idx,
				line.lineNumber,
				idx+(section[0].length-1)
			);
			let name = section[1];
			if(ignoreState && name.toLowerCase().match(/^state\b/)) return undefined;
			return new vscode.DocumentSymbol(
				name,
				this.getStatedefComment(line, document),
				name.toLowerCase().startsWith("state") ? vscode.SymbolKind.Function : vscode.SymbolKind.Field,
				range,
				range
			);
		}
	}

	public provideDocumentSymbols(document: vscode.TextDocument, _: vscode.CancellationToken): vscode.ProviderResult<vscode.SymbolInformation[] | vscode.DocumentSymbol[]> {
		return new Promise((res, _) => {
			let symbols: vscode.DocumentSymbol[] = [];
			for (let i = 0; i < document.lineCount; i++) {
				let symbol = this.constructSymbol(document, document.lineAt(i), true);
				if (symbol) symbols.push(symbol);
			}
			this.adjustSymbols(symbols, document);
			for(let symbol of symbols){
				let children: vscode.DocumentSymbol[] = [];
				for(let j = symbol.range.start.translate(1).line; j < symbol.range.end.line; j++){
					let subSymbol = this.constructSymbol(document, document.lineAt(j), false);
					if (subSymbol) children.push(subSymbol);
				}
				this.adjustSymbols(children, document);
				symbol.children = children;
			}
			res(symbols);
		})
	}
}

export function activate(context:vscode.ExtensionContext){
	data.readData(context).then((returnal)=>{
		CNSUtility.data = (returnal as data.TSVData);
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
				text = CNSUtility.normalizeText(text);
				edit.replace(selection, text)
			});
		}),
		vscode.commands.registerTextEditorCommand("mugen-vscode.normalizeAll", (textEditor:vscode.TextEditor, edit:vscode.TextEditorEdit) => {
			const doc = textEditor.document;
			let text = doc.getText();
			edit.replace(
				doc.validateRange(new vscode.Range(0, 0, doc.lineCount, 0)),
				CNSUtility.normalizeText(text)
			);
		})
	];
	subscriptions.forEach((k) => {
		context.subscriptions.push(k);
	});
}
