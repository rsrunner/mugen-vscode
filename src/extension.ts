import * as vscode from "vscode";
import * as runmugen from "./runmugen.js";
import * as langutils from "./langutils.js";

export function activate(context:vscode.ExtensionContext){
    runmugen.activate(context);
    langutils.activate(context);
}

export function deactivate(){
    
}