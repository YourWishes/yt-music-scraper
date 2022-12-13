(() => {
  const songs = {};

  const updateMusic = () => {
    document.querySelectorAll('ytmusic-responsive-list-item-renderer').forEach(item => {
      const id = item.querySelector('.title-column a').href;
      const image = item.querySelector('yt-img-shadow img').src;
      const title = item.querySelector('.title-column .yt-formatted-string').textContent;
      const cols = item.querySelectorAll('.flex-column');
      const artist = cols.length > 0 ? cols[0].querySelector('a')?.textContent : undefined;
      const album = cols.length > 1 ? cols[1].querySelector('a')?.textContent : undefined;
      
      songs[id] = {
        id, image, title, artist, album
      };
    });

    let elem = document.querySelector('#dom-download-music');
    if(!elem) {
      elem = document.createElement('button');
      elem.id = 'dom-download-music';
      elem.addEventListener('click', () => {
        var element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(songs, null, 2)));
        element.setAttribute('download', 'songs.json');
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
      });
      elem.textContent = 'Download';
      elem.setAttribute('style', 'position: fixed; top: 0; left 0; z-index: 999999; background: red; color: white; padding: 16px;');
      document.body.appendChild(elem);
    }
    elem.textContent = 'Download (' + Object.keys(songs).length + ')';
  }

  let int = setInterval(() => updateMusic(), 100);
})();