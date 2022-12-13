const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const fetch = require('cross-fetch');
const ytdl = require('ytdl-core');

const data = JSON.parse(fs.readFileSync('songs.json', 'utf-8'));
const ignore = fs.readFileSync('ignore.txt', 'utf-8').split('\r').join('\n').split('\n').filter(t => t && t.replace(/\s/g, '').length);

const dirOut = path.resolve('music');
const dirTemp = path.resolve('temp');
const dirFfmpeg = path.resolve('ffmpeg', 'bin', 'ffmpeg.exe');
const fileJpgTemp = path.join(dirTemp, 'cover.jpg');
if(!fs.existsSync(dirOut)) fs.mkdirSync(dirOut);
if(!fs.existsSync(dirTemp)) fs.mkdirSync(dirTemp);

const filenameClean = name => {
  return name.replace(/[~"#%&*:<>?/\\{|}()]+/gi, ''); // Strip any special charactere
};

(async () => {
  const entries = Object.entries(data);
  for(let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const [ id, song ] = entry;
    const ytId = id.split('v=')[1].split('&')[0];

    // Skip unavailable songs
    if(ignore.some(j => j == ytId)) {
      console.log('Skipping gone song', id);
      continue;
    }

    // Check for existing & make output dir.
    let nameArtist = filenameClean(song.artist || song.album || 'Unknown Artist');
    if(nameArtist.endsWith('.')) nameArtist = nameArtist.substr(0, nameArtist.length - 1);
    const dirArtist = path.join(dirOut, nameArtist);
    const fileOut = path.join(dirArtist, filenameClean(song.title) + '.mp3');
    if(fs.existsSync(fileOut)) continue;

    // Download album
    const fileImage = path.join(dirTemp, ytId + '.jpg');
    if(song.image.includes('googleusercontent')) {
      console.log('Downloading image', fileImage)
      const img = song.image.replace('w60-h60-l90', 'w2048-h2048-l100');
      const res = await fetch(img);
      const pipe = res.body.pipe(fs.createWriteStream(fileImage));
      await new Promise((resolve,reject) => {
        pipe.on('close', resolve);
        pipe.on('error', reject);
      })
    }

    // Download song
    const fileSong = path.join(dirTemp, ytId + '.mp4');
    console.log(`Downloading song`, fileSong);
    const info = await ytdl.getInfo(ytId);
    const audioFormat = ytdl.filterFormats(info.formats, 'audioonly').sort((l,r) => r.audioBitrate - l.audioBitrate).find(f => f);
    if(!audioFormat) {
      console.error(`Failed to get`, song);
      return;
    }
    const evt = ytdl(ytId, { format: audioFormat }).pipe(fs.createWriteStream(fileSong));
    await new Promise((resolve,reject) => {
      evt.on('close', resolve);
      evt.on('error', reject);
    });

    // Convert to MP3
    const fileOutTemp = path.join(dirTemp, ytId + '.mp3');
    console.log(`Converting song`, fileOutTemp);
    await new Promise((resolve,reject) => {
      let strm = ffmpeg(fileSong)
        .setFfmpegPath(dirFfmpeg)
        .toFormat('mp3')
      ;
      strm.save(fileOutTemp);
      strm.on('end', resolve);
      strm.on('error', reject);
    });

    // Add metadata and save output
    if(!fs.existsSync(dirArtist)) fs.mkdirSync(dirArtist);
    console.log('Creating', fileOut);
    await new Promise((resolve,reject) => {
      let strm = ffmpeg(fileOutTemp);
      if(fs.existsSync(fileImage)) {
        fs.copyFileSync(fileImage, fileJpgTemp);
        strm = strm.setFfmpegPath(dirFfmpeg)
          .outputOptions('-i', fileJpgTemp)
          .addOutputOption('-map','0:0')
          .addOutputOption('-map','1:0')
          .addOutputOption('-c','copy')
        ;
      }
      
      strm = strm.outputOptions('-id3v2_version', '3')
        .outputOptions('-metadata', 'title=' + song.title)
        .outputOptions('-metadata', 'artist=' + song.artist)
        .outputOptions('-metadata', 'album=' + song.album)
      ;
      strm.save(fileOut);
      strm.on('end', resolve);
      strm.on('error', (...args) => {
        console.log(...args);
        reject(args)
      });
    });
  }
})().catch(console.error);