"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const path = require("path");
function filenameReplace(arg) {
    let char = filenameAsChar();
    if (char) {
        return char;
    }
    else {
        return arg;
    }
}
function filenameAsChar() {
    let filename = vscode.window.activeTextEditor?.document.fileName;
    if (filename) {
        return path.basename(filename, path.extname(filename));
    }
    else {
        return undefined;
    }
}
function gamepathCheck() {
    let config = vscode.workspace.getConfiguration("mugen");
    let gamepath = config.get("gamePath");
    if (!gamepath) {
        vscode.window.showErrorMessage("gamePath is not set. Please set it in your Settings menu.", "Open settings").then(item => {
            if (item) {
                vscode.commands.executeCommand("workbench.action.openGlobalSettings");
            }
        });
        return "";
    }
    return gamepath;
}
function runMugen(player1, player2, stage) {
    let gamepath = gamepathCheck();
    if (!gamepath) {
        return;
    }
    let command = [player1, player2];
    command = command.filter((x) => !!x);
    if (stage) {
        command = command.concat(["-s", filenameReplace(stage)]);
    }
    vscode.window.createTerminal({
        cwd: path.dirname(gamepath),
        name: "Run MUGEN",
        shellPath: gamepath,
        shellArgs: command
    });
}
function runSprmake2() {
    let gamepath = gamepathCheck();
    let filename = vscode.window.activeTextEditor?.document.fileName;
    if (!gamepath || !filename) {
        return;
    }
    let terminal = vscode.window.createTerminal({
        cwd: path.dirname(gamepath),
        name: "sprmake2"
    });
    terminal.sendText(path.join(path.dirname(gamepath), "sprmake2.exe") + ` "${filename}" && pause && exit`);
}
function runSndmaker() {
    let gamepath = gamepathCheck();
    let filename = vscode.window.activeTextEditor?.document.fileName;
    if (!gamepath || !filename) {
        return;
    }
    let terminal = vscode.window.createTerminal({
        cwd: path.dirname(gamepath),
        name: "sndmaker"
    });
    terminal.sendText(path.join(path.dirname(gamepath), "sndmaker.exe") + ` < "${filename}" && pause && exit`);
}
function runMugenKVC(char) {
    let filename = filenameAsChar();
    if (filename) {
        return runMugen("kfm", filename, "");
    }
}
function runMugenCVK(char) {
    let filename = filenameAsChar();
    if (filename) {
        return runMugen(filename, "kfm", "");
    }
}
function activate(context) {
    vscode.commands.executeCommand("setContext", "mugen-vscode.supportedFiles", [
        ".cmd",
        ".cns",
        ".cfg",
        ".def",
        ".air"
    ]);
    let commands = [
        vscode.commands.registerCommand("mugen-vscode.runMugen", runMugen),
        vscode.commands.registerCommand("mugen-vscode.runMugenCvk", runMugenCVK),
        vscode.commands.registerCommand("mugen-vscode.runMugenKvc", runMugenKVC),
        vscode.commands.registerCommand("mugen-vscode.runSprmake2", runSprmake2),
        vscode.commands.registerCommand("mugen-vscode.runSndmaker", runSndmaker)
    ];
    for (let i of commands) {
        context.subscriptions.push(i);
    }
}
exports.activate = activate;
function deactivate() {
}
exports.deactivate = deactivate;
//# sourceMappingURL=runmugen.js.map