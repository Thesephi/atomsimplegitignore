'use babel';

import AtomsimplegitignoreView from './atomsimplegitignore-view';
import { CompositeDisposable } from 'atom';
import { exec } from 'child_process';

export default {

  // atomsimplegitignoreView: null,
  // modalPanel: null,
  subscriptions: null,

  activate(state) {
    // this.atomsimplegitignoreView = new AtomsimplegitignoreView(state.atomsimplegitignoreViewState);
    // this.modalPanel = atom.workspace.addModalPanel({
    //   item: this.atomsimplegitignoreView.getElement(),
    //   visible: false
    // });

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'atomsimplegitignore:toggle': this.writeGitignore.bind(this)
    }));
  },

  deactivate() {
    // this.modalPanel.destroy();
    this.subscriptions.dispose();
    // this.atomsimplegitignoreView.destroy();
  },

  serialize() {
    return {
      atomsimplegitignoreViewState: this.atomsimplegitignoreView.serialize()
    };
  },

  // toggle() {
  //   console.log('Atomsimplegitignore was toggled!');
  //   // atom.notifications.addInfo(atom.project.getPaths());
  //   console.log(atom.workspace.getActiveTextEditor().getPath());
  //   console.log(atom.workspace.getLeftDock().getActivePaneItem().selectedPath);
  //   this.getDirToPlaceGitignoreFile();
  //   return (
  //     this.modalPanel.isVisible() ?
  //     this.modalPanel.hide() :
  //     this.modalPanel.show()
  //   );
  // },

  writeGitignore() {

    const dirToWrite = this.getDirToPlaceGitignoreFile();
    if(!dirToWrite) return;

    // TODO set status bar msg

    exec("npx simplegitignore", {
            cwd: dirToWrite
        },
        (err, stdout, stderr) => {
            // stBarMsgDisposable.dispose();
            if(err) {
                console.error(err);
                atom.notifications.addError("Unabled to write .gitignore file");
                return;
            }
            if(stdout && stderr && stderr.trim().endsWith("done"))
              this.simplegitignoreStdout(stdout);
            if(stderr) console.error(stderr);
        });

  },

  simplegitignoreStdout(stdout) {
    console.log(stdout);
    atom.notifications.addInfo(`${stdout} written`, { modal: false }, "Open File")
      // TODO implement this behavior
      // .then((value) => {
      //   if(value !== "Open File") return;
      //   vscode.workspace.openTextDocument(stdout.trim())
      //     .then(vscode.window.showTextDocument, (err) => {
      //         vscode.window.showErrorMessage(err.message || `Unabled to open ${stdout}`);
      //     });
      // });
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

    if(activeTextEditorPath !== activeLeftDockPath) {
      atom.notifications.addError("Cannot determine which directory to place " +
        ".gitignore file. Please ensure only 1 project is active.");
      return undefined;
    }

    // by this time, these 2 values are guaranteed to be the same
    const activePath = activeTextEditorPath || activeLeftDockPath;

    const projectPathsLen = projectPaths.length;
    let theDir;
    for(let i = 0; i < projectPathsLen; i++) {
      if(activePath.startsWith(projectPaths[i])) {
        theDir = projectPaths[i];
        break;
      }
    }

    atom.notifications.addInfo(`Writing .gitignore into \`${theDir}\``);
    return theDir;

  }

};
