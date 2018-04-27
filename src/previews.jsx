
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


function arrayify(v) {
    if (!v) return [];
    else if (Array.isArray(v)) return v;
    else return [v];
}

function previewText(entity) {
    return arrayify(entity.text).map(t => `<p>${t}</p>`)
        .join('\n');
}

export const PreviewFactories = {

    feature(feature) {
        // same rendering:
        return this.trait(feature);
    },

    item(item) {
        const rarity = item.rarity
            ? `<i>${item.rarity}</i>`
            : '';

        var text = previewText(item);
        if (item.rarity) {
            text = text.replace(`<p>Rarity: ${item.rarity}</p>`, "");
        }

        return `
            <div>
                <div style="padding-bottom: 0.5em;">
                    <div style="font-size:120%;"><b>${item.name}</b></div>
                    ${rarity}
                </div>
                <div>${text}</div>
            </div>
        `;
    },

    monster(monster) {
        var size = sizes[monster.size];

        var traits = arrayify(monster.trait).concat(arrayify(monster.action)).map(t => `
            <div>
                <b>${t.name}</b>
                ${previewText(t)}
            </div>
        `).join("\n");

        var immunities = "";
        if (monster.resist) {
            immunities += `
                <div>
                    <div><b>Damage resistances</b></div>
                    ${monster.resist}
                </div>
            `;
        }

        if (monster.vulnerable) {
            immunities += `
                <div>
                    <div><b>Damage vulnerabilities</b></div>
                    ${monster.vulnerable}
                </div>
            `;
        }

        if (monster.immune) {
            immunities += `
                <div>
                    <div><b>Damage immunities</b></div>
                    ${monster.immune}
                </div>
            `;
        }

        if (monster.conditionImmune) {
            immunities += `
                <div>
                    <div><b>Condition immunities</b></div>
                    ${monster.conditionImmune}
                </div>
            `;
        }

        return `
            <div>
                <div style="padding-bottom: 0.5em;">
                    <div style="font-size:120%;"><b>${monster.name}</b></div>
                    <i>${size} ${monster.type}</i>
                    <div><b>AC</b>: ${monster.ac}</div>
                    <div><b>HP</b>: ${monster.hp}</div>
                    <div><b>CR</b>: ${monster.cr}</div>
                    <div><b>Speed</b>: ${monster.speed}</div>
                    <div>
                        <table style="text-align: center;">
                            <tr>
                                <th>STR&nbsp;</th><th>&nbsp;DEX&nbsp;</th><th>&nbsp;CON&nbsp;</th>
                                <th>&nbsp;INT&nbsp;</th><th>&nbsp;WIS&nbsp;</th><th>&nbsp;CHA</th>
                            </tr>
                            <tr>
                                <td>${monster.str}</td><td>${monster.dex}</td>
                                <td>${monster.con}</td><td>${monster.int}</td>
                                <td>${monster.wis}</td><td>${monster.cha}</td>
                            </tr>
                        </table>
                    </div>
                </div>
                <div>${immunities}</div>
                <br />
                <div>${traits}</div>
            </div>
        `;
    },

    spell(spell, config) {
        const level = (spell.level === '0')
            ? "Cantrip"
            : spell.level;
        return `
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
                    ${previewText(spell)}
                </div>
            </div>
        `;
    },

    trait(trait) {
        return `
            <div>
                <div style="padding-bottom: 0.5em;">
                    <div style="font-size:120%;"><b>${trait.name}</b></div>
                </div>
                <div>
                    ${previewText(trait)}
                </div>
            </div>
        `;
    },

};
