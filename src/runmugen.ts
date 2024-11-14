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
import * as path from "path";

function filenameReplace(arg:string):string{
    let char = filenameAsChar();
    if(char)
        return char;
    else
        return arg;
}

function filenameAsChar():string|undefined{
    let filename = vscode.window.activeTextEditor?.document.fileName;
    if(filename)
        return path.basename(filename, path.extname(filename));
    else
        return undefined;
}

function settingCheck(key:string = "gamePath"): string{
    let config = vscode.workspace.getConfiguration("mugen");
    let gamepath = config.get(key) as string;
    if(!gamepath){
        vscode.window.showErrorMessage(key+" is not set. Please set it in your Settings menu.", "Open settings").then(item => {
            if(item) vscode.commands.executeCommand("workbench.action.openGlobalSettings")
        });
        return "";
    }
    return gamepath;
}


function runMugen(player1:string, player2:string, stage:string){
    let gamepath = settingCheck("gamePath");
    if(!gamepath) return;
    let command:string[] = [player1, player2];
    command = command.filter((x) => !!x);
    if(stage) command = command.concat(["-s", filenameReplace(stage)]);
    vscode.window.createTerminal({
        cwd: path.dirname(gamepath),
        name: "Run MUGEN",
        shellPath: gamepath,
        shellArgs: command
    });
}

function runSprmake2(){
    let gamepath = settingCheck("gamePath");
    let filename = vscode.window.activeTextEditor?.document.fileName;
    if(!gamepath || !filename) return;
    let terminal = vscode.window.createTerminal({
        cwd: path.dirname(gamepath),
        name: "sprmake2"
    })
    terminal.sendText(path.join(path.dirname(gamepath), "sprmake2.exe")+` "${filename}" && pause && exit`);
}

function runSndmaker(){
    let gamepath = settingCheck("gamePath");
    let filename = vscode.window.activeTextEditor?.document.fileName;
    if(!gamepath || !filename) return;
    let terminal = vscode.window.createTerminal({
        cwd: path.dirname(gamepath),
        name: "sndmaker"
    })
    terminal.sendText(path.join(path.dirname(gamepath), "sndmaker.exe")+` < "${filename}" && pause && exit`);
}

function runMugenKVC(){
    let kfm = settingCheck("kungFuMan");
    if(!kfm) return;
    let filename = filenameAsChar();
    if(filename) return runMugen(kfm, filename, "");
}

function runMugenCVK(){
    let kfm = settingCheck("kungFuMan");
    if(!kfm) return;
    let filename = filenameAsChar();
    if(filename) return runMugen(filename, kfm, "");
}

export function activate(context:vscode.ExtensionContext){
    vscode.commands.executeCommand("setContext", "mugen-vscode.supportedFiles", [
        ".cmd",
        ".cns",
        ".cfg",
        ".def",
        ".air",
        ".zss",
        ".st",
        ".lua",
        ".json"
    ])

    let commands = [
        vscode.commands.registerCommand("mugen-vscode.runMugen", runMugen),
        vscode.commands.registerCommand("mugen-vscode.runMugenCvk", runMugenCVK),
        vscode.commands.registerCommand("mugen-vscode.runMugenKvc", runMugenKVC),
        vscode.commands.registerCommand("mugen-vscode.runSprmake2", runSprmake2),
        vscode.commands.registerCommand("mugen-vscode.runSndmaker", runSndmaker)
    ]

    for(let i of commands){
        context.subscriptions.push(i);
    }
}
