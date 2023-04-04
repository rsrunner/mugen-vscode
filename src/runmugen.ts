/*
MIT License

Copyright (c) 2022 wily-coyote

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import * as vscode from "vscode";
import * as path from "path";

function filenameReplace(arg:string):string{
    let char = filenameAsChar();
    if(char){
        return char;
    }
    else{
        return arg;
    }
}

function filenameAsChar():string|undefined{
    let filename = vscode.window.activeTextEditor?.document.fileName;
    if(filename){
        return path.basename(filename, path.extname(filename));
    }
    else{
        return undefined;
    }
}

function settingCheck(key:string = "gamePath"): string{
    let config = vscode.workspace.getConfiguration("mugen");
    let gamepath = config.get(key) as string;
    if(!gamepath){
        vscode.window.showErrorMessage(key+" is not set. Please set it in your Settings menu.", "Open settings").then(item => {
            if(item){
                vscode.commands.executeCommand("workbench.action.openGlobalSettings")
            }
        });
        return "";
    }
    return gamepath;
}


function runMugen(player1:string, player2:string, stage:string){
    let gamepath = settingCheck("gamePath");
    if(!gamepath){
        return;
    }
    let command:string[] = [player1, player2];
    command = command.filter((x) => !!x);
    if(stage){
        command = command.concat(["-s", filenameReplace(stage)]);
    }
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
    if(!gamepath || !filename){
        return;
    }
    let terminal = vscode.window.createTerminal({
        cwd: path.dirname(gamepath),
        name: "sprmake2"
    })
    terminal.sendText(path.join(path.dirname(gamepath), "sprmake2.exe")+` "${filename}" && pause && exit`);
}

function runSndmaker(){
    let gamepath = settingCheck("gamePath");
    let filename = vscode.window.activeTextEditor?.document.fileName;
    if(!gamepath || !filename){
        return;
    }
    let terminal = vscode.window.createTerminal({
        cwd: path.dirname(gamepath),
        name: "sndmaker"
    })
    terminal.sendText(path.join(path.dirname(gamepath), "sndmaker.exe")+` < "${filename}" && pause && exit`);
}

function runMugenKVC(char:string){
    let kfm = settingCheck("kungFuMan");
    if(!kfm){ return; }
    let filename = filenameAsChar();
    if(filename){
        return runMugen(kfm, filename, "");
    }
}

function runMugenCVK(char:string){
    let kfm = settingCheck("kungFuMan");
    if(!kfm){ return; }
    let filename = filenameAsChar();
    if(filename){
        return runMugen(filename, kfm, "");
    }
}

export function activate(context:vscode.ExtensionContext){
    vscode.commands.executeCommand("setContext", "mugen-vscode.supportedFiles", [
        ".cmd",
        ".cns",
        ".cfg",
        ".def",
        ".air"
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