console.log('EVC injected');

const data = [];

function handleCapture() {
  const targetNode = document.querySelector('#overlap-manager-root tbody > tr:nth-of-type(1) > td:nth-of-type(2)');
  if (targetNode) {
    const match = targetNode.innerText.match(/\((.*)\)/);
    if (match) {
      const number = +match[1];
      updateContextMenu(number);
    }
  }
}

function createMenuItem(sourceNode, label, onClick) {
  const menuItem = sourceNode.cloneNode(true);
  menuItem.querySelector('td:nth-of-type(1) span').innerHTML = '<small><strong>EVC</strong></small>';
  menuItem.querySelector('td:nth-of-type(2) span').innerText = label;
  menuItem.addEventListener('click', () => onClick());
  return menuItem;
}

function updateContextMenu(number) {
  const menuBodyNode = document.querySelector('#overlap-manager-root tbody');
  if (menuBodyNode) {
    const sourceNode = menuBodyNode.querySelector('tr');
    const supportItem = createMenuItem(sourceNode, `Capture support (${number})`, () => restoreData(number, 'support'));
    const resistanceItem = createMenuItem(sourceNode, `Capture resistance (${number})`, () => restoreData(number, 'resistance'));

    if (data.length) {
      const saveItem = createMenuItem(sourceNode, `Download ${data.length} records`, () => download());
      menuBodyNode.prepend(saveItem);
    }

    menuBodyNode.prepend(supportItem, resistanceItem);
  }
}

function restoreData(number, type) {
  const symbol = document.getElementById('header-toolbar-symbol-search')?.innerText;
  if (symbol && (number || number === 0)) {
    // 
    const item = (type === 'support') ? { symbol, support: number } : { symbol, resistance: number };
    data.push(item);
  }

  closeContextMenu();
}

function closeContextMenu() {
  document.getElementById('overlap-manager-root').innerHTML = '';
}

function download() {
  closeContextMenu();
  const dataRows = data.map(x => `${x.symbol},${x.support ?? ''},${x.resistance ?? ''}`).join('\n');
  const csvData = `Symbol,Support,Resistance\n` + dataRows;
  console.log(csvData);

  window.open('data:text/csv;charset=utf-8,' + escape(csvData));
}

function initContextMenuObserver(targetNode) {
  // const targetNode = document.getElementById('overlap-manager-root');
  const config = { attributes: false, childList: true, subtree: false };
  const menuObserverCallback = function (mutationsList, observer) {
    handleCapture();
  };

  // console.log('init', targetNode);
  const observer = new MutationObserver(menuObserverCallback);
  observer.observe(targetNode, config);

  handleCapture();

  return observer;
}

window.addEventListener('load', () => {

  const config = { attributes: false, childList: true, subtree: true };
  const bodyObserverCallback = function (mutationsList, observer) {
    // console.log('body', mutationsList);
    for (const mutation of mutationsList) {
      if (mutation.type === 'childList' && mutation.target.id === 'overlap-manager-root') {
        observer.disconnect();
        initContextMenuObserver(mutation.target);
        break;
      }
    }
  };
  const observer = new MutationObserver(bodyObserverCallback);
  observer.observe(document.body, config);

  // console.log(observer);
}, false);

