dragElement(document.getElementById("userdrag"));

function dragElement(elmnt) {
  var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  let q = document.querySelector('#userdrag #text');
  if (q) {
    q.onmousedown = dragMouseDown;
  } else {
    elmnt.onmousedown = dragMouseDown;
  }

  function dragMouseDown(e) {
    e = e || window.event;
    //e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    //e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
    elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

let elem_ids = ['screen_width_px', 'screen_height_px', 'screen_width', 'screen_height', 'screen_density', 'imperial'];

let elems = {};
elem_ids.map(x => (elems[x] = document.getElementById(x)).addEventListener('input', docalc));

function setsize(density) {
    let root = document.documentElement;
    //let rsize = density * 128;
    let cwidth = body.clientWidth;
    //let swidth = window.screen.width;
    let dwidth = 26.86;
    //let dpix = dwidth * density;
    //let per = cwidth / dpix;
    let sw = cwidth / density;
    let per = dwidth / sw;
    per *= 100;
    //console.log({cwidth, swidth, dwidth, dpix, per, density, sw});
    root.style.setProperty('--size', `${per}vw`);
}

function docalc() {
    let wpx = Number(elems['screen_width_px'].value);
    let hpx = Number(elems['screen_height_px'].value);
    let sw = Number(elems['screen_width'].value);
    let sh = Number(elems['screen_height'].value);
    let d = Number(elems['screen_density'].value);
    let imp = elems['imperial'].checked;

    if (d) return setsize(imp ? d / 25.4 : d);

    let dw,dh;
    dw = dh = undefined;

    wpx = wpx == 0 ? window.screen.width : wpx;
    hpx = hpx == 0 ? window.screen.height : hpx;

    if (wpx && sw) {
        dw = wpx / sw;
    }

    if (hpx && sh) {
        dh = hpx / sh;
    }

    if (dw || dh) {
        d = dw ?? dh;
    }

    if (!d)return;

    setsize(imp ? d / 25.4 : d);
}

window.onresize = docalc;
docalc();
checkbox_expand.checked = true;