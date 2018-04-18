
// util.promisify is not available yet; lacona packages node 7, not 8
require('util.promisify/shim')();

import * as fs from 'fs';
import * as http from 'https';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';

/** @jsx createElement */
import { createElement } from 'elliptical'; // eslint-disable-line
import { Command } from 'lacona-phrases';
import { fromPromise } from 'rxjs/observable/fromPromise';

import * as xml2js from 'xml2js';

const spellsXmlUrl = 'https://raw.githubusercontent.com/storskegg/DnDAppFiles/master/Spells/PHB%20Spells.xml';

const old = require('mkdirp').mkdirp;
const mkdirp = promisify(old);
const readFile = promisify(fs.readFile);
const parseXmlString = promisify(xml2js.parseString);

const schools = {
    A: "Abjuration",
    C: "Conjuration",
    D: "Divination",
    EN: "Enchantment",
    EV: "Evocation",
    I: "Illusion",
    N: "Necromancy",
    T: "Transmutation",
};

export const SpellsSource = {
    fetch() {
        return fromPromise(this.doFetch());
    },

    async doFetch() {
        const spells = await this.loadSpells();
        return spells.map(s => {
            return {
                text: s.name,
                value: s,
            };
        });
    },

    downloadXml(cacheDir) {
        const xmlFile = path.join(cacheDir, 'spells.xml');
        if (fs.existsSync(xmlFile)) return Promise.resolve(xmlFile);

        // download:
        console.log('fetching xml');
        return new Promise((resolve, reject) => {
            const out = fs.createWriteStream(xmlFile);
            http.get(spellsXmlUrl, response => {
                response.pipe(out);
                out.on('finish', () => {
                    console.log('Done fetching xml!');
                    out.close();
                    resolve(xmlFile);
                });

            }).on('error', err => {
                fs.unlink(xmlFile);
                reject(err);
            });

            return xmlFile;
        });
    },

    async loadSpells() {
        const cacheDir = path.join(os.homedir(), '.config', 'lacona-dnd');
        if (!fs.existsSync(cacheDir)) {
            await mkdirp(cacheDir);
        }
        const xmlPath = await this.downloadXml(cacheDir);
        const xml = await readFile(xmlPath);
        const json = await parseXmlString(xml, {
            explicitArray: false,
        });

        return json.compendium.spell;
    }
};

export const Spell = {
    describe({observe}) {
        const spells = observe(
            <SpellsSource />
        );
        return (
            <placeholder argument='spell'>
                <list items={spells} strategy='fuzzy' />
            </placeholder>
        );
    },
};

export const DndHelperCommand = {
    extends: [Command],

    execute(result) {
        // TODO should we do anything?
        console.log('Selected', result);
    },

    describe() {
        return (
            <sequence>
                <list
                    limit={1}
                    items={['check ', 'look up ', 'dnd ']}
                    category='action'
                />
                <Spell id='spell' />
            </sequence>
        );
    },

    preview({spell}, {config}) {
        const textList = Array.isArray(spell.text)
            ? spell.text
            : [spell.text];
        const level = (spell.level === '0')
            ? "Cantrip"
            : spell.level;
        return {
            type: 'html',
            value: `
                <div>
                    <div style="padding-bottom: 0.5em;">
                        <div style="font-size:120%;"><b>${spell.name}</b></div>
                        <i>${level} ${schools[spell.school]}</i>
                    </div>
                    <div><b>Casting Time</b>: ${spell.time}</div>
                    <div><b>Range</b>: ${spell.range}</div>
                    <div><b>Components</b>: ${spell.components}</div>
                    <div><b>Duration</b>: ${spell.duration}</div>
                    ${config.showClasses ? `
                    <div><b>Classes</b>: ${spell.classes}</div>
                    ` : '' }
                    <div>
                        ${textList.map(t => `<p>${t}</p>`).join('\n')}
                    </div>
                </div>
            `
        };
    }
};

export const extensions = [DndHelperCommand];
