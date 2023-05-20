function grid() {
  return document.getElementById('main-grid');
}

function openFile(encoding) {
  const fileInput = document.getElementById('file');
  grid().open(fileInput.files[0], encoding);
}

function save() {
  const file = document.getElementById('file').files[0];
  const name = file ? file.name : '無題.csv';
  grid().runCommand('SaveAs', name);
}

function editNewMacro() {
  document.getElementById('macro-dialog').show();
}

function cancelEditMacro() {
  document.getElementById('macro-dialog').close();
}

function addMacro() {
  const macroName =
      document.getElementById('macro-name').value;
  const macroText =
      document.getElementById('macro-input').value;
  grid().addMacro(macroName, macroText);
  const newItem = document.createElement('li');
  newItem.append(macroName)
  newItem.addEventListener(
      'click', () => grid().runMacro(macroText));
  document.getElementById('macro-sub-menu')
      .append(newItem);
  document.getElementById('macro-dialog').close();
}

function runEditingMacro() {
  const macroText =
      document.getElementById('macro-input').value;
  grid().runMacro(macroText);
}

function runCommand(command) {
  grid().runCommand(command);
}

function runMacro(macroName) {
  grid().runNamedMacro(macroName);
}

function undo() {
  grid().undo();
}

function redo() {
  grid().redo();
}

function closeMenus() {
  for (const subMenu of
      document.getElementsByClassName('sub-menu')) {
    subMenu.style.display = 'none';
  }
}

window.addEventListener('DOMContentLoaded', () => {
  for (const item of document.getElementsByClassName(
      'has-sub-menu')) {
    item.addEventListener('click', event => {
      event.stopPropagation();
      let subMenu = item.lastElementChild;
      const open = subMenu.style.display == 'none';
      closeMenus();
      if (open) {
        subMenu.style.display = '';
      } else if (event.target != item) {
        return;
      }
      subMenu = subMenu.parentElement;
      while (subMenu != null
             && subMenu.className != 'main-menu') {
        subMenu.style.display = '';
        subMenu = subMenu.parentElement;
      }      
    });
  }
  closeMenus();
  document.body.addEventListener('click', closeMenus);
});
