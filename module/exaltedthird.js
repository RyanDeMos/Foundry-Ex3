// Import Modules
import { exaltedthird } from "./config.js";

import { addDefensePenalty, ExaltedThirdActor, spendEmbeddedItem } from "./actor/actor.js";
import { ExaltedThirdActorSheet } from "./actor/actor-sheet.js";
import { ExaltedThirdItem } from "./item/item.js";
import { ExaltedThirdItemSheet } from "./item/item-sheet.js";
import * as Chat from "./chat.js";

import { RollForm } from "./apps/dice-roller.js";
import TraitSelector from "./apps/trait-selector.js";
import { registerSettings } from "./settings.js";
import ItemSearch from "./apps/item-search.js";
import Importer from "./apps/importer.js";
import { ExaltedCombatTracker } from "./combat/combat-tracker.js";
import { ExaltedCombatant } from "./combat/combatant.js";
import ExaltedActiveEffect from "./active-effect.js";
import ExaltedActiveEffectConfig from "./active-effect-config.js";
import JournalCascadeGenerator from "./apps/journal-cascade-generator.js";
import { CharacterData, NpcData } from "./template/actor-template.js";
import {
  ItemActionData,
  ItemArmorData,
  ItemCharmData,
  ItemCraftData,
  ItemCraftProjectData,
  ItemCustomAbilityData,
  ItemData,
  ItemDestinyData,
  ItemInitiationData,
  ItemIntimacyData,
  ItemMartialArtData,
  ItemMeritData,
  ItemRitualData,
  ItemShapeData,
  ItemSpecialAbilityData,
  ItemSpecialtyData,
  ItemSpellData,
  ItemWeaponData
} from "./template/item-template.js";
import { ExaltedCombat } from "./combat/combat.js";
import Prophecy from "./apps/prophecy.js";
import TemplateImporter from "./apps/template-importer.js";
import CharacterBuilder from "./apps/character-builder.js";
import RollForm2 from "./apps/dice-roller-2.js";

Hooks.once('init', async function () {

  registerSettings();

  game.exaltedthird = {
    applications: {
      TraitSelector,
      ItemSearch,
      TemplateImporter,
      Importer,
      JournalCascadeGenerator,
      Prophecy
    },
    entities: {
      ExaltedThirdActor,
      ExaltedThirdItem
    },
    config: exaltedthird,
    weaponAttack: weaponAttack,
    triggerItem: triggerItem,
    roll: roll,
    RollForm,
    RollForm2,
  };

  CONFIG.Actor.dataModels = {
    character: CharacterData,
    npc: NpcData
  }

  CONFIG.Item.dataModels = {
    action: ItemActionData,
    armor: ItemArmorData,
    charm: ItemCharmData,
    craft: ItemCraftData,
    craftproject: ItemCraftProjectData,
    customability: ItemCustomAbilityData,
    martialart: ItemMartialArtData,
    destiny: ItemDestinyData,
    intimacy: ItemIntimacyData,
    item: ItemData,
    merit: ItemMeritData,
    ritual: ItemRitualData,
    initiation: ItemInitiationData,
    shape: ItemShapeData,
    specialability: ItemSpecialAbilityData,
    specialty: ItemSpecialtyData,
    spell: ItemSpellData,
    weapon: ItemWeaponData,
  }


  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  // CONFIG.Combat.initiative = {
  //   formula: "1d10cs>=7",
  // };

  // Define custom Entity classes
  CONFIG.exaltedthird = exaltedthird;
  CONFIG.statusEffects = exaltedthird.statusEffects;

  CONFIG.Actor.documentClass = ExaltedThirdActor;
  CONFIG.Item.documentClass = ExaltedThirdItem;

  CONFIG.Combat.documentClass = ExaltedCombat;
  CONFIG.Combatant.documentClass = ExaltedCombatant;
  CONFIG.ui.combat = ExaltedCombatTracker;
  CONFIG.ActiveEffect.documentClass = ExaltedActiveEffect;
  DocumentSheetConfig.registerSheet(ActiveEffect, "exaltedthird", ExaltedActiveEffectConfig, { makeDefault: true });

  CONFIG.ActiveEffect.sheetClass = ExaltedActiveEffectConfig;
  CONFIG.ActiveEffect.legacyTransferral = false;

  game.socket.on('system.exaltedthird', handleSocket);

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("exaltedthird", ExaltedThirdActorSheet, { makeDefault: true });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("exaltedthird", ExaltedThirdItemSheet, { makeDefault: true });

  // Pre-load templates
  loadTemplates([
    "systems/exaltedthird/templates/dialogues/ability-base.html",
    "systems/exaltedthird/templates/dialogues/add-roll-charm.html",
    "systems/exaltedthird/templates/dialogues/accuracy-roll.html",
    "systems/exaltedthird/templates/dialogues/damage-roll.html",
    "systems/exaltedthird/templates/dialogues/added-charm-list.html",
    "systems/exaltedthird/templates/actor/active-effects.html",
    "systems/exaltedthird/templates/item/item-trigger-tab.html",
    "systems/exaltedthird/templates/actor/effects-tab.html",
    "systems/exaltedthird/templates/actor/equipment-list.html",
    "systems/exaltedthird/templates/actor/header-exalt-data.html",
    "systems/exaltedthird/templates/actor/combat-tab.html",
    "systems/exaltedthird/templates/actor/charm-list.html",
    "systems/exaltedthird/templates/actor/social-tab.html",
    "systems/exaltedthird/templates/actor/biography-tab.html",
  ]);

  Combatant.prototype._getInitiativeFormula = function () {
    const actor = this.actor;
    var initDice = 0;
    if (this.actor.type != 'npc') {
      initDice = actor.system.attributes.wits.value + actor.system.abilities.awareness.value;
    }
    else {
      initDice = actor.system.pools.joinbattle.value;
    }
    if (actor.system.settings.rollStunts) {
      initDice += 2;
    }
    return `${initDice}d10cs>=7ds>=10 + 3`;
  }

  foundry.dice.terms.Die.prototype.constructor.MODIFIERS["ds"] = "doubleSuccess";
  //add said function to the Die prototype
  foundry.dice.terms.Die.prototype.doubleSuccess = function (modifier) {
    const rgx = /(?:ds)([<>=]+)?([0-9]+)?/i;
    const match = modifier.match(rgx);
    if (!match) return false;
    let [comparison, target] = match.slice(1);
    comparison = comparison || "=";
    target = parseInt(target) ?? this.faces;
    for (let r of this.results) {
      let success = DiceTerm.compareResult(r.result, comparison, target);
      if (!r.success) {
        r.success = success;
      }
      r.count += (success ? 1 : 0);
    }
  }

  // If you need to add Handlebars helpers, here are a few useful examples:
  Handlebars.registerHelper('concat', function () {
    var outStr = '';
    for (var arg in arguments) {
      if (typeof arguments[arg] != 'object') {
        outStr += arguments[arg];
      }
    }
    return outStr;
  });

  Handlebars.registerHelper('toLowerCase', function (str) {
    return str.toLowerCase();
  });

  Handlebars.registerHelper('healthCheck', function (health, type, options) {
    let healthLevels = options.data.root.system.health.levels;
    if (type === 'warstrider') {
      healthLevels = options.data.root.system.warstrider.health.levels;
    }
    else if (type === 'ship') {
      healthLevels = options.data.root.system.ship.health.levels;
    }
    if (health < healthLevels.zero.value) {
      return '0'
    }
    else if (health < healthLevels.zero.value + healthLevels.one.value) {
      return '1'
    }
    else if (health < healthLevels.zero.value + healthLevels.one.value + healthLevels.two.value) {
      return '2'
    }
    else if (health < healthLevels.zero.value + healthLevels.one.value + healthLevels.two.value + healthLevels.three.value) {
      return '3'
    }
    else if (health < healthLevels.zero.value + healthLevels.one.value + healthLevels.two.value + healthLevels.three.value + healthLevels.four.value) {
      return '4'
    }
    return 'i'
  });

  Handlebars.registerHelper('numLoop', function (num, options) {
    let ret = ''

    for (let i = 0, j = num; i < j; i++) {
      ret = ret + options?.fn(i)
    }

    return ret
  });

  // Handlebars.registerHelper('select', function (selected, options) {
  //   const escapedValue = RegExp.escape(Handlebars.escapeExpression(selected));
  //   const rgx = new RegExp(' value=[\"\']' + escapedValue + '[\"\']');
  //   const html = options.fn(this);
  //   return html.replace(rgx, "$& selected");
  // });

  Handlebars.registerHelper('numLoopCertainStart', function (num, startNum, options) {
    let ret = ''
    for (let i = startNum, j = num + startNum; i < j; i++) {
      ret = ret + options.fn(i)
    }
    return ret
  });

  Handlebars.registerHelper("enrichedHTMLItems", function (sheetData, type, itemID) {
    return sheetData.itemDescriptions[itemID];
  });

  Handlebars.registerHelper("getAbilityDisplay", function (actor, abilityName) {
    const customAbility = actor.items.find(ability => ability._id === abilityName);
    if (customAbility) {
      return customAbility.name;
    }
    return abilityName;
  });

  Handlebars.registerHelper('ifInSet', function (elem, list, options) {
    if (list instanceof Set) {
      return (list.has(elem)) ? options.fn(this) : options.inverse(this);
    }
    return false;
  });

  Handlebars.registerHelper("charmCostDisplay", function (cost) {
    if (!cost) {
      return '';
    }
    let costString = '';
    if (cost.motes > 0 || cost.commitmotes > 0) {
      costString += `${cost.motes || cost.commitmotes}m, `
    }
    if (cost.willpower > 0) {
      costString += `${cost.willpower}wp, `
    }
    if (cost.anima > 0) {
      costString += `${cost.anima}a, `
    }
    if (cost.initiative > 0) {
      costString += `${cost.initiative}i, `
    }
    if (cost.health > 0) {
      costString += `${cost.health}`
      if (cost.healthtype === 'bashing') {
        costString += `hl, `
      }
      if (cost.healthtype === 'lethal') {
        costString += `lhl, `
      }
      if (cost.healthtype === 'aggravated') {
        costString += `ahl, `
      }
    }
    if (cost.xp > 0) {
      costString += `${cost.xp}xp, `
    }
    if (cost.goldxp > 0) {
      costString += `${cost.goldxp}gxp, `
    }
    if (cost.whitexp > 0) {
      costString += `${cost.whitexp}wxp, `
    }
    if (costString !== '') {
      costString = `<b>${game.i18n.localize("Ex3.Cost")}</b>` + ": " + costString;
    }
    return costString;
  });
});

