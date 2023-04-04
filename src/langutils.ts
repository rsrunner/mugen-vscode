import * as vscode from "vscode";
import * as data from "./data";

const _sctrl_index:string[] = Object.keys(data.mugen_sctrl).concat(Object.keys(data.ikemen_sctrl));
const _trigger_index:string[] = Object.keys(data.mugen_trigger).concat(Object.keys(data.ikemen_trigger));

function isTriggerIkemen(keyword:string):boolean{
    if(data.mugen_trigger.hasOwnProperty(keyword)){
        return false;
    }
    else if(data.ikemen_trigger.hasOwnProperty(keyword)){
        return true;
    }
    else return false;
}

function isSctrlIkemen(keyword:string):boolean{
    if(data.mugen_sctrl.hasOwnProperty(keyword)){
        return false;
    }
    else if(data.ikemen_sctrl.hasOwnProperty(keyword)){
        return true;
    }
    else return false;
}

class CNSHoverProvider implements vscode.HoverProvider {
    public provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken):
    vscode.ProviderResult<vscode.Hover>{
        let line = document.lineAt(position.line).text;
        let equal = line.match(/=/);
        if(line.match(/^\s*type/i)){
            let match = line.match(/type\s*=\s*(\w+)/);
            if(!match) return;
            let name = match[1];
            if(name.length <= 1) return;
            let found = _sctrl_index.find((k )=> name.toLowerCase() == k.toLowerCase());
            if(!found) return;
            let header = new vscode.MarkdownString();
            header.appendCodeblock(found, "cns");
            if(isSctrlIkemen(found)===true){
                return new vscode.Hover([
                    header,
                    `${data.ikemen_sctrl[found].doc}`,
                    `[Github documentation](http://www.elecbyte.com/mugendocs/sctrls.htmlhttps://github.com/ikemen-engine/Ikemen-GO/wiki/State-controllers#${found.toLowerCase()})`
                ]);
            }
            else{
                return new vscode.Hover([
                    header,
                    `${data.mugen_sctrl[found].doc}`,
                    `[Elecbyte documentation](http://www.elecbyte.com/mugendocs/sctrls.html#${found.toLowerCase()})`
                ]);
            }
        }
        else if(equal && equal.index && equal.index < position.character){
            let wordRange = document.getWordRangeAtPosition(position);
            if(!wordRange) return;
            let word = document.getText(wordRange);
            let found = _trigger_index.find((k) => k.toLowerCase().startsWith(word.toLowerCase()));
            if(found){
                let header = new vscode.MarkdownString();
                header.appendCodeblock(found, "cns");
                if(isTriggerIkemen(found)===true){
                    let url = found.match(/\w+/);
                    if(!url) return;
                    word = url[0];
                    return new vscode.Hover([
                        header,
                        `${data.ikemen_trigger[found].doc}`,
                        `[Github documentation](http://www.elecbyte.com/mugendocs/trigger.html#${word.toLowerCase()})`
                    ]);
                }
                else {
                    let url = data.mugen_trigger[found].fmt.replace(/[\(,\)\*\s]+/g, "-").replace(/^-+|-+$/g,"");
                    return new vscode.Hover([
                        header,
                        `${data.mugen_trigger[found].doc}`,
                        `[Elecbyte documentation](http://www.elecbyte.com/mugendocs/trigger.html#${url.toLowerCase()})`
                    ]);
                }
            }
        }
        return null;
    }
}

class CNSCompletionItemProvider implements vscode.CompletionItemProvider{
    public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList<vscode.CompletionItem>> {
        let line = document.lineAt(position.line).text;
        let equal = line.match(/=/);        
        if(line.match(/^\s*type/i)){
            let wordRange = document.getWordRangeAtPosition(position);
            if(!wordRange) return;
            let word = document.getText(wordRange);
            let filtered = _sctrl_index.filter(x => x.toLowerCase().startsWith(word.toLowerCase()));
            let completions = filtered.map(x => {
                let item = new vscode.CompletionItem(x, vscode.CompletionItemKind.Function);
                if(isSctrlIkemen(x)){
                    let sctrl = data.ikemen_sctrl[x];
                    item.documentation = `${sctrl.doc}`;
                    item.insertText = `${x}\n${sctrl.req.map(y => `${y}=`).join("\n")}\n${sctrl.opt.map(y => `; ${y}=`).join("\n")}`;
                }
                else{
                    let sctrl = data.mugen_sctrl[x];
                    item.documentation = `${sctrl.doc}`;
                    item.insertText = `${x}\n${sctrl.req.map(y => `${y}=`).join("\n")}\n${sctrl.opt.map(y => `; ${y}=`).join("\n")}`;
                }
                item.detail = `${x}: state controller`;
                return item;
            });
            return completions;
        } else if(equal && equal.index && equal.index < position.character){
            let wordRange = document.getWordRangeAtPosition(position);
            if(!wordRange) return;
            let word = document.getText(wordRange);
            let filtered = Object.keys(data.mugen_trigger).filter((x) => x.toLowerCase().startsWith(word.toLowerCase()));
            let completions = filtered.map(x => {
                let item = new vscode.CompletionItem(x, vscode.CompletionItemKind.Function)
                if(isTriggerIkemen(x)){
                    let trigger = data.ikemen_trigger[x];
                    item.insertText = trigger.fmt;
                    item.documentation = `${trigger.doc}`;
                }
                else{
                    let trigger = data.mugen_trigger[x];
                    item.insertText = trigger.fmt;
                    item.documentation = `${trigger.doc}`;
                }

                item.detail = `${x}: trigger`;
                return item;
            });
            return completions;
        }
    }
}

