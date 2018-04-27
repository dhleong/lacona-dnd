
/** @jsx createElement */
import { createElement } from 'elliptical'; // eslint-disable-line
import { Command } from 'lacona-phrases';
import { openURL } from 'lacona-api';
import { fromPromise } from 'rxjs/observable/fromPromise';

import { DataSource, Kind } from './data-source';

function arrayify(v) {
    if (!v) return [];
    else if (Array.isArray(v)) return v;
    else return [v];
}

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

const sizes = {
    T: "Tiny",
    S: "Small",
    M: "Medium",
    L: "Large",
    H: "Huge",
    G: "Gargantuan",
};

const urlFactories = {
    item: item => {
        const nameEncoded = encodeURIComponent(item.name);
        return `https://roll20.net/compendium/dnd5e/${nameEncoded}#content`;
    },

    spell: spell => {
        const nameEncoded = encodeURIComponent(spell.name);
        return `https://roll20.net/compendium/dnd5e/${nameEncoded}#attributes`;
    },
};

const dataSource = new DataSource();

/**
 * Given an async function, creates a Source
 *  object that can be used with `SourceBackedEntity`
 */
function AsyncSource(kind, asyncFactory) {
    return {
        kind,

        fetch() {
            return fromPromise(this.doFetch());
        },

        async doFetch() {
            const entities = await asyncFactory();
            return entities.map(entity => {
                const result = {
                    text: entity.name,
                    value: entity,
                };
                result.value.kind = kind;
                return result;
            });
        }
    };
}

/**
 * Element definition factory util; expects a Source
 *  such as what might be generated from `AsyncSource`
 */
function SourceBackedEntity(source) {
    return {
        describe({observe}) {
            const items = observe(
                createElement(source)
            );
            return (
                <placeholder argument={source.kind}>
                    <list items={items} strategy='fuzzy' />
                </placeholder>
            );
        }
    };
}

export const MonstersSource = AsyncSource('monster', async () => {
    const json = await dataSource.fetch(Kind.Monsters);
    return json.compendium.monster;
});

export const SpellsSource = AsyncSource('spell', async () => {
    const json = await dataSource.fetch(Kind.Spells);
    return json.compendium.spell;
});

export const ItemsSource = AsyncSource('item', async () => {
    // fetch all item types in parallel
    const jsonRoots = await Promise.all([
        dataSource.fetch(Kind.Items.Magic),
        dataSource.fetch(Kind.Items.Mundane),
    ]);

    // flatten into a single array
    return Array.prototype.concat(
        // we're only interested in the item array
        ...jsonRoots.map(json => json.compendium.item)
    );
});

export const Item = SourceBackedEntity(ItemsSource);
export const Monster = SourceBackedEntity(MonstersSource);
export const Spell = SourceBackedEntity(SpellsSource);

export const DndHelperCommand = {
    extends: [Command],

    execute({entity}) {
        var url;

        const kind = Object.keys(entity)[0];
        const urlFactory = urlFactories[kind];
        if (urlFactory) url = urlFactory(entity[kind]);

        if (url) {
            console.log('Opening', url);
            openURL({ url });
        }
    },

    describe() {
        return (
            <sequence>
                <list
                    limit={1}
                    items={['check ', 'look up ', 'dnd ']}
                    category='action'
                />
                <choice id='entity'>
                    <Spell id='spell' />
                    <Item id='item' />
                    <Monster id='monster' />
                </choice>
            </sequence>
        );
    },

    preview({entity}, {config}) {
        if (entity.spell) {
            return this.previewSpell(entity.spell, config);
        } else if (entity.item) {
            return this.previewItem(entity.item);
        } else if (entity.monster) {
            return this.previewMonster(entity.monster);
        }
    },

    previewSpell(spell, config) {
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
                        ${this._previewText(spell)}
                    </div>
                </div>
            `
        };
    },

    previewItem(item) {

        const rarity = item.rarity
            ? `<i>${item.rarity}</i>`
            : '';

        var text = this._previewText(item);
        if (item.rarity) {
            text = text.replace(`<p>Rarity: ${item.rarity}</p>`, "");
        }

        return {
            type: 'html',
            value: `
                <div>
                    <div style="padding-bottom: 0.5em;">
                        <div style="font-size:120%;"><b>${item.name}</b></div>
                        ${rarity}
                    </div>
                    <div>${text}</div>
                </div>
            `
        };
    },

    previewMonster(monster) {
        // TODO so many things

        var size = sizes[monster.size];

        var traits = arrayify(monster.trait).concat(arrayify(monster.action)).map(t => `
            <div>
                <b>${t.name}</b>
                ${this._previewText(t)}
            </div>
        `).join("\n");

        return {
            type: 'html',
            value: `
                <div>
                    <div style="padding-bottom: 0.5em;">
                        <div style="font-size:120%;"><b>${monster.name}</b></div>
                        <i>${size} ${monster.type}</i>
                        <p>CR ${monster.cr}</p>
                    </div>
                    ${traits}
                </div>
            `
        };
    },

    _previewText(entity) {
        return arrayify(entity.text).map(t => `<p>${t}</p>`)
            .join('\n');
    },

};

export const extensions = [DndHelperCommand];