// Hooks.on("updateToken", (token, updateData, options) => {
//   console.log(token);
//   console.log(updateData);
// });

async function handleSocket({ type, id, data, actorId, crasherId = null, addStatuses = [], deleteEffects = [] }) {
  if (type === 'addOpposingCharm' || type === 'addMultiOpposingCharms') {
    if (game.rollForm) {
      data.actor = canvas.tokens.placeables.find(t => t.actor?.id === actorId)?.actor;
      if (!data.actor) {
        data.actor = game.actors.get(actorId);
      }
      if (type === 'addMultiOpposingCharms') {
        game.rollForm.addMultiOpposedBonuses(data);
      } else {
        game.rollForm.addOpposingCharm(data);
      }
    }
  }

  if (!game.user.isGM) return;

  // if the logged in user is the active GM with the lowest user id
  const isResponsibleGM = game.users
    .some(user => user.isGM && user.active)

  if (!isResponsibleGM) return;

  const targetedActor = game.canvas.tokens.get(id)?.actor;

  if (type === 'createGeneratedCharacter') {
    let actor = await Actor.create(data);
    await actor.update({
      ownership: {
        default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER,
        [id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER,
      },
    });
    await actor.calculateAllDerivedStats();
  }
  if (type === 'updateInitiative') {
    game.combat.setInitiative(id, data, crasherId);
  }
  if (type === 'updateTargetData') {
    if (targetedActor) {
      await targetedActor.update(data);
      for (const status of addStatuses) {
        const effectExists = targetedActor.effects.find(e => e.statuses.has(status));
        if (!effectExists) {
          await game.canvas.tokens.get(id).actor.toggleStatusEffect(status);
        }
      }
      if (deleteEffects) {
        await targetedActor.deleteEmbeddedDocuments('ActiveEffect', deleteEffects);
      }
    }
  }
}


Handlebars.registerHelper('ifEquals', function (arg1, arg2, options) {
  return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper('ifNotEquals', function (arg1, arg2, options) {
  return (arg1 != arg2) ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper('ifGreater', function (arg1, arg2, options) {
  return (arg1 > arg2) ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper('ifGreaterEquals', function (arg1, arg2, options) {
  return (arg1 >= arg2) ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper('le', function (a, b) {
  var next = arguments[arguments.length - 1];
  return (a <= b) ? next.fn(this) : next.inverse(this);
});

// Check Triggers to see if show number value
Handlebars.registerHelper('ifNumberValue', function (arg1, arg2, options) {
  return (arg1 >= arg2) ? options.fn(this) : options.inverse(this);
});

$(document).ready(() => {
  const diceIconSelector = '#chat-controls .chat-control-icon .fa-dice-d20';

  $(document).on('click', diceIconSelector, ev => {
    ev.preventDefault();
    new RollForm2(null, { classes: [" exaltedthird exaltedthird-dialog", `${game.settings.get("exaltedthird", "sheetStyle")}-background`] }, {}, { rollType: 'base' }).render(true);
  });
});

Hooks.on("renderItemDirectory", (app, html, data) => {
  const button = $(`<button class="tempalte-importer"><i class="fas fa-suitcase"> </i><b>${game.i18n.localize("Ex3.Import")}</b></button>`);
  html.find(".directory-footer").append(button);

  button.click(ev => {
    game.templateImporter = new TemplateImporter("charm").render(true);
  })
});

Hooks.on("renderActorDirectory", (app, html, data) => {
  const buttonsText = $(`<div class="flexrow">
	<button class="character-generator-button">
		<i class="fas fa-user-plus"></i>
		<b class="button-text">
    ${game.i18n.localize("Ex3.Create")}
		</b>
	</button>

	${game.user.isGM ? `<button class="template-import-button">
		<i class="fas fa-file-import"></i>
		<b class="button-text">
			${game.i18n.localize("Ex3.Import")}
		</b>
	</button>` : ''}
</div>`);

  html.find(".directory-footer").append(buttonsText);

  html.on("click", ".character-generator-button", () => {
    new CharacterBuilder({ classes: [" exaltedthird exaltedthird-dialog", `${game.settings.get("exaltedthird", "sheetStyle")}-background`] }, {}).render(true);
  });

  html.on("click", ".template-import-button", () => {
    game.templateImporter = new TemplateImporter("qc").render(true);
  });

});

Hooks.on("renderJournalDirectory", (app, html, data) => {
  if (game.user.isGM) {
    const button = $(`<button class="item-search-button"><i class="fas fa-book-open"></i><b>${game.i18n.localize("Ex3.CharmCardJournals")}</b></button>`);
    html.find(".directory-footer").append(button);

    button.click(ev => {
      game.journalCascade = new JournalCascadeGenerator().render(true);
    })
  }
});

Hooks.on("renderChatMessage", (message, html, data) => {
  html[0]
    .querySelectorAll('.apply-decisive-damage')
    .forEach((target) => {
      target.addEventListener('click', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        await applyDecisiveDamage(message);
      });
    });
  html[0]
    .querySelectorAll('.apply-withering-damage')
    .forEach((target) => {
      target.addEventListener('click', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        await applyWitheringDamage(message);
      });
    });
  html[0]
    .querySelectorAll('.gain-attack-initiative')
    .forEach((target) => {
      target.addEventListener('click', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        await gainAttackInitiative(message);
      });
    });
  html[0]
    .querySelectorAll('.resume-character')
    .forEach((target) => {
      target.addEventListener('click', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        new CharacterBuilder({ classes: ["exaltedthird exaltedthird-dialog", `${game.settings.get("exaltedthird", "sheetStyle")}-background`] }, message.flags?.exaltedthird?.character).render(true);
      });
    });
  html[0]
    .querySelectorAll('.add-oppose-charms')
    .forEach((target) => {
      target.addEventListener('click', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        let actor = null;

        if (message.flags?.exaltedthird?.targetActorId) {
          actor = canvas.tokens.placeables.find(t => t.id === message.flags?.exaltedthird?.targetTokenId)?.actor;
          if (!actor) {
            actor = game.actors.get(message.flags?.exaltedthird?.targetActorId);
          }
          if (actor.permission < 3 || (!game.user.isGM && !actor.system.lunarform?.enabled)) {
            actor = null;
          }
        }

        if (!actor && game.user.character) {
          actor = game.user.character;
        }
        if (!actor) {
          ui.notifications.error(`Error: Could not find proper tokens actor and the logged in user has no set character to default to.`);
        }

        if (actor) {
          actor.actionRoll(
            {
              rollType: 'useOpposingCharms'
            }
          );
        }
      });
    });
  html[0]
    .querySelectorAll('.make-chat-roll')
    .forEach((target) => {
      target.addEventListener('click', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const attribute = message.flags?.exaltedthird?.attribute;
        const ability = message.flags?.exaltedthird?.ability;
        const difficulty = message.flags?.exaltedthird?.difficulty;
        if (game.user.character) {
          game.user.character.actionRoll({
            rollType: 'ability',
            ability: ability,
            attribute: attribute,
            difficulty: difficulty,
          });
        } else {
          ui.notifications.error('This user has no character');
        }
      });
    });
});

Hooks.on('updateCombat', (async (combat, update, diff, userId) => {
  // Handle non-gm users.
  if (!game.user.isGM) return;

  if (combat.current === undefined) {
    combat = game.combat;
  }

  //New round
  if (update && update.round && update.round !== 1) {
    for (var combatant of combat.combatants) {
      const actorData = foundry.utils.duplicate(combatant.actor)
      var missingPersonal = (combatant.actor.system.motes.personal.max - combatant.actor.system.motes.personal.committed) - combatant.actor.system.motes.personal.value;
      var missingPeripheral = (combatant.actor.system.motes.peripheral.max - combatant.actor.system.motes.peripheral.committed) - combatant.actor.system.motes.peripheral.value;
      var restorePersonal = 0;
      var restorePeripheral = 0;
      if (missingPeripheral >= 5) {
        restorePeripheral = 5;
      }
      else {
        if (missingPeripheral > 0) {
          restorePeripheral = missingPeripheral;
        }
        var maxPersonalRestore = 5 - restorePeripheral;
        if (missingPersonal > maxPersonalRestore) {
          restorePersonal = maxPersonalRestore;
        }
        else {
          restorePersonal = missingPersonal;
        }
      }
      actorData.system.motes.personal.value += restorePersonal;
      actorData.system.motes.peripheral.value += restorePeripheral;
      actorData.system.shieldinitiative.value = actorData.system.shieldinitiative.max;
      let totalHealth = 0;
      let bashingDamage = 0;
      let lethalDamage = 0;
      let aggravatedDamage = 0;
      let initiativeDamage = 0;
      let moteCost = 0;
      let crasherId = null;
      let currentCombatantInitiative = combatant.initiative;
      for (let [key, health_level] of Object.entries(actorData.system.health.levels)) {
        totalHealth += health_level.value;
      }
      for (const activeEffect of combatant.actor.allApplicableEffects()) {
        if (activeEffect.duration.remaining >= 0 && !activeEffect.disabled) {
          for (const change of activeEffect.changes) {
            if (change.key === 'system.damage.round.initiative.lethal' || change.key === 'system.damage.round.initiative.bashing') {
              if (currentCombatantInitiative !== null && (currentCombatantInitiative - parseInt(change.value)) <= 0 && currentCombatantInitiative > 0) {
                crasherId = activeEffect.flags?.exaltedthird?.poisonerCombatantId;
              }
              currentCombatantInitiative -= parseInt(change.value);
              initiativeDamage += parseInt(change.value);
              if (combatant.initiative !== null && combatant.initiative <= 0) {
                if (change.key === 'system.damage.round.initiative.bashing') {
                  bashingDamage += parseInt(change.value);
                }
                else {
                  lethalDamage += parseInt(change.value);
                }
              }
            }
            if (change.key === 'system.damage.round.bashing') {
              bashingDamage += parseInt(change.value);
            }
            if (change.key === 'system.damage.round.lethal') {
              lethalDamage += parseInt(change.value);
            }
            if (change.key === 'system.damage.round.aggravated') {
              aggravatedDamage += parseInt(change.value);
            }
            if (change.key === 'system.motes.cost.round') {
              moteCost += parseInt(change.value);
            }
          }
        }
        if (activeEffect.flags?.exaltedthird?.weaponInflictedPosion && activeEffect.duration.remaining === 0) {
          await activeEffect.delete();
        }
      }
      if (bashingDamage || lethalDamage || aggravatedDamage) {
        actorData.system.health.aggravated = Math.min(totalHealth - actorData.system.health.bashing - actorData.system.health.lethal, actorData.system.health.aggravated + aggravatedDamage);
        actorData.system.health.lethal = Math.min(totalHealth - actorData.system.health.bashing - actorData.system.health.aggravated, actorData.system.health.lethal + lethalDamage);
        actorData.system.health.bashing = Math.min(totalHealth - actorData.system.health.aggravated - actorData.system.health.lethal, actorData.system.health.bashing + bashingDamage);
      }
      if (combatant.initiative !== null && combatant.initiative > 0 && initiativeDamage) {
        game.combat.setInitiative(combatant.id, currentCombatantInitiative, crasherId);
        if (crasherId) {
          const crasher = game.combat.combatants.get(crasherId);
          if (crasher && crasher.initiative) {
            game.combat.setInitiative(crasherId, crasher.initiative + 5);
          }
        }
      }
      if (moteCost) {
        var moteResults = combatant.actor.spendMotes(moteCost, actorData);
        actorData.system.motes.personal.value = moteResults.newPersonalMotes;
        actorData.system.motes.peripheral.value = moteResults.newPeripheralMotes;
        actorData.system.anima.level = moteResults.newAnimaLevel;
        actorData.system.anima.value = moteResults.newAnimaValue;
      }

      if (combatant.flags?.crashRecovery) {
        await combatant.update({
          [`flags.crashRecovery`]: combatant.flags.crashRecovery - 1,
        });
      }

      await combatant.actor.update(actorData);
    }
  }
  if (update && (update.round !== undefined || update.turn !== undefined)) {
    //Start of Persons Turn
    if (combat.current.combatantId) {
      var currentCombatant = combat.combatants.get(combat.current.combatantId);
      if (currentCombatant?.actor) {
        const onslaught = currentCombatant.actor.effects.find(i => i.flags.exaltedthird?.statusId == "onslaught");
        if (onslaught) {
          if (!currentCombatant.actor.system.dontresetonslaught) {
            await onslaught.delete();
          }
        }
        const fullDefense = currentCombatant.actor.effects.find(e => e.statuses.has('fulldefense'));
        if (fullDefense) {
          await fullDefense.delete();
        }
        const defensePenalty = currentCombatant.actor.effects.find(i => i.flags.exaltedthird?.statusId == "defensePenalty");
        if (defensePenalty) {
          await defensePenalty.delete();
        }
        const actorData = foundry.utils.duplicate(currentCombatant.actor);
        if (currentCombatant.actor.system.grapplecontrolrounds.value > 0) {
          actorData.system.grapplecontrolrounds.value -= 1;
        }
        actorData.system.dontresetonslaught = false;
        const startTurnItems = actorData.items.filter((item) => item.system.active && item.system.endtrigger === 'startturn');
        for (const item of startTurnItems) {
          item.system.active = false;
          if (item.type === 'charm') {
            if (actorData.system.settings.charmmotepool === 'personal') {
              if (item.system.cost.commitmotes > 0) {
                actorData.system.motes.personal.committed -= item.system.cost.commitmotes;
              }
            }
            else {
              if (item.system.cost.commitmotes > 0) {
                actorData.system.motes.peripheral.committed -= item.system.cost.commitmotes;
              }
            }
          }
          for (const effect of currentCombatant.actor.allApplicableEffects()) {
            if (effect._sourceName === item.name) {
              effect.update({ disabled: true });
            }
          }
        }
        for (const effectItem of currentCombatant.actor.items.filter((item) => item.system.endtrigger === 'startturn')) {
          for (const effect of effectItem.effects) {
            effect.update({ disabled: true });
          }
        }
        var moteCost = 0;
        for (const activeEffect of currentCombatant.actor.allApplicableEffects()) {
          if (activeEffect.duration.remaining >= 0 && !activeEffect.disabled) {
            for (const change of activeEffect.changes) {
              if (change.key === 'system.motes.cost.turn') {
                moteCost += parseInt(change.value);
              }
            }
          }
        }
        if (moteCost) {
          var moteResults = currentCombatant.actor.spendMotes(moteCost, actorData);
          actorData.system.motes.personal.value = moteResults.newPersonalMotes;
          actorData.system.motes.peripheral.value = moteResults.newPeripheralMotes;
          actorData.system.anima.level = moteResults.newAnimaLevel;
          actorData.system.anima.value = moteResults.newAnimaValue;
        }
        await currentCombatant.actor.update(actorData);
      }
    }
    if (combat.previous.combatantId) {
      var previousCombatant = combat.combatants.get(combat.previous.combatantId);
      if (previousCombatant?.actor) {
        const previousActorData = foundry.utils.duplicate(previousCombatant.actor);
        if (previousActorData.system.battlegroup) {
          previousActorData.system.commandbonus.value = 0;
        }
        const endTurnItems = previousActorData.items.filter((item) => item.system.active && item.system.endtrigger === 'endturn');
        for (const item of endTurnItems) {
          item.system.active = false;
          if (item.type === 'charm') {
            if (previousActorData.system.settings.charmmotepool === 'personal') {
              if (item.system.cost.commitmotes > 0) {
                previousActorData.system.motes.personal.committed -= item.system.cost.commitmotes;
              }
            }
            else {
              if (item.system.cost.commitmotes > 0) {
                previousActorData.system.motes.peripheral.committed -= item.system.cost.commitmotes;
              }
            }
          }
          for (const effect of previousCombatant.actor.allApplicableEffects()) {
            if (effect._sourceName === item.name) {
              effect.update({ disabled: true });
            }
          }
        }
        for (const effectItem of previousCombatant.actor.items.filter((item) => item.system.endtrigger === 'endturn')) {
          for (const effect of effectItem.effects) {
            effect.update({ disabled: true });
          }
        }
        await previousCombatant.actor.update(previousActorData);
      }
    }
  }
}));

Hooks.on("deleteCombat", (entity, deleted) => {
  for (const combatant of entity.combatants) {
    if (combatant?.actor) {
      const previousActorData = foundry.utils.duplicate(combatant.actor);
      const endSceneItems = previousActorData.items.filter((item) => item.system.active && item.system.endtrigger === 'endscene');
      if (endSceneItems?.length) {
        for (const item of endSceneItems) {
          item.system.active = false;
          if (item.type === 'charm') {
            if (previousActorData.system.settings.charmmotepool === 'personal') {
              if (item.system.cost.commitmotes > 0) {
                previousActorData.system.motes.personal.committed -= item.system.cost.commitmotes;
              }
            }
            else {
              if (item.system.cost.commitmotes > 0) {
                previousActorData.system.motes.peripheral.committed -= item.system.cost.commitmotes;
              }
            }
          }
          for (const effect of combatant.actor.allApplicableEffects()) {
            if (effect._sourceName === item.name) {
              effect.update({ disabled: true });
            }
          }
        }
        combatant.actor.update(previousActorData);
      }
      for (const effectItem of combatant.actor.items.filter((item) => item.system.endtrigger === 'endscene')) {
        for (const effect of effectItem.effects) {
          effect.update({ disabled: true });
        }
      }
    }
  }
});

Hooks.on("chatMessage", (html, content, msg) => {
  let regExp;
  regExp = /(\S+)/g;
  let commands = content.match(regExp);
  let command = commands[0];

  if (command === "/info") {
    const chatData = {
      style: CONST.CHAT_MESSAGE_STYLES.OTHER,
      content: '<div><b>Commands</b></div><div><b>/info</b> Display possible commands</div><div><b>/newscene</b> End any scene duration charms</div><div><b>/xp</b> Give xp to player characters</div><div><b>/advancetime</b> Advance time to restore health, motes, and willpower</div>',
    };
    ChatMessage.create(chatData);
    return false;
  }
  if (command === "/xp") {
    const actors = game.users.players.filter(c => c.character && c.character.type === 'character').map(u => u.character);

    new foundry.applications.api.DialogV2({
      window: { title: game.i18n.localize("Ex3.GiveExperience") },
      content: `
      <form class="noflex" autocomplete="off">
      <div class="settings-list">
          <div class="form-group">
              <label class="resource-label">Standard XP</label>
              <div class="form-fields">
                <input id="standard" type="number" name="standard" value="5" min="0" max="99"/>
              </div>
          </div>
          <div class="form-group">
            <label>Exalt XP</label>
            <div class="form-fields">
                <input id="exalt" type="number" name="exalt" value="0" min="0" max="99"/>
            </div>
          </div>
      </div>
      </form>`,
      classes: [`${game.settings.get("exaltedthird", "sheetStyle")}-background`],
      buttons: [{
        action: "choice",
        label: game.i18n.localize("Ex3.GiveXP"),
        default: true,
        callback: (event, button, dialog) => button.form.elements
      }, {
        action: "cancel",
        label: game.i18n.localize("Ex3.Cancel"),
        callback: (event, button, dialog) => false
      }],
      submit: result => {
        if (result) {
          actors.forEach((actor) => {
            const newStandardTotal = (parseInt(actor.system.experience.standard.total) || 0) + parseInt(result?.standard?.value || 0);
            const newExaltTotal = (parseInt(actor.system.experience.exalt.total) || 0) + parseInt(result?.exalt?.value || 0);
            actor.update({ "system.experience.standard.total": Math.ceil(newStandardTotal), "system.experience.exalt.total": Math.ceil(newExaltTotal) });
          });

          ui.notifications.info('Gave out XP points');
        }
      }
    }).render({ force: true });
    return false;
  }
  if (command === "/newscene") {
    const tokens = canvas.scene?.tokens;
    for (const token of tokens) {
      if (token.actor) {
        const actorData = foundry.utils.duplicate(token.actor);
        const endSceneItems = actorData.items.filter((item) => item.system.active && item.system.endtrigger === 'endscene');
        for (const item of endSceneItems) {
          item.system.active = false;
          if (item.type === 'charm') {
            if (actorData.system.settings.charmmotepool === 'personal') {
              if (item.system.cost.commitmotes > 0) {
                actorData.system.motes.personal.committed -= item.system.cost.commitmotes;
              }
            }
            else {
              if (item.system.cost.commitmotes > 0) {
                actorData.system.motes.peripheral.committed -= item.system.cost.commitmotes;
              }
            }
          }
          for (const effect of token.actor.allApplicableEffects()) {
            if (effect._sourceName === item.name) {
              effect.update({ disabled: true });
            }
          }
        }
        for (const effectItem of token.actor.items.filter((item) => item.system.endtrigger === 'endscene')) {
          for (const effect of effectItem.effects) {
            effect.update({ disabled: true });
          }
        }
        token.actor.update(actorData);
      }
    }
    const chatData = {
      style: CONST.CHAT_MESSAGE_STYLES.OTHER,
      content: 'New Scene',
    };
    ChatMessage.create(chatData);
    return false;
  }
  if (command === '/advancetime') {
    const actors = game.users.players.filter(c => c.character && c.character.type === 'character').map(u => u.character);

    new foundry.applications.api.DialogV2({
      window: { title: game.i18n.localize("Ex3.AdvanceTime") },
      content: `
      <form class="noflex" autocomplete="off">
      <div class="settings-list">
      <div>Restore motes at 5 per hour<p> Restore WP at 1 per day <p> Health is restored based on the chart on Exalted, p.173</div>

          <div class="form-group">
              <label class="resource-label">Hours</label>
              <div class="form-fields">
                <input id="hours" type="number" name="hours" value="0" min="0" max="99"/>
              </div>
          </div>
          <div class="form-group">
            <label>Days</label>
            <div class="form-fields">
                <input id="days" type="number" name="days" value="0" min="0" max="99"/>
            </div>
          </div>
      </div>
      </form>`,
      classes: [`${game.settings.get("exaltedthird", "sheetStyle")}-background`],
      buttons: [{
        action: "choice",
        label: game.i18n.localize("Ex3.Advance"),
        default: true,
        callback: (event, button, dialog) => button.form.elements
      }, {
        action: "cancel",
        label: game.i18n.localize("Ex3.Cancel"),
        callback: (event, button, dialog) => false
      }],
      submit: result => {
        if (result) {
          const healingRates = {
            "0": { bashing: 1, lethal: 24, aggravated: 24 }, // 1 hour bashing, 24 hours (1 day) lethal/aggravated
            "1": { bashing: 12, lethal: 48, aggravated: 48 }, // 12 hours bashing, 48 hours (2 days) lethal/aggravated
            "2": { bashing: 24, lethal: 72, aggravated: 72 }, // 24 hours (1 day) bashing, 72 hours (3 days) lethal/aggravated
            "4": { bashing: 48, lethal: 120, aggravated: 120 }, // 48 hours (2 days) bashing, 120 hours (5 days) lethal/aggravated
            "inc": { bashing: 0, lethal: 0, aggravated: 0 }   // Treat inc as -4: 48 hours (2 days) bashing, 120 hours (5 days) lethal/aggravated
          };

          actors.forEach((actor) => {
            const hours = parseInt(result?.hours?.value || 0);
            const days = parseInt(result?.days?.value || 0);

            let healingPower = (days * 24) + hours;
            let bashingHealed = 0;
            let lethalHealed = 0;
            let aggHealed = 0;
            const healthData = JSON.parse(JSON.stringify(actor.system.health));

            const levels = Object.entries(healthData.levels).sort((a, b) => a[1].penalty - b[1].penalty);

            let totalAggravated = healthData.aggravated;
            let totalLethal = healthData.lethal;
            let totalBashing = healthData.bashing;

            // Iterate over each health level and assign damage
            for (let [levelName, levelData] of levels) {
              let damageApplied = { aggravated: 0, lethal: 0, bashing: 0 };

              // Apply aggravated damage first
              if (totalAggravated > 0) {
                let applyAggravated = Math.min(totalAggravated, levelData.value);
                damageApplied.aggravated = applyAggravated;
                totalAggravated -= applyAggravated;
                levelData.value -= applyAggravated;
              }

              // Then apply lethal damage
              if (totalLethal > 0) {
                let applyLethal = Math.min(totalLethal, levelData.value);
                damageApplied.lethal = applyLethal;
                totalLethal -= applyLethal;
                levelData.value -= applyLethal;
              }

              // Finally, apply bashing damage
              if (totalBashing > 0) {
                let applyBashing = Math.min(totalBashing, levelData.value);
                damageApplied.bashing = applyBashing;
                totalBashing -= applyBashing;
                levelData.value -= applyBashing;
              }

              // Attach the damageApplied object to the level
              healthData.levels[levelName].damageApplied = damageApplied;
            }

            for (let [key, healthLevel] of Object.entries(healthData.levels).reverse()) {
              for (let i = 0; i < healthLevel.damageApplied.bashing; i++) {
                if (healingPower >= healingRates[healthLevel.penalty].bashing && bashingHealed < actor.system.health.bashing) {
                  healingPower -= healingRates[healthLevel.penalty].bashing;
                  bashingHealed++
                }
              }
              for (let i = 0; i < healthLevel.damageApplied.lethal; i++) {
                if (healingPower >= healingRates[healthLevel.penalty].lethal && bashingHealed < actor.system.health.lethal) {
                  healingPower -= healingRates[healthLevel.penalty].lethal;
                  lethalHealed++
                }
              }
              for (let i = 0; i < healthLevel.damageApplied.aggravated; i++) {
                if (healingPower >= healingRates[healthLevel.penalty].aggravated && bashingHealed < actor.system.health.aggravated) {
                  healingPower -= healingRates[healthLevel.penalty].aggravated;
                  aggHealed++
                }
              }
            }

            if (days > 0) {
              actor.update({
                "system.willpower.value": Math.min(actor.system.willpower.max, actor.system.willpower.value + days),
                "system.motes.personal.value": actor.system.motes.personal.max - actor.system.motes.personal.committed,
                "system.motes.peripheral.value": actor.system.motes.peripheral.max - actor.system.motes.peripheral.committed,
                "system.health.bashing": Math.max(0, actor.system.health.bashing - bashingHealed),
                "system.health.lethal": Math.max(0, actor.system.health.lethal - lethalHealed),
                "system.health.aggravated": Math.max(0, actor.system.health.aggravated - aggHealed),
              });
            } else {
              actor.update({
                "system.health.bashing": Math.max(0, actor.system.health.bashing - bashingHealed),
                "system.health.lethal": Math.max(0, actor.system.health.lethal - lethalHealed),
                "system.health.aggravated": Math.max(0, actor.system.health.aggravated - aggHealed),
              });
              actor.restoreMotes(hours * 5);
            }
          });
          ui.notifications.info('Advanced Time');
        }
      }
    }).render({ force: true });
    return false;
  }
});

Hooks.on("renderChatLog", (app, html, data) => {
  Chat.addChatListeners(html);
});

//Martialart, craft, and initiation are deprecated but i don't want to delete them because it will break characters
Hooks.on("renderDialog", (dialog, html) => {
  Array.from(html.find("#document-create option")).forEach(i => {
    if (i.value == "martialart" || i.value == "craft" || i.value == "initiation") {
      i.remove()
    }
  });
});

Hooks.on("renderTokenConfig", (dialog, html) => {
  Array.from(html.find(".bar-attribute option")).forEach(i => {
    if (i.value.includes('savedRolls')) {
      i.remove()
    }
  });
})

Hooks.once("ready", async function () {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to

  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on("hotbarDrop", (bar, data, slot) => {
    if (["Item", "savedRoll"].includes(data.type)) {
      createItemMacro(data, slot);
      return false;
    }
  });

  const gameMigrationVersion = game.settings.get("exaltedthird", "systemMigrationVersion");

  if (foundry.utils.isNewerVersion("1.4.1", game.settings.get("exaltedthird", "systemMigrationVersion"))) {
    for (let item of game.items) {
      try {
        let updateData = foundry.utils.deepClone(item.toObject());
        if (updateData.type === 'weapon') {
          console.log(`Migrating Item document ${item.name}`);
          if (updateData.system.defence && updateData.system.defence > 0) {
            updateData.system.defense = updateData.system.defence;
            updateData.system.defence = 0;
          }
          if (!foundry.utils.isEmpty(updateData)) {
            await item.update(updateData, { enforceTypes: false });
          }
        }
      } catch (error) {
        error.message = `Failed migration for Item ${item.name}: ${error.message} `;
        console.error(error);
      }
      await game.settings.set("exaltedthird", "systemMigrationVersion", game.system.version);
    }
  }

  if (foundry.utils.isNewerVersion("1.4.3", game.settings.get("exaltedthird", "systemMigrationVersion"))) {
    for (let actor of game.actors) {
      try {
        let updateData = foundry.utils.deepClone(actor.toObject());
        updateData.system.details.animacolor = updateData.system.details.color;
        if (!foundry.utils.isEmpty(updateData)) {
          await actor.update(updateData, { enforceTypes: false });
        }
      } catch (error) {
        error.message = `Failed migration for Actor ${actor.name}: ${error.message} `;
        console.error(error);
      }
    }
  }

  if (foundry.utils.isNewerVersion("1.7.6", game.settings.get("exaltedthird", "systemMigrationVersion"))) {
    for (let actor of game.actors.filter((actor) => actor.type === 'npc' && actor.system.creaturetype !== 'exalt' && actor.system.details.exalt === 'abyssal')) {
      try {
        let updateData = foundry.utils.deepClone(actor.toObject());
        updateData.system.details.exalt = 'other';
        if (!foundry.utils.isEmpty(updateData)) {
          await actor.update(updateData, { enforceTypes: false });
        }
      } catch (error) {
        error.message = `Failed migration for Actor ${actor.name}: ${error.message} `;
        console.error(error);
      }
    }
  }

  if (foundry.utils.isNewerVersion("1.9.2", game.settings.get("exaltedthird", "systemMigrationVersion"))) {
    for (let item of game.items) {
      try {
        if (item.type === 'charm') {
          let updateData = foundry.utils.deepClone(item.toObject());
          if (updateData.system.ability === 'martial' || updateData.system.ability === 'essence' || (updateData.system.martialart && !updateData.system.listingname)) {
            console.log(`Migrating Item document ${item.name}`);
            if (updateData.system.martialart && !updateData.system.listingname) {
              updateData.system.listingname = updateData.system.martialart;
              updateData.system.martialart = "";
            }
            if (updateData.system.ability === 'martial') {
              updateData.system.ability = 'martialarts';
            }
            if (updateData.system.ability === 'essence') {
              updateData.system.ability = 'evocation';
            }
          }
          if (!foundry.utils.isEmpty(updateData)) {
            await item.update(updateData, { enforceTypes: false });
          }
        }
      } catch (error) {
        error.message = `Failed migration for Item ${item.name}: ${error.message} `;
        console.error(error);
      }
    }
    for (let actor of game.actors.filter((actor) => actor.type === 'npc')) {
      try {
        let updateData = foundry.utils.duplicate(actor);
        const doNotUpdate = ['command', 'grapple', 'joinbattle', 'movement', 'readintentions', 'social', 'sorcery', 'resistance'];
        for (let [key, pool] of Object.entries(updateData.system.pools)) {
          if (!doNotUpdate.includes(key)) {
            if (pool.value) {
              const itemData = {
                name: game.i18n.localize(pool.name),
                type: 'action',
                system: {
                  'value': pool.value,
                  'oldKey': key,
                }
              };
              actor.createEmbeddedDocuments("Item", [itemData]);
            }
            await actor.update({
              [`system.pools.-=${key}`]: null,
            });
          }
        }
      } catch (error) {
        error.message = `Failed migration for Actor ${actor.name}: ${error.message} `;
        console.error(error);
      }
    }
  }

  if (foundry.utils.isNewerVersion("1.9.5", game.settings.get("exaltedthird", "systemMigrationVersion"))) {
    const chatData = {
      style: CONST.CHAT_MESSAGE_STYLES.OTHER,
      content: '<div><b>Commands</b></div><div><b>/info</b> Display possible commands</div><div><b>/newscene</b> End any scene duration charms</div><div><b>/xp #</b> Give xp to player characters</div><div><b>/exaltxp #</b> Give exalt xp to player characters</div><b>/npc</b> NPC creator</div>',
    };
    ChatMessage.create(chatData);
    for (let actor of game.actors.filter((actor) => actor.type === 'npc')) {
      try {
        let updateData = foundry.utils.duplicate(actor);
        if (updateData.system.creaturetype !== 'exalt') {
          updateData.system.details.creaturesubtype = updateData.system.details.exalt;
          updateData.system.details.exalt = 'other';
          await actor.update(updateData, { enforceTypes: false });
        }
      } catch (error) {
        error.message = `Failed migration for Actor ${actor.name}: ${error.message} `;
        console.error(error);
      }
    }
  }

  if (foundry.utils.isNewerVersion("1.10.0", game.settings.get("exaltedthird", "systemMigrationVersion"))) {
    for (let actor of game.actors.filter((actor) => actor.type === 'npc')) {
      try {
        let updateData = foundry.utils.duplicate(actor);
        if (updateData.system.creaturetype !== 'exalt') {
          updateData.system.details.creaturesubtype = updateData.system.details.exalt;
          updateData.system.details.exalt = 'other';
          await actor.update(updateData, { enforceTypes: false });
        }
      } catch (error) {
        error.message = `Failed migration for Actor ${actor.name}: ${error.message} `;
        console.error(error);
      }
    }
  }

  if (foundry.utils.isNewerVersion("1.11.0", game.settings.get("exaltedthird", "systemMigrationVersion"))) {
    const martialArtData = {
      system: {
        abilitytype: 'martialart'
      }
    }
    const craftData = {
      system: {
        abilitytype: 'craft'
      }
    }
    for (let item of game.items.filter((item) => item.type === 'martialart')) {
      await item.update({
        [`type`]: 'customability',
      });
      await item.update(martialArtData);
    }
    for (let item of game.items.filter((item) => item.type === 'craft')) {
      await item.update({
        [`type`]: 'customability',
      });
      await item.update(craftData);
    }
    for (let item of game.items.filter((item) => item.type === 'initiation')) {
      await item.update({
        [`type`]: 'ritual',
      });
    }
    for (let actor of game.actors) {
      try {
        for (let item of actor.items.filter((item) => item.type === 'martialart')) {
          await item.update({
            [`type`]: 'customability',
          });
          await item.update(martialArtData);
        }
        for (let item of actor.items.filter((item) => item.type === 'craft')) {
          await item.update({
            [`type`]: 'customability',
          });
          await item.update(craftData);
        }
        for (let item of actor.items.filter((item) => item.type === 'initiation')) {
          await item.update({
            [`type`]: 'ritual',
          });
        }
        let updateData = foundry.utils.duplicate(actor);
        if (updateData.system.details.exalt !== 'other' && updateData.system.details.exalt !== 'exigent') {
          updateData.system.details.caste = updateData.system.details.caste.toLowerCase().replace(/\s+/g, "");
          await actor.update(updateData, { enforceTypes: false });
        }
      } catch (error) {
        error.message = `Failed migration for Actor ${actor.name}: ${error.message} `;
        console.error(error);
      }
    }
    for (let pack of game.packs) {
      const type = pack.metadata.type;
      if (['Actor', 'Item'].includes(type)) {
        // Unlock the pack for editing
        const wasLocked = pack.locked;
        await pack.configure({ locked: false });
        // Begin by requesting server-side data model migration and get the migrated content
        await pack.migrate();
        const documents = await pack.getDocuments();
        // Iterate over compendium entries - applying fine-tuned migration functions
        for (const doc of documents) {
          let updateData = {};
          try {
            switch (type) {
              case 'Actor':
                for (let item of actor.items.filter((item) => item.type === 'martialart')) {
                  await item.update({
                    [`type`]: 'customability',
                  });
                  await item.update(martialArtData);
                }
                for (let item of actor.items.filter((item) => item.type === 'craft')) {
                  await item.update({
                    [`type`]: 'customability',
                  });
                  await item.update(craftData);
                }
                for (let item of doc.items.filter((item) => item.type === 'initiation')) {
                  await item.update({
                    [`type`]: 'ritual',
                  });
                }
                break;
              case 'Item':
                if (doc.type === 'initiation') {
                  await doc.update({
                    [`type`]: 'ritual',
                  });
                }
                if (doc.type === 'martialart' || doc.type === 'craft') {
                  await doc.update({
                    [`type`]: 'customability',
                  });
                }
                break;
            }
            if (foundry.utils.isEmpty(updateData))
              continue;
          }
          catch (err) {
            // Handle migration failures
            err.message = `Failed ex3 system migration for document ${doc.name} in pack ${pack.collection}: ${err.message}`;
          }
        }
        // Apply the original locked status for the pack
        await pack.configure({ locked: wasLocked });
      }
    }
  }

  if (foundry.utils.isNewerVersion("2.0.3", game.settings.get("exaltedthird", "systemMigrationVersion"))) {
    ui.notifications.notify(`Migrating data to 2.0.3, please wait`);
    for (let actor of game.actors) {
      try {
        if (actor.system.details.exalt === 'dragonblooded') {
          await actor.update({ [`system.settings.hasaura`]: true });
        }
        else {
          await actor.update({ [`system.settings.hasaura`]: false });
        }
      } catch (error) {
        error.message = `Failed migration for Actor ${actor.name}: ${error.message} `;
        console.error(error);
      }
    }
    ui.notifications.notify(`Migration Complete`);
  }

  if (foundry.utils.isNewerVersion("2.4.0", game.settings.get("exaltedthird", "systemMigrationVersion"))) {
    ui.notifications.notify(`Migrating data to 2.4.0, please wait`);
    for (let actor of game.actors) {
      try {
        if (actor.system.details.exalt === 'abyssal') {
          await actor.update({ [`system.details.apocalyptic`]: actor.system.details.cthonic });
        }
      } catch (error) {
        error.message = `Failed migration for Actor ${actor.name}: ${error.message} `;
        console.error(error);
      }
    }
    ui.notifications.notify(`Migration Complete`);
  }
  if (foundry.utils.isNewerVersion("2.5.2", game.settings.get("exaltedthird", "systemMigrationVersion"))) {
    ui.notifications.notify(`Migrating data to 2.5.2, please wait`);
    for (let actor of game.actors) {
      try {
        if (actor.system.legendarysize) {
          await actor.update({ [`system.sizecategory`]: 'legendary' });
        }
      } catch (error) {
        error.message = `Failed migration for Actor ${actor.name}: ${error.message} `;
        console.error(error);
      }
    }
    ui.notifications.notify(`Migration Complete`);
  }

  if (foundry.utils.isNewerVersion("2.7.0", game.settings.get("exaltedthird", "systemMigrationVersion"))) {
    ui.notifications.notify(`Migrating data to 2.7.0, please wait`);
    for (let actor of game.actors.filter(actor => actor.type === "character")) {
      try {
        await actor.update({ [`system.experience.standard.value`]: actor.system.experience.standard.total - actor.system.experience.standard.value });
        await actor.update({ [`system.experience.exalt.value`]: actor.system.experience.exalt.total - actor.system.experience.exalt.value });
      } catch (error) {
        error.message = `Failed migration for Actor ${actor.name}: ${error.message} `;
        console.error(error);
      }
    }
    ui.notifications.notify(`Migration Complete`);
  }

  if (foundry.utils.isNewerVersion("2.7.4", game.settings.get("exaltedthird", "systemMigrationVersion"))) {
    ui.notifications.notify(`Migrating data to 2.7.4, please wait`);
    for (let actor of game.actors) {
      try {
        if (actor.system.sorcery.motes.value === undefined) {
          await actor.update({
            [`system.sorcery.motes`]: {
              value: actor.system.sorcery.motes,
              max: 0,
            }
          });
        }
      } catch (error) {
        error.message = `Failed migration for Actor ${actor.name}: ${error.message} `;
        console.error(error);
      }
    }

    for (let item of game.items.filter(item => item.type === 'spell')) {
      try {
        await item.update({
          [`system.cost`]: parseInt(item.system.cost)
        });
      } catch (error) {
        error.message = `Failed migration for Item ${item.name}: ${error.message} `;
        console.error(error);
      }
    }
    ui.notifications.notify(`Migration Complete`);
  }

  if (foundry.utils.isNewerVersion("2.7.5", game.settings.get("exaltedthird", "systemMigrationVersion"))) {
    ui.notifications.notify(`Migrating data to 2.7.5, please wait`);
    for (let actor of game.actors) {
      try {
        for (let item of actor.items.filter(item => item.type === 'spell')) {
          try {
            await item.update({
              [`system.cost`]: parseInt(item.system.cost)
            });
          } catch (error) {
            error.message = `Failed migration for Item ${item.name}: ${error.message} `;
            console.error(error);
          }
        }
      } catch (error) {
        error.message = `Failed migration for Actor ${actor.name}: ${error.message} `;
        console.error(error);
      }
    }

    await game.settings.set("exaltedthird", "systemMigrationVersion", game.system.version);
    ui.notifications.notify(`Migration Complete`);
  }

  // for (let item of game.items.filter(item => item.type === 'charm')) {
  //   await item.update({
  //     [`system.diceroller.enabled`]: true
  //   });
  // }

  // for (let actor of game.actors) {
  //   try {
  //     for (let item of actor.items.filter(item => item.type === 'spell')) {
  //       try {
  //         await item.update({
  //           [`system.cost`]: parseInt(item.system.cost)
  //         });
  //       } catch (error) {
  //         error.message = `Failed migration for Item ${item.name}: ${error.message} `;
  //         console.error(error);
  //       }
  //     }
  //   } catch (error) {
  //     error.message = `Failed migration for Actor ${actor.name}: ${error.message} `;
  //     console.error(error);
  //   }
  // }

  // if (foundry.utils.isNewerVersion("2.8.0", game.settings.get("exaltedthird", "systemMigrationVersion"))) {
  //   ui.notifications.notify(`Migrating data to 2.8.0, please wait`);
  //   for (let item of game.items.filter(item => item.type === 'charm')) {
  //     try {
  //       if(item.system.cost.commitmotes > 0) {
  //         await item.update({
  //           [`system.activatable`]: true
  //         });
  //       }
  //     } catch (error) {
  //       error.message = `Failed migration for Item ${item.name}: ${error.message} `;
  //       console.error(error);
  //     }
  //   }
  //   for (let actor of game.actors) {
  //     try {
  //       for (let item of actor.items.filter(item => item.type === 'charm')) {
  //         try {
  //           if(item.system.cost.commitmotes > 0) {
  //             await item.update({
  //               [`system.activatable`]: true
  //             });
  //           }
  //         } catch (error) {
  //           error.message = `Failed migration for Item ${item.name}: ${error.message} `;
  //           console.error(error);
  //         }
  //       }
  //     } catch (error) {
  //       error.message = `Failed migration for Actor ${actor.name}: ${error.message} `;
  //       console.error(error);
  //     }
  //   }

  //   ui.notifications.notify(`Migration Complete`);
  //   await game.settings.set("exaltedthird", "systemMigrationVersion", game.system.version);
  // }

  // for(const item of game.items.filter(item => item.type === 'charm' && item.folder?.name && item.system.charmtype === 'martialarts')) {
  //   const martialArt = game.items.filter(ma => ma.type === 'customability' && ma.name === item.folder?.name)[0];
  //   if(martialArt) {
  //     item.update({[`system.parentitemid`]: martialArt.id});
  //   }
  // }

  // for(const item of game.items.filter(item => item.type === 'ritual' || (item.type === 'merit' && item.system.merittype === 'sorcery'))) {
  //   if(item.folder?.name && !item.system.archetypename) {
  //     await item.update({ [`system.archetypename`]: item.folder.name });
  //   }
  // }

  // for(const martialArt of CONFIG.exaltedthird.martialarts) {
  //   console.log(martialArt);
  //   let folder = game.folders.filter(folder => folder.name === 'Martial Arts')[0];
  //   if(!folder) {
  //     folder = await Folder.create({ name: 'Martial Arts', type: 'Item' });
  //   }
  //   await Item.create({
  //     name: martialArt,
  //     img: 'systems/exaltedthird/assets/icons/punch-blast.svg',
  //     type: 'customability',
  //     folder: folder,
  //     system:{
  //       abilitytype: 'martialart'
  //     }
  //   });
  // }
  // var cost = 5;
  // var bonus = 0;
  // while(cost < 45) {
  //   bonus++
  //   cost *= 1.25
  // }
  // console.log(cost)
  // console.log(bonus)

  // const charms = game.items.filter(item => item.type === 'charm');
  // for (const charm of charms.filter(charm => charm.system.prerequisites && charm.system.prerequisites !== 'None')) {
  // console.log(`${charm.name} - ${charm.system.prerequisites}`);
  // const foundCharms = charms.filter(findCharm => findCharm.system.description.includes(charm.system.prerequisites.trim()) === true);
  // if(foundCharms.length === 1) {
  //   console.log(`${charm.name} - ${charm.system.prerequisites}`);
  //   const charmPrereqs = [
  //     {
  //       name: charm.system.prerequisites,
  //       id: foundCharms[0].id
  //     }
  //   ]
  //   charm.update({ [`system.prerequisites`]: '' });
  //   charm.update({ [`system.charmprerequisites`]: charmPrereqs });
  // }
  // }

  // const charmTest = game.items.find(item => item.name === 'Immanent Solar Glory');
  // charmTest.update({
  //   [`system.charmprerequisites`]: [{
  //     name: 'Surging Essence Flow',
  //     id: 'Sz3iAvz0325bInWw'
  //   }, {
  //     name: 'Fire-Eating Fist',
  //     id: 'Essence-Twining Method'
  //   }]
  // });

  // for (let actor of game.actors) {
  //   try {
  //     await actor.update({ [`system.settings.editmode`]: false });
  //   } catch (error) {
  //     error.message = `Failed migration for Actor ${actor.name}: ${error.message} `;
  //     console.error(error);
  //   }
  // }


  // for (let item of game.items.filter((item) => item.type === 'charm' && item.system.prerequisites && item.system.prerequisites !== 'None')) {
  //   let updateData = foundry.utils.deepClone(item.toObject());

  //   if (!foundry.utils.isEmpty(updateData)) {
  //     const splitPrereqs = item.system.prerequisites.split(',');
  //     const newPrereqs = [];
  //     for(const prereq of splitPrereqs) {
  //       const existingCharm = game.items.filter(item => item.type === 'charm' && item.system.charmtype === updateData.system.charmtype && item.name.trim() === prereq.trim())[0];
  //       if(existingCharm) {
  //         updateData.system.charmprerequisites.push(
  //           {
  //             id: existingCharm.id,
  //             name: existingCharm.name
  //           }
  //         );
  //       }
  //       else {
  //         newPrereqs.push(prereq);
  //       }
  //     }
  //     if(updateData.system.charmprerequisites) {
  //       updateData.system.prerequisites = newPrereqs.join(", ");
  //       await item.update(updateData, { enforceTypes: false });
  //     }
  //   }
  // }
  // for(let item of game.items.filter((item) => item.system.duration.trim() === 'One scene')) {
  //   let updateData = foundry.utils.deepClone(item.toObject());
  //   updateData.system.endtrigger = 'endscene';
  //   if (!foundry.utils.isEmpty(updateData)) {
  //     await item.update(updateData, { enforceTypes: false });
  //   }
  //   console.log(item.name);
  // }

  // for(let item of game.items.filter((item) => item.system.duration.trim() === 'One turn' || item.system.duration.trim() === 'Until next turn')) {
  //   let updateData = foundry.utils.deepClone(item.toObject());
  //   updateData.system.endtrigger = 'startturn';
  //   if (!foundry.utils.isEmpty(updateData)) {
  //     await item.update(updateData, { enforceTypes: false });
  //   }
  //   console.log(item.name);
  // }

  // for (let item of game.items) {
  //   try {
  //     let updateData = foundry.utils.deepClone(item.toObject());
  //     if (updateData.type === 'charm') {
  //       var image = 'icons/svg/explosion.svg';
  //       var imageMap = {};
  //       switch (updateData.system.ability) {
  //         case 'archery':
  //           image = 'icons/skills/ranged/arrow-flying-white-blue.webp';
  //           break;
  //         case 'athletics':
  //           imageMap = { 
  //             'Attack': 'icons/skills/melee/strike-flail-destructive-yellow.webp',
  //             'Might': 'icons/magic/control/buff-strength-muscle-damage-orange.webp',
  //             'Mobility': 'icons/skills/movement/feet-winged-boots-glowing-yellow.webp',
  //             'Special': 'icons/magic/light/explosion-beam-impact-silhouette.webp',
  //             'Speed': 'modules/ex3-golden-calibration/icons/speed.webp',
  //           };
  //           break;
  //         case 'awareness':
  //           image = 'icons/magic/control/hypnosis-mesmerism-eye-tan.webp'
  //           imageMap = { 
  //             'Special': 'modules/ex3-golden-calibration/icons/awareness-special.webp',
  //           };
  //           break;
  //         case 'brawl':
  //           image = 'modules/ex3-golden-calibration/icons/brawl.webp'
  //           imageMap = { 
  //             'Grappling': 'icons/skills/melee/strike-chain-whip-blue.webp',
  //           };
  //           break;
  //         case 'bureaucracy':
  //           image = 'icons/skills/trades/academics-merchant-scribe.webp'
  //           break;
  //         case 'craft':
  //           image = 'icons/skills/trades/smithing-anvil-silver-red.webp'
  //           break;
  //         case 'dodge':
  //           image = 'modules/ex3-golden-calibration/icons/dodge.webp'
  //           break;
  //         case 'integrity':
  //           image = 'modules/ex3-golden-calibration/icons/integrity.webp'
  //           break;
  //         case 'investigation':
  //           image = 'icons/skills/trades/academics-investigation-study-blue.webp'
  //           break;
  //         case 'larceny':
  //           image = 'icons/skills/trades/security-locksmith-key-gray.webp'
  //           break;
  //         case 'linguistics':
  //           image = 'icons/skills/trades/academics-scribe-quill-gray.webp'
  //           break;
  //         case 'lore':
  //           image = 'modules/ex3-golden-calibration/icons/lore.webp'
  //           break;
  //         case 'medicine':
  //           image = 'icons/tools/cooking/mortar-stone-yellow.webp'
  //           imageMap = {
  //             'Poison': 'icons/skills/toxins/poison-bottle-corked-fire-green.webp'
  //           };
  //           break;
  //         case 'melee':
  //           image = 'icons/skills/melee/weapons-crossed-swords-yellow.webp'
  //           imageMap = { 
  //             'Defense': 'modules/ex3-golden-calibration/icons/melee-defense.webp',
  //             'Weaponry': 'modules/ex3-golden-calibration/icons/melee-weaponry.webp',
  //           };
  //           break;
  //         case 'occult':
  //           image = 'icons/magic/symbols/runes-star-pentagon-orange.webp'
  //           break;
  //         case 'performance':
  //           image = 'icons/skills/trades/music-notes-sound-blue.webp';
  //           break;
  //         case 'presence':
  //           image = 'modules/ex3-golden-calibration/icons/presence.webp'
  //           imageMap = {
  //             'Seduction': 'icons/magic/life/heart-glowing-red.webp',
  //             'Fear': 'icons/magic/control/silhouette-aura-energy.webp'
  //           };
  //           break;
  //         case 'resistance':
  //           image = 'icons/magic/defensive/shield-barrier-deflect-gold.webp'
  //           imageMap = {
  //             'Armor': 'modules/ex3-golden-calibration/icons/resistance-armor.webp',
  //             'Defense': 'modules/ex3-golden-calibration/icons/resistance-defense.webp',
  //             'Fury': 'modules/ex3-golden-calibration/icons/resistance-fury.webp',
  //             'Vitality': 'modules/ex3-golden-calibration/icons/resistance-vitality.webp',
  //             'Wellness': 'modules/ex3-golden-calibration/icons/resistance-wellness.webp',
  //           };
  //           break;
  //         case 'ride':
  //           image = 'icons/environment/creatures/horse-brown.webp'
  //           break;
  //         case 'sail':
  //           image = 'icons/skills/trades/profession-sailing-ship.webp';
  //           imageMap = {
  //             'Navigation': 'icons/tools/navigation/map-marked-blue.webp',
  //             'Piloting': 'modules/ex3-golden-calibration/icons/sail-pilot.webp',
  //             'Sailor': 'modules/ex3-golden-calibration/icons/sailor.webp',
  //           };
  //           break;
  //         case 'socialize':
  //           image = 'icons/skills/social/diplomacy-handshake-yellow.webp'
  //           break;
  //         case 'stealth':
  //           image = 'icons/magic/perception/shadow-stealth-eyes-purple.webp'
  //           break;
  //         case 'survival':
  //           image = 'icons/magic/nature/wolf-paw-glow-large-green.webp';
  //           imageMap = {
  //             'Husbandry': 'modules/ex3-golden-calibration/icons/husbandry.webp',
  //             'Wilderness': 'icons/magic/nature/plant-bamboo-green.webp',
  //           };
  //           break;
  //         case 'thrown':
  //           image = 'icons/skills/ranged/daggers-thrown-salvo-orange.webp'
  //           break;
  //         case 'war':
  //           image = 'icons/environment/people/charge.webp'
  //           break;
  //         case 'universal':
  //           image = 'icons/magic/light/explosion-star-large-orange.webp';
  //           break;
  //       }
  //       if(updateData.name === 'Blazing Solar Bolt') {
  //         image =  'modules/ex3-golden-calibration/icons/solar-bolt.webp';
  //       }
  //       if(imageMap[item.folder.name]) {
  //         image = imageMap[item.folder.name];
  //       }
  //       var listingName = updateData.system.ability.charAt(0).toUpperCase() + updateData.system.ability.slice(1);
  //       if(item.folder.name !== listingName) {
  //         listingName += ` (${item.folder.name})`;
  //       }
  //       updateData.img = image;
  //       updateData.system.listingname = listingName;
  //       if (!foundry.utils.isEmpty(updateData)) {
  //         await item.update(updateData, { enforceTypes: false });
  //       }
  //     }
  //   } catch (error) {
  //     error.message = `Failed migration for Item ${item.name}: ${error.message} `;
  //     console.error(error);
  //   }
  // }

  $("#chat-log").on("click", " .item-row", ev => {
    const li = $(ev.currentTarget).next();
    li.toggle("fast");
  });

});


async function createItemMacro(data, slot) {
  if (data.type !== "Item" && data.type !== "savedRoll") return;
  if (data.type === "Item") {
    if (!data.uuid.includes('Actor.') && !data.uuid.includes('Token.')) {
      return ui.notifications.warn("You can only create macro buttons for owned Items");
    }
    const item = await Item.fromDropData(data);
    let command = `Hotbar.toggleDocumentSheet("${data.uuid}");`;
    if (item.type === 'weapon') {
      command = `//Switch withering with (decisive, gambit, withering-split, decisive-split, gambit-split) to roll different attack types\ngame.exaltedthird.weaponAttack("${data.uuid}", 'withering');`;
    }
    if (item.type === 'charm') {
      command = `//Will add this charm to any roll you have open and if opposed any roll another player has open\n//If the charm user has no dice roller open it will instead Spend or activate the charm\ngame.exaltedthird.triggerItem("${data.uuid}");`;
    }
    let macro = game.macros.find(m => (m.name === item.name) && (m.command === command));
    if (!macro) {
      if (item.type === 'weapon' || item.type === 'charm') {
        macro = await Macro.create({
          name: item.name,
          type: "script",
          img: item.img,
          command: command,
          flags: { "exaltedthird.itemMacro": true }
        });
      }
      else {
        const name = item.name || `Default`;
        macro = await Macro.create({
          name: `${game.i18n.localize("Display")} ${name}`,
          type: "script",
          img: item.img,
          command: command
        });
      }
      game.user.assignHotbarMacro(macro, slot);
    }
  }
  else {
    const command = `const formActor = await fromUuid("${data.actorId}");
        game.rollForm = new game.exaltedthird.RollForm2(${data.actorId.includes('Token') ? 'formActor.actor' : 'formActor'}, {classes: [" exaltedthird exaltedthird-dialog", "${game.settings.get("exaltedthird", "sheetStyle")}-background"]}, {}, { rollId: "${data.id}" }).render(true); `;
    const macro = await Macro.create({
      name: data.name,
      img: 'systems/exaltedthird/assets/icons/d10.svg',
      type: "script",
      command: command,
    });
    game.user.assignHotbarMacro(macro, slot);
  }
  return false;
}

function applyDecisiveDamage(message) {
  let targetedTokens = Array.from(game.user.targets);
  // If there are not any controlled tokens, issue a warning.
  if (!targetedTokens?.length || !game.settings.get("exaltedthird", "rollButtonTarget")) {
    const targetToken = game.canvas.tokens.get(message?.flags?.exaltedthird?.targetId);
    if (targetToken) {
      targetedTokens = [targetToken];
    }
    else {
      return ui.notifications.warn('Ex3.NoValidTargets', {
        localize: true,
      });
    }
  }
  // Get the damage and ap from the roll data
  const damageContext = {
    value: message?.flags?.exaltedthird?.damage?.total || 0,
    type: message?.flags?.exaltedthird?.damage?.type || 'lethal',
    attackerTokenId: message?.flags?.exaltedthird?.attackerTokenId,
  };
  // For each token controlled...
  for (const token of targetedTokens) {
    // Get the actor from the token data.
    const actor = token.actor;
    // Trigger calculation of Wounds
    applyDamageDialogue(actor.uuid, damageContext);
  }
}

function applyWitheringDamage(message) {
  let targetedTokens = Array.from(game.user.targets);
  // If there are not any controlled tokens, issue a warning.
  if (!targetedTokens?.length || !game.settings.get("exaltedthird", "rollButtonTarget")) {
    const targetToken = game.canvas.tokens.get(message?.flags?.exaltedthird?.targetId);
    if (targetToken) {
      targetedTokens = [targetToken];
    }
    else {
      return ui.notifications.warn('Ex3.NoValidTargets', {
        localize: true,
      });
    }
  }
  if (!game?.combat) {
    return ui.notifications.warn('Ex3.NoCurrentCombat', {
      localize: true,
    });
  }
  // For each token controlled...
  for (const token of targetedTokens) {
    // Get the actor from the token data.
    const actor = token.actor;

    const combatant = game.combat?.combatants?.find(c => c.tokenId === token.id) || null;
    if (!combatant) {
      ui.notifications.warn('Ex3.NoCombatant', {
        localize: true,
      });
    }
    else if (combatant.initiative === null) {
      ui.notifications.warn('Ex3.CombatantHasNoInitiative', {
        localize: true,
      });
    }
    if (combatant && combatant.initiative !== null) {
      var initiativeDamage = message?.flags?.exaltedthird?.damage?.total;
      if (actor.type !== 'npc' || actor.system.battlegroup === false) {
        if (game.settings.get("exaltedthird", "useShieldInitiative") && actor.system.newShieldInitiative.value > 0) {
          var newShieldInitiative = Math.max(0, actor.system.newShieldInitiative.value - message?.flags?.exaltedthird?.damage?.total);
          initiativeDamage = Math.max(0, message?.flags?.exaltedthird?.damage?.total - actor.system.newShieldInitiative.value);
          this.actor.update({ [`system.newShieldInitiative.value`]: newShieldInitiative });
        }
        game.combat.setInitiative(combatant.id, combatant.initiative - initiativeDamage, message?.flags?.exaltedthird?.attackerCombatantId);
      }
    }
    if (actor.system?.battlegroup) {
      dealHealthDamage(actor, message?.flags?.exaltedthird?.damage?.total, message?.flags?.exaltedthird?.damage?.type || 'lethal');
    }
  }
}

function gainAttackInitiative(message) {
  let targetedTokens = Array.from(game.user.targets);
  // If there are not any controlled tokens, issue a warning.
  if (!targetedTokens?.length || !game.settings.get("exaltedthird", "rollButtonTarget")) {
    const targetToken = game.canvas.tokens.get(message?.flags?.exaltedthird?.attackerTokenId);
    if (targetToken) {
      targetedTokens = [targetToken];
    }
    else {
      return ui.notifications.warn('Ex3.NoValidTargets', {
        localize: true,
      });
    }
  }
  if (!game?.combat) {
    return ui.notifications.warn('Ex3.NoCurrentCombat', {
      localize: true,
    });
  }
  // For each token controlled...
  for (const token of targetedTokens) {
    const combatant = game.combat?.combatants?.find(c => c.tokenId === token.id) || null;
    if (!combatant) {
      ui.notifications.warn('Ex3.NoCombatant', {
        localize: true,
      });
    }
    else if (combatant.initiative === null) {
      ui.notifications.warn('Ex3.CombatantHasNoInitiative', {
        localize: true,
      });
    }
    if (combatant && combatant.initiative !== null) {
      game.combat.setInitiative(combatant.id, combatant.initiative + message?.flags?.exaltedthird?.damage?.gainedInitiative);
    }
  }
}

async function applyDamageDialogue(targetUuid, damageContext) {
  const target = (await fromUuid(targetUuid));
  // If the target document is a Token, change the actor value to target.actor, otherwise use the target document itself.
  const actor = target?.documentName === 'Token' ? target?.actor : target;

  const template = "systems/exaltedthird/templates/dialogues/damage-dialogue.html"
  const html = await renderTemplate(template, { 'damageContext': damageContext, damageTypes: CONFIG.exaltedthird.selects.damageTypes });
  new foundry.applications.api.DialogV2({
    window: { title: `Apply Damage to ${actor.name}` },
    content: html,
    classes: [`${game.settings.get("exaltedthird", "sheetStyle")}-background`],
    buttons: [{
      action: "choice",
      label: game.i18n.localize("Ex3.Save"),
      default: true,
      callback: (event, button, dialog) => button.form.elements
    }, {
      action: "cancel",
      label: game.i18n.localize("Ex3.Cancel"),
      callback: (event, button, dialog) => false
    }],
    submit: result => {
      if (result) {
        dealHealthDamage(actor, Number(result.damageValue.value), result.damageType.value);
      }
    }
  }).render({ force: true });
}

async function dealHealthDamage(actor, damageValue, damageType) {
  const actorData = foundry.utils.duplicate(actor);
  let totalHealth = 0;
  let sizeDamaged = 0;

  if (actor.system.battlegroup) {
    totalHealth = actorData.system.health.levels.zero.value + actorData.system.size.value;
  }
  else {
    for (let [key, healthLevel] of Object.entries(actorData.system.health.levels)) {
      totalHealth += healthLevel.value;
    }
  }
  if (actor.system.battlegroup) {
    var remainingHealth = totalHealth - actorData.system.health.bashing - actorData.system.health.lethal - actorData.system.health.aggravated;
    while (remainingHealth <= damageValue && actorData.system.size.value > 0) {
      actorData.system.health.bashing = 0;
      actorData.system.health.lethal = 0;
      actorData.system.health.aggravated = 0;
      damageValue -= remainingHealth;
      remainingHealth = totalHealth - actorData.system.health.bashing - actorData.system.health.lethal - actorData.system.health.aggravated;
      actorData.system.size.value -= 1;
      sizeDamaged++;
    }
  }
  if (damageType === 'bashing') {
    actorData.system.health.bashing = Math.min(totalHealth - actorData.system.health.aggravated - actorData.system.health.lethal, actorData.system.health.bashing + damageValue);
  }
  if (damageType === 'lethal') {
    actorData.system.health.lethal = Math.min(totalHealth - actorData.system.health.bashing - actorData.system.health.aggravated, actorData.system.health.lethal + damageValue);
  }
  if (damageType === 'aggravated') {
    actorData.system.health.aggravated = Math.min(totalHealth - actorData.system.health.bashing - actorData.system.health.lethal, actorData.system.health.aggravated + damageValue);
  }
  actor.update(actorData);
}

function weaponAttack(itemUuid, attackType = 'withering') {
  // Reconstruct the drop data so that we can load the item.
  const dropData = {
    type: 'Item',
    uuid: itemUuid
  };
  // Load the item from the uuid.
  Item.fromDropData(dropData).then(item => {
    // Determine if the item loaded and if it's an owned item.
    if (!item || !item.parent) {
      const itemName = item?.name ?? itemUuid;
      return ui.notifications.warn(`Could not find item ${itemName}. You may need to delete and recreate this macro.`);
    }
    game.rollForm = new RollForm2(item.parent, { classes: [" exaltedthird exaltedthird-dialog dice-roller", `${game.settings.get("exaltedthird", "sheetStyle")}-background`] }, {}, { rollType: attackType, weapon: item.system }).render(true);
  });
}

function triggerItem(itemUuid) {
  // Reconstruct the drop data so that we can load the item.
  const dropData = {
    type: 'Item',
    uuid: itemUuid
  };
  // Load the item from the uuid.
  Item.fromDropData(dropData).then(item => {
    // Determine if the item loaded and if it's an owned item.
    if (!item || !item.parent) {
      const itemName = item?.name ?? itemUuid;
      return ui.notifications.warn(`Could not find item ${itemName}. You may need to delete and recreate this macro.`);
    }
    if (game.rollForm) {
      game.rollForm.addCharm(item);
    }
    else if (item.system.diceroller.opposedbonuses.enabled) {
      game.socket.emit('system.exaltedthird', {
        type: 'addOpposingCharm',
        data: item,
        actorId: item.actor._id,
      });
      if (item.system.cost.commitmotes > 0 && !item.system.active) {
        spendEmbeddedItem(item.parent, item);
      }
    }
    else {
      spendEmbeddedItem(item.parent, item);
    }
  });
}

/**
 * 
 * @param {ExaltedThirdActor} actor 
 * @param {object} object 
 * @param {object} data 
 * @returns {Promise}
 */
function roll(actor, object, data) {
  return new RollForm2(actor, {}, {}, data).roll();
}