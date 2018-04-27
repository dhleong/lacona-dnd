
/** @jsx createElement */
import { createElement } from 'elliptical'; // eslint-disable-line
import { Command } from 'lacona-phrases';
import { openURL } from 'lacona-api';
import { fromPromise } from 'rxjs/observable/fromPromise';

import { DataSource, Kind } from './data-source';
import { PreviewFactories } from './previews';

function flatten(arrayOfArrays) {
    return Array.prototype.concat(...arrayOfArrays);
}

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
    return flatten(
        // we're only interested in the item array
        jsonRoots.map(json => json.compendium.item)
    );
});

export const TraitsSource = AsyncSource('trait', async () => {
    // racial traits
    const { compendium } = await dataSource.fetch(Kind.Character);

    // TODO indicate which races have a trait?
    return flatten(
        compendium.race.map(race => race.trait)
    );
});

export const FeaturesSource = AsyncSource('feature', async () => {
    // class features
    const { compendium } = await dataSource.fetch(Kind.Character);

    // TODO indicate which classes have a feature? the level they get it?
    return flatten(
        compendium.class.map(klass => flatten(
            klass.autolevel
                .filter(al => al.feature)
                .map(al => al.feature)
        ))
    );
});

export const Item = SourceBackedEntity(ItemsSource);
export const Monster = SourceBackedEntity(MonstersSource);
export const Spell = SourceBackedEntity(SpellsSource);
export const Feature = SourceBackedEntity(FeaturesSource);
export const Trait = SourceBackedEntity(TraitsSource);

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
                    <Feature id='feature' />
                    <Trait id='trait' />
                </choice>
            </sequence>
        );
    },

    preview({entity}, {config}) {
        const kind = Object.keys(entity)[0];
        const factory = PreviewFactories[kind] || this.previewRawJson;
        const html = factory.call(PreviewFactories, entity[kind], config);
        return {
            type: 'html',
            value: html,
        };
    },

    previewRawJson(entity) {
        return `
            <pre>
${JSON.stringify(entity, null, '  ')}
            </pre>
            `;
    },

};


export const extensions = [DndHelperCommand];
