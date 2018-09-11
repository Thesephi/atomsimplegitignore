"use babel";

import { CompositeDisposable } from "atom";
import { exec } from "child_process";

export default {

  subscriptions: null,
  statusBar: undefined,

  // TODO factor this out into a separate view component?
  operationStatusDisplayer: undefined,

  operationStatusTile: undefined,

  // Points to the most recent Notification responsible for asking the user to
  // open the file or not
  openFilePrompter: undefined,

  activate(state) {
    // Events subscribed to in atom"s system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    this.operationStatusDisplayer = document.createElement("div");
    this.operationStatusDisplayer.classList.add("inline-block");

    // Register our desirable command. Note that this will overwrite the commands
    // listed in our `package.json` file (under `activationCommands`) - although
    // this behavior is undocumented
    this.subscriptions.add(atom.commands.add("atom-workspace", {
      "simple-gitignore:write-gitignore": this.writeGitignore.bind(this)
    }));
  },

  deactivate() {
    this.subscriptions.dispose();
    if(this.operationStatusTile) this.operationStatusTile.destroy();
    this.operationStatusTile = undefined;
    this.operationStatusDisplayer = undefined;
    this.statusBar = undefined;
  },

  serialize() {
    return {};
  },

  refStatusBar(statusBar) {
    this.statusBar = statusBar;
    this.operationStatusTile = this.statusBar.addLeftTile({
      item: this.operationStatusDisplayer,
      priority: 999
    })
  },

  setStatus(msg) {
    if(this.operationStatusDisplayer) {
      this.operationStatusDisplayer.innerHTML = msg;
    }
  },

  writeGitignore() {

    const destinationDir = this.getDirToPlaceGitignoreFile();
    if(!destinationDir) {
      // TODO improve this message if better wording is available?
      const dirSelectionErrorMsg = "Cannot determine which directory to place " +
        ".gitignore file. Please ensure 1 project is active / selected.";
      atom.notifications.addError(dirSelectionErrorMsg);
      return;
    }

    atom.notifications.addInfo(`Writing .gitignore into \`${destinationDir}\``);

    // set status bar msg
    this.setStatus("Preparing .gitignore...");

    exec("npx simplegitignore", {
            cwd: destinationDir
        },
        (err, stdout, stderr) => {
            // clear status bar msg
            this.setStatus("");
            if(err) {
                console.error(err);
                atom.notifications.addError("Unabled to write .gitignore file");
                return;
            }
            if(stdout && stderr && stderr.trim().endsWith("done"))
              this.simplegitignoreStdoutHandler(stdout);
            if(stderr) console.error(stderr);
        });

  },

  simplegitignoreStdoutHandler(stdout) {
    console.log(stdout);
    const prompt = `${stdout} written`;
    this.promptToOpenNewlyWrittenGitignoreFile(stdout.trim(), prompt);
  },

  promptToOpenNewlyWrittenGitignoreFile(fileUri, promptMsg) {

    if(!(fileUri instanceof String) && !(typeof fileUri === "string"))
      throw new Error("uri must be a string");

    promptMsg || (promptMsg = "Open the file?");
    const fileEmptyWarning = "Something wrong happened. Your .gitignore file is"
      + " empty!";

    this.openFilePrompter = atom.notifications.addInfo(promptMsg, {
      buttons: [{
        text: "Open File",
        onDidClick: () => this.openUri(fileUri, fileEmptyWarning)
      }]
    });

  },

  openUri(uri, msgToWarnIfFileIsEmpty) {

    atom.workspace.open(uri)
    .then(editor => {
      if(editor && msgToWarnIfFileIsEmpty && editor.isEmpty())
        atom.notifications.addWarning(msgToWarnIfFileIsEmpty)
    })
    .catch(err => atom.notifications
      .addError(err.message || `Unabled to open ${uri}`));

    setTimeout(() => {
      if(this.openFilePrompter) {
        this.openFilePrompter.dismiss()
        this.openFilePrompter = undefined
      }
    }, 500);

  },

  getDirToPlaceGitignoreFile() {

    const activeTextEditor = atom.workspace.getActiveTextEditor();
    const activeTextEditorPath = activeTextEditor
      ? activeTextEditor.getPath()
      : undefined;

    const projectPaths = atom.project.getPaths();

    const leftDock = atom.workspace.getLeftDock()
    const activeLeftDockPath = leftDock && leftDock.getActivePaneItem()
      ? leftDock.getActivePaneItem().selectedPath
      : undefined;

    if(activeTextEditorPath && activeLeftDockPath
      && (activeTextEditorPath !== activeLeftDockPath)) {
      return undefined;
    }

    // by this time, these 2 values are guaranteed to be the same
    // or either one of them is undefined, or both are undefined
    const activePath = activeTextEditorPath || activeLeftDockPath;

    // if both are undefined, we should not proceed
    if(!activePath) return undefined;

    // if one of the values is defined, make sure it matches one of the
    // current projects' paths; the match will be our return value
    const projectPathsLen = projectPaths.length;
    let theDir;
    for(let i = 0; i < projectPathsLen; i++) {
      if(activePath.startsWith(projectPaths[i])) {
        theDir = projectPaths[i];
        break;
      }
    }

    return theDir;

  }

};