function normalizeText(text:string): string{
    return text.replace(/\s*;.*((?:\n|\r\n)+|$)/g, "\n")
                .replace(/(?:\n|\r\n){2,}/g, "\n")
                .replace(/(?!^)\[/g, "\n[")
                .replace(/^(?:\r\n|\n)+|(?:\r\n|\n)+$/g, "");
}

function adjustSymbols(symbols:vscode.DocumentSymbol[], document:vscode.TextDocument){
    for(let i = 0; i < symbols.length; i++){
        let symbol = symbols[i];
        let nextSymbol = symbols[Math.min(i+1, symbols.length-1)];
        if(symbol == nextSymbol){
            symbol.range = new vscode.Range(symbol.range.start, document.validatePosition(new vscode.Position(document.lineCount, 0)));
            break;
        };
        symbol.range = new vscode.Range(symbol.range.start, document.lineAt(nextSymbol.range.start.translate(-1).line).range.end);
    }
}

class CNSDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
    public provideDocumentSymbols(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.SymbolInformation[] | vscode.DocumentSymbol[]> {
        return new Promise((res, rej) => {
            let symbols = [];
            for (let i = 0; i < document.lineCount; i++) {
                let line = document.lineAt(i);

                let sectionMatch = line.text.match(/^\s*\[.*?\]/);
                if(sectionMatch && (sectionMatch.index !== null || sectionMatch.index !== undefined)){

                    let comment = document.lineAt(Math.max(0, i-1));
                    let comments = [];
                    while (comment.lineNumber > 0 && comment.text.match(/^\s*;/)) {
                        comments.unshift(comment.text.replace(/^\s*;\s*/, ""));
                        comment = document.lineAt(Math.max(0, comment.lineNumber-1));
                        if(comment.lineNumber == 0) comments.unshift(comment.text.replace(/^\s*;\s*/, "")); // include the first line as well
                    }

                    comments = comments.filter((x) => (!x.match(/^[-=]+\s*$/)) && (x.length > 0));

                    let idx = sectionMatch.index ?? 0;
                    let range = new vscode.Range(line.lineNumber, idx, line.lineNumber, idx+sectionMatch[0].length-1);
                    let name = sectionMatch[0].replace(/^.*?\[|\].*?$/g, "");
                    let detail = "";
                    if(comments.length > 0){
                        detail = comments[0];
                    }
                    if(name.toLowerCase().match(/^state\b/)) continue;
                    // console.log(line.text, sectionMatch);
                    let symbol = new vscode.DocumentSymbol(name, detail, name.toLowerCase().match(/^statedef\b/) ? vscode.SymbolKind.Function : vscode.SymbolKind.Field, range, range);
                    symbols.push(symbol);
                }
            }
            adjustSymbols(symbols, document);
            for(let symbol of symbols){
                let children = [];
                for(let j = symbol.range.start.translate(1).line; j < symbol.range.end.line; j++){
                    let line = document.lineAt(j);
                    let sectionMatch = line.text.match(/^\s*\[.*?\]/);
                    if(sectionMatch && (sectionMatch.index !== null || sectionMatch.index !== undefined)){
                        let name = sectionMatch[0].replace(/^.*?\[|\].*?$/g, "");
                        children.push(new vscode.DocumentSymbol(name, "", vscode.SymbolKind.Function, line.range, line.range));
                    }
                }
                adjustSymbols(children, document);
                symbol.children = children;
            }
            res(symbols);
        })
    }
}

export function activate(context:vscode.ExtensionContext){
    context.subscriptions.push(vscode.languages.registerHoverProvider("cns", new CNSHoverProvider()));
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider("cns", new CNSCompletionItemProvider(), "="));
    context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider("cns", new CNSDocumentSymbolProvider()));
    context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider("air", new CNSDocumentSymbolProvider()));
    
    const commands = [
        vscode.commands.registerTextEditorCommand("mugen-vscode.normalizeSelection", (textEditor:vscode.TextEditor, edit:vscode.TextEditorEdit) => {
            let bru:any[] = [];
            textEditor.selections.map(sel => {
                let text = textEditor.document.getText(sel);
                let selection:(vscode.Selection|vscode.Range) = sel;
                if(sel.isEmpty){
                    text = textEditor.document.lineAt(sel.start.line).text;
                    selection = textEditor.document.lineAt(sel.start.line).range;
                }
                text = normalizeText(text);
                bru.push([selection, text]);
            });
            for(let i of bru){
                edit.replace(i[0], i[1]);
            }
        }),
        vscode.commands.registerTextEditorCommand("mugen-vscode.normalizeAll", (textEditor:vscode.TextEditor, edit:vscode.TextEditorEdit) => {
            let text = textEditor.document.getText();
            edit.replace(textEditor.document.validateRange(new vscode.Range(0, 0, textEditor.document.lineCount, 0)), normalizeText(text));
        })
    ];


    for(let i of commands){
        context.subscriptions.push(i);
    }
}