'use strict';

import * as cheerio from 'cheerio';

import { ISong } from "chord/music/api/song";
import { ILyric } from 'chord/music/api/lyric';
import { IAlbum } from "chord/music/api/album";
import { IArtist } from "chord/music/api/artist";
import { ITag } from "chord/music/api/tag";
import { ICollection } from "chord/music/api/collection";
import { IAudio } from "chord/music/api/audio";

import { parseToMillisecond } from 'chord/base/common/time';
import { isObject } from 'chord/base/common/checker';

import {
    getSongUrl,
    getAlbumUrl,
    getArtistUrl,
    getCollectionUrl,
    getUserUrl,
    getSongId,
    getAlbumId,
    getArtistId,
    getCollectionId,
    getUserId,
} from "chord/music/common/origin";

import { makeLyric as _makeLyric } from 'chord/music/utils/lyric';


function absoluteUrl(uri: string): string {
    if (uri.startsWith('//')) {
        return 'http:' + uri;
    }
    return uri;
}


const _origin = 'migu';

const _getSongUrl: (id: string) => string = getSongUrl.bind(null, _origin);
const _getSongId: (id: string) => string = getSongId.bind(null, _origin);
const _getAlbumUrl: (id: string) => string = getAlbumUrl.bind(null, _origin);
const _getAlbumId: (id: string) => string = getAlbumId.bind(null, _origin);
const _getArtistUrl: (id: string) => string = getArtistUrl.bind(null, _origin);
const _getArtistId: (id: string) => string = getArtistId.bind(null, _origin);
const _getCollectionUrl: (id: string) => string = getCollectionUrl.bind(null, _origin);
const _getCollectionId: (id: string) => string = getCollectionId.bind(null, _origin);
// const _getUserUrl: (id: string) => string = getUserUrl.bind(null, _origin);
const _getUserId: (id: string) => string = getUserId.bind(null, _origin);


export function makeAudios(infos: any): Array<IAudio> {
    if (!infos) return null;
    let audios = [];
    let url = absoluteUrl(infos['playUrl']);

    let format: string;
    let kbps: number;
    if (url.includes('/flac/')) {
        kbps = 720;
        format = 'flac';
    } else {
        format = 'mp3';
        if (url.match(/MP3_\d+/)) {
            let m = /MP3_(\d+)/.exec(url)[1];
            kbps = Number.parseInt(m);
        } else {
            kbps = 90;
        }
    }

    let audio = {
        format,
        size: null,
        kbps,
        url,
        path: null,
    };
    audios.push(audio);
    return audios;
}

export function makeSong(info: any): ISong {
    let songOriginalId = info['copyrightId'];
    let songMid = (info['songId'] || info['id']).toString();

    let albumInfo = info['albums'] ? info['albums'][0] : info;
    let albumOriginalId = albumInfo['albumId'] && albumInfo['albumId'].toString();

    let artistInfo = info['singers'] ? info['singers'][0] : info;

    let artistOriginalId = artistInfo['artistId']
        || artistInfo['singerId']
        && (isObject(artistInfo['singerId']) ? (
            artistInfo['singerId'].length > 0 ? artistInfo['singerId'][0].toString() : null
        )
            : artistInfo['singerId']);
    let artistName = artistInfo['artistName']
        || artistInfo['singerName']
        && (isObject(artistInfo['singerName']) ? (
            artistInfo['singerName'].length > 0 ? artistInfo['singerName'][0].split(',')[0] : null
        )
            : artistInfo['singerName']);

    let audios = [];
    if (isObject(info['auditions'])) {
        for (let tp of ['HQ', 'SQ', 'Bq']) {
            let url = info['auditions']['lis' + tp];
            let size = info['auditions']['lis' + tp + 'Size'];
            if (!url) continue;
            let kbps;
            if (url.includes('MP3_128')) {
                kbps = 128;
            } else if (url.includes('MP3_320')) {
                kbps = 320;
            } else if (url.includes('flac')) {
                kbps = 720;
            } else {
                continue;
            }
            let audio = {
                format: url.split('.').slice(-1)[0],
                size,
                kbps,
                url,
                path: null,
            };
            audios.push(audio);
        }
    }


    let song: ISong = {
        songId: _getSongId(songOriginalId),

        type: 'song',
        origin: _origin,

        songOriginalId,

        url: _getSongUrl(songOriginalId),

        songName: info['songName'] || (info['contentName'] || '').split(',')[0],
        songMid,

        albumId: _getAlbumId(albumOriginalId),
        albumOriginalId,
        albumName: albumInfo['albumName'] || info['cover'],
        albumCoverUrl: albumInfo['picS'], // migu cover image can't change size,
        // so we use the smallest one

        artistId: _getArtistId(artistOriginalId),
        artistOriginalId,
        artistName,

        lyricUrl: info['lyrics'],

        track: null,
        cdSerial: null,

        // millisecond
        duration: info['length'] && parseToMillisecond(info['length']),

        // millisecond
        releaseDate: null,

        playCountWeb: 0,
        playCount: 0,

        audios,

        disable: false,
    };
    return song;
}

export function makeSongs(info: any): Array<ISong> {
    return (info || []).map(songInfo => makeSong(songInfo));
}

export function makeLyric(songId: string, lyricInfo: string, transInfo: string): ILyric {
    if (!lyricInfo) return null;

    let lyric = _makeLyric(lyricInfo);
    let chunksMap = {};
    lyric.chunks.forEach(chunk => chunksMap[chunk.point] = chunk);

    if (transInfo) {
        let trans = _makeLyric(transInfo);
        trans.chunks.forEach((chunk, index) => {
            let lyricChunk = chunksMap[chunk.point];
            if (lyricChunk) lyricChunk.translation = chunk.text;
        });
    }

    lyric.songId = _getSongId(songId);
    return lyric;
}

export function makeAlbum(info: any): IAlbum {
    let albumOriginalId = (info['albumId'] || info['id']).toString();

    let albumCoverUrl = (info['localAlbumPicS'] || info['albumPicS'] || '').split('?')[0];

    let artistOriginalId = null;
    let artistName = null;
    if (info['singerId']) {
        artistOriginalId = info['singerId'].toString();
    } else {
        if (isObject(info['singer'])) {
            artistOriginalId = info['singer'][0]['id'];
            artistName = info['singer'][0]['name'];
        }
    }

    let album: IAlbum = {
        albumId: _getAlbumId(albumOriginalId),

        type: 'album',
        origin: _origin,
        albumOriginalId: albumOriginalId,
        url: _getAlbumUrl(albumOriginalId),

        albumName: info['albumName'] || info['title'],
        albumCoverUrl: albumCoverUrl,

        artistId: _getArtistId(artistOriginalId),
        artistOriginalId,
        artistName,

        tags: [],

        description: info['albumIntro'],

        releaseDate: parseToMillisecond(info['publishDate']),

        company: info['publishCompany'],

        songs: [],
        songCount: Number.parseInt(info['trackCount'] || info['songNum']),
    };
    return album;
}

export function makeAlbums(info: any): Array<IAlbum> {
    return (info || []).map(albumInfo => makeAlbum(albumInfo));
}

export function makeCollection(info: any): ICollection {
    let collectionOriginalId = (info['playListId'] || info['id']).toString();
    let collectionCoverUrl = info['image'] || info['img'];
    let tags: Array<ITag> = (info['tagLists'] || []).map(tag => ({ name: tag['tagName'] }));
    let userOriginalId = info['createUserId'] || info['userId'];
    let userName = info['createName'] || info['userName'];

    let collection: ICollection = {
        collectionId: _getCollectionId(collectionOriginalId),

        type: 'collection',
        origin: _origin,
        collectionOriginalId,
        url: _getCollectionUrl(collectionOriginalId),

        collectionName: info['playListName'] || info['name'],

        collectionCoverUrl,

        userId: _getUserId(userOriginalId),
        userName,

        releaseDate: Date.parse(info['createTime']),

        description: info['summary'],

        tags,

        songs: [],
        songCount: Number.parseInt(info['contentCount'] || info['musicNum']),

        playCount: info['playCount'] || info['playNum'],
        likeCount: info['keepNum'],
    };
    return collection;
}

export function extractCollectionSongIds(html: any): Array<string> {
    let m = /data-cids="([\da-zA-Z]+,[\da-zA-Z,]+)"/.exec(html);
    let songIds = m ? m[1].split(',').filter(id => !!id) : [];
    return songIds;
}

export function makeCollections(info: any): Array<ICollection> {
    return (info || []).map(collectionInfo => makeCollection(collectionInfo));
}

export function makeArtist(info: any): IArtist {
    let artistOriginalId = (info['artistId'] || info['id']).toString();
    let artistAvatarUrl = (info['localArtistPicS'] || info['artistPicS'] || '').split('?')[0];

    let artist: IArtist = {
        artistId: _getArtistId(artistOriginalId),
        type: 'artist',
        origin: _origin,
        artistOriginalId: artistOriginalId,
        url: _getArtistUrl(artistOriginalId),

        artistName: info['artistName'] || info['title'],
        artistAlias: info['anotherName'],

        artistAvatarUrl: artistAvatarUrl,

        description: info['intro'],

        songs: [],
        albums: [],

        playCount: info['playCount'],
    };
    return artist;
}

export function makeArtists(info: any): Array<IArtist> {
    return (info || []).map(artistInfo => makeArtist(artistInfo));
}

export function extractArtistSongIds(html: any): Array<string> {
    let $ = cheerio.load(html);
    let songIds = Array.from(($('a.action') || [])).map(item => item.attribs['data-cids']).filter(id => !!id);
    return songIds;
}

export function makeArtistAlbums(html: any): Array<IAlbum> {
    let $ = cheerio.load(html);

    // Artist infos
    let elem = $('a.singer')[0];
    if (!elem) return [];

    let artistOriginalId = elem.attribs.href.split('/').slice(-1)[0];
    let artistName = elem.children[0].data;
    let description = $('div.full-content')[0].children[0].data;

    let albums = Array.from($('a.thumb-link')).map((item: any) => {
        let albumOriginalId = item.attribs.href.split('/').slice(-1)[0];
        let img = item.children.filter(c => c.name == 'img')[0];
        let albumCoverUrl = absoluteUrl(img.attribs['data-original']);
        let albumName = img.attribs.alt;

        let album = {
            albumId: _getAlbumId(albumOriginalId),

            type: 'album',
            origin: _origin,
            albumOriginalId: albumOriginalId,
            url: _getAlbumUrl(albumOriginalId),

            albumName,
            albumCoverUrl: albumCoverUrl,

            artistId: _getArtistId(artistOriginalId),
            artistOriginalId,
            artistName,

            tags: [],

            description,

            songs: [],
        }
        return album;
    });
    return albums;
}
