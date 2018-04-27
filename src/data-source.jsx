
// util.promisify is not available yet; lacona packages node 7, not 8
require('util.promisify/shim')();

import * as fs from 'fs';
import * as http from 'https';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';

import * as xml2js from 'xml2js';

const old = require('mkdirp').mkdirp;
const mkdirp = promisify(old);
const readFile = promisify(fs.readFile);
const parseXmlString = promisify(xml2js.parseString);

export const Kind = {
    Monsters: "monsters",
    Spells: "spells",

    Items: {
        Magic: "magic-items",
        Mundane: "mundane-items",
    }
};

const DND_APP_FILES_ROOT = 'https://raw.githubusercontent.com/storskegg/DnDAppFiles/master';
const XML_URLS = {
    [Kind.Monsters]: `${DND_APP_FILES_ROOT}/Compendiums/Bestiary%20Compendium.xml`,
    [Kind.Spells]: `${DND_APP_FILES_ROOT}/Compendiums/Spells%20Compendium.xml`,

    [Kind.Items.Magic]: `${DND_APP_FILES_ROOT}/Items/Magic%20Items.xml`,
    [Kind.Items.Mundane]: `${DND_APP_FILES_ROOT}/Items/Mundane%20Items.xml`,
};

export class DataSource {
    async fetch(kind) {
        const cacheDir = path.join(os.homedir(), '.config', 'lacona-dnd');
        if (!fs.existsSync(cacheDir)) {
            await mkdirp(cacheDir);
        }
        const xmlPath = await this.downloadXml(cacheDir, kind);
        const xml = await readFile(xmlPath);
        return parseXmlString(xml, {
            explicitArray: false,
        });
    }

    downloadXml(cacheDir, kind) {
        const url = XML_URLS[kind];
        if (!url) return Promise.reject(new Error(`No url for kind ${kind}`));

        const xmlFile = path.join(cacheDir, kind + '.xml');
        if (fs.existsSync(xmlFile)) return Promise.resolve(xmlFile);

        // download:
        console.log(`fetching ${kind} xml`);
        return new Promise((resolve, reject) => {
            const out = fs.createWriteStream(xmlFile);
            http.get(url, response => {
                response.pipe(out);
                out.on('finish', () => {
                    console.log(`Done fetching ${kind} xml!`);
                    out.close();
                    resolve(xmlFile);
                });

            }).on('error', err => {
                fs.unlink(xmlFile);
                reject(err);
            });

            return xmlFile;
        });
    }
}

