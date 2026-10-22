import { useState } from "react";
import { Dialog, type DialogBounds } from "../../ui/Dialog.tsx";

interface HelpSection { heading?: string; content: string; warning?: string }
const topics: ReadonlyArray<readonly [string, readonly HelpSection[]]> = [
  ["The Basics", [{ heading: "Keyboard", content: "Explore the dungeon, collect loot, and grow stronger. Move with WASD or the arrow keys. Walk into enemies and containers to interact. Your actions advance time and let enemies act." }, { heading: "Mouse", content: "Left-click to walk or attack. Right-click to run or attack." }]],
  ["Movement", [{ heading: "Keyboard", content: "Hold a movement key to keep moving. Hold Shift with keyboard movement to run. Battle uses grid steps when threats are nearby. Walls and blocked corners stop you. Press X or use Wait to pass a turn." }, { heading: "Mouse", content: "Hold a mouse button to keep moving." }, { heading: "Gamepad", content: "Press a button to connect your controller. Move with the left stick or D-pad. Any gamepad button switches to gamepad mode and hides the reticle. Move the right stick to aim at one of the eight tiles around your character. Moving the mouse restores free targeting until another gamepad button press. Left trigger walks or interacts at the reticle; right trigger runs or interacts. Each trigger hides the reticle after clicking. In Battle, release before each step." }]],
  ["Combat", [{ heading: "Keyboard", content: "Move toward an adjacent enemy to attack with your equipped weapons. Attacks cost Stamina; low Stamina weakens combat. Watch Health, and use potions or Heal before it reaches zero. Death starts a new run on level one." }, { heading: "Mouse", content: "Left-click an enemy to walk up and attack. Right-click to run or attack." }]],
  ["Exploration", [{ content: "Step onto stairs to change dungeon levels; return stairs let you revisit earlier levels. Bump chests to open them and crates to break them. Push barrels onto floor switches to open doors. Watch trap timing, and use teleport arrows to travel to and from home." }]],
  ["Quests", [{ content: "The Quest panel checks off objectives as you complete them. Follow the active step to learn about stairs, collecting a Health Potion, and collecting a coin." }]],
  ["Items", [{ content: "Walk over loot to collect it. Gold and keys use separate counters. Drag gear from Inventory to a matching Equipment slot; replaced gear returns to Inventory if it fits. Drag equipped gear back to an empty inventory slot to remove it. Some gear occupies two slots." }]],
  ["Inventory", [{ content: "The Inventory heading shows used slots and capacity. You have 5 base slots. Each Extra Carrying Capacity +5 item grants five usable spaces while occupying one slot itself. Matching consumables stack. Equipped gear and quick-slot items leave inventory space free. Loot that will not fit stays on the ground." }]],
  ["Dropping Items", [{ content: "Drag an item from Inventory, Equipment, Quick Slots, or Abilities onto [ Drop Item ] to place it nearby. Dropping a stack drops the whole stack. You can collect dropped items again.\n\nDropping Extra Carrying Capacity +5 lowers capacity and can also spill random inventory items until the rest fit." }]],
  ["Abilities and Quick Slots", [{ heading: "Keyboard", content: "Drag ability items into empty Abilities slots, then press 1, 2, or 3 to cast. Spells need Mana; ranged attacks need a target in a clear row or column. Drag potions or Throwing Knives into Quick Slots, then press Q or E to use one item. Matching pickups refill their stack." }, { heading: "Mouse", content: "Click an ability to cast it. Click a Quick Slot to use its item." }]],
  ["Leveling Up", [{ content: "Combat, discoveries, containers, and first visits to dungeon levels grant experience. Each level gives 3 attribute points. Open Progression from Attributes to spend them. Your level and attributes persist after death; spending points also develops the world." }]],
  ["Saving Your Game", [{ content: "The game autosaves your progress in the selected save slot. Open Settings for audio, How To Play, or returning to the main menu. Title-bar controls adjust fullscreen, camera mode, and zoom." }]],
  ["Tips", [{ content: "Walking restores Stamina. Interact with a campfire and confirm Rest to replenish Health, Stamina, and Mana for 20 gold. Sneak reduces enemy awareness." }, { heading: "Mobile", content: "On mobile, switch between Control and Info to reach movement controls or manage your items.", warning: "Mobile currently disabled." }]],
];

export function HowToPlayWindow({ onClose, origin, bounds }: { onClose(): void; origin: "menu" | "game"; bounds?: DialogBounds | null }) {
  const [selectedTopic, setSelectedTopic] = useState(0);
  const [topicPickerOpen, setTopicPickerOpen] = useState(false);
  const [title, sections] = topics[selectedTopic];
  const selectTopic = (topic: number) => { setSelectedTopic(topic); setTopicPickerOpen(false); };
  return <Dialog
    title="How To Play"
    onClose={onClose}
    className={`how-to-play-window how-to-play-window--${origin}`}
    bounds={bounds}
    menuMotion
    footer={<>
      <button type="button" onClick={() => setSelectedTopic((topic) => topic - 1)} disabled={selectedTopic === 0}>Previous</button>
      <button type="button" onClick={() => setSelectedTopic((topic) => topic + 1)} disabled={selectedTopic === topics.length - 1}>Next</button>
    </>}
  >
    <div className="how-to-play-window__topics"><span>Topic</span>
      <div className="how-to-play-window__topic-picker">
        <button type="button" className="how-to-play-window__topic-trigger" aria-haspopup="listbox" aria-expanded={topicPickerOpen} aria-controls="how-to-play-topic-options" onClick={() => setTopicPickerOpen((open) => !open)} onKeyDown={(event) => { if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return; event.preventDefault(); selectTopic(Math.max(0, Math.min(topics.length - 1, selectedTopic + (event.key === "ArrowDown" ? 1 : -1)))); }}><span>{selectedTopic + 1}. {title}</span><svg viewBox="0 0 12 8" aria-hidden="true"><path d="m1 1 5 5 5-5" /></svg></button>
        {topicPickerOpen && <div id="how-to-play-topic-options" className="how-to-play-window__topic-options" role="listbox" aria-label="Help topics">{topics.map(([topic], index) => <button key={topic} type="button" role="option" aria-selected={index === selectedTopic} onClick={() => selectTopic(index)}>{index + 1}. {topic}</button>)}</div>}
      </div>
    </div>
    <section id="how-to-play-topic" className="how-to-play-window__topic" aria-label={title}>
      <h3>{title}</h3>
      {sections.map(({ heading, content, warning }) => <section className="how-to-play-window__topic-section" key={heading ?? content}>{heading && <h4>{heading}</h4>}{content.split("\n\n").map((paragraph) => <p className="body_text" key={paragraph}>{paragraph}</p>)}{warning && <p className="how-to-play-window__warning"><strong>{warning}</strong></p>}</section>)}
    </section>
  </Dialog>;
}
