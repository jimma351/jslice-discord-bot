import os
import discord
from discord import app_commands
from discord.ext import commands
from openai import OpenAI
import gspread
from google.oauth2.service_account import Credentials

TOKEN = os.getenv("DISCORD_TOKEN")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

client_ai = OpenAI(api_key=OPENAI_API_KEY)

intents = discord.Intents.default()
bot = commands.Bot(command_prefix="!", intents=intents)

# Simple per-user memory for follow-up questions
user_memory = {}

# Role allowed to edit inventory
ALLOWED_ROLE = "FK"

# =========================
# GOOGLE SHEETS SETUP
# =========================
SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive"
]

CREDS_FILE = "service_account.json"
SHEET_NAME = "Forgotten Kings Inventory"
WORKSHEET_NAME = "BotInventory"

creds = Credentials.from_service_account_file(CREDS_FILE, scopes=SCOPES)
gc = gspread.authorize(creds)
sheet = gc.open(SHEET_NAME)
inventory_ws = sheet.worksheet(WORKSHEET_NAME)

# =========================
# DATA
# =========================
crafting_data = {
    "Pistols": {
        "Combat Pistol": "5,000 Dirty Money\n2 Pistol Barrels\n1 Pistol Lower\n1 Pistol Upper",
        "Heavy Pistol": "5,000 Dirty Money\n2 Pistol Barrels\n3 Pistol Lower\n2 Pistol Upper",
        "SNS Pistol": "5,000 Dirty Money\n1 Pistol Barrels\n1 Pistol Lower\n1 Pistol Upper",
        "Vintage Pistol": "5,000 Dirty Money\n3 Pistol Barrels\n3 Pistol Lower\n3 Pistol Upper",
        "Pistol Ammo": "1 Bullet\n1 Casing\n1 Gun Powder",
    },
    "Rifles": {
        "Assault Rifle": "15,000 Dirty Money\n2 Rifle Barrels\n2 Rifle Lowers\n1 Rifle Stock\n2 Rifle Uppers",
        "Bullpup Rifle": "15,000 Dirty Money\n1 Rifle Barrel\n2 Rifle Lowers\n1 Rifle Stock\n2 Rifle Uppers",
        "Compact Rifle": "15,000 Dirty Money\n1 Rifle Barrel\n1 Rifle Lower\n1 Rifle Stock1\n1 Rifle Upper",
        "Military Rifle": "15,000 Dirty Money\n1 Rifle Barrel\n3 Rifle Lowers\n2 Rifle Stocks\n3 Rifle Uppers",
        "Rifle Ammo": "1 Bullet\n1 Casing\n1 Gun Powder",
    },
    "SMGs": {
        "Combat Pdw": "12,000 Dirty Money\n2 Rifle Barrels\n2 Rifle Lowers\n2 Rifle Stocks\n2 Rifle Uppers",
        "Micro Smg": "12,000 Dirty Money\n1 Rifle Barrel\n1 Rifle Lower\n1 Rifle Stock\n1 Rifle Upper",
        "Mini Smg": "12,000 Dirty Money\n1 Rifle Barrel\n1 Rifle Lower\n1 Rifle Stock\n1 Rifle Upper",
        "Mk2 Smg": "12,000 Dirty Money\n1 Rifle Barrel\n1 Rifle Lower\n1 Rifle Stock\n1 Rifle Upper",
        "Smg Ammo": "1 Bullet\n1 Casing\n1 Gun Powder",
    },
    "Shotguns": {
        "Bullpup": "10,000 Dirty Money\n1 Shotgun Barrel\n2 Shotgun Reciever\n1 Shotgun Shock",
        "Mk2 Pump": "10,000 Dirty Money\n2 Shotgun Barrels\n2 Shotgun Recievers\n2 Shotgun Stocks",
        "Pump": "10,000 Dirty Money\n1 Shotgun Barrel\n1 Shotgun Reciever\n1 Shotgun Shock",
        "Shotgun Ammo": "1 Bullet\n1 Casing\n1 Gun Powder",
    },
    "LMGs": {
        "Combat Mg": "15,000 Dirty Money\n2 Rifle Barrel\n2 Rifle Lowers\n1 Rifle Stock\n2 Rifle Uppers",
        "Combat Mg Mk2": "15,000 Dirty Money\n2 Rifle Barrels\n3 Rifle Lowers\n1 Rifle Stock\n3 Rifle Uppers",
        "Gusenberg Sweeper": "15,000 Dirty Money\n1 Rifle Barrel\n3 Rifle Lowers\n1 Rifle Stock\n3 Rifle Uppers",
        "Lmg Ammo": "1 Bullet\n1 Casing\n1 Gun Powder",
    },
    "Chemicals": {
        "Aluminum Oxide": "10 Aluminum\n500 Dirty Money\n10 Plastic",
        "Blowtorch": "10 Aluminum\n500 Dirty Money\n10 Metal Scrap",
        "Gun Powder": "500 Dirty Money\n10 Carbon\n10 Potassium Nitrate\n10 Sulfur",
        "Iron Oxide": "500 Dirty Money\n20 Plastic\n10 Rusted Iron",
        "Sticky Bomb": "500 Dirty Money\n3 Electronic Kits\n10 Iron Powder\n10 Metal Scrap\n10 Plastic",
        "Thermite": "500 Dirty Money\n3 Electronic Kits\n10 Metal Scrap\n10 Plastic",
    },
    "Melee": {
        "Bat": "10 Aluminum\n2 Rubber",
        "Battle Axe": "20 Steel\n5 Plastic\n10 Metal Scrap",
        "Crow Bar": "10 Steel\n4 Plastic",
        "Dick Bat": "20 Steel\n20 Rubber\n10 Plastic",
        "Hatchet": "20 Steel\n4 Plastic\n4 Metal Scrap",
        "Knife": "10 Steel",
        "Matchette": "10 Steel\n4 Plastic",
        "Switchblade": "12 Steel",
    },
    "Components": {
        "Pistol Barrel": "4 Caliper\n4 Lathe Bits\n4 Steel Block",
        "Pistol Lower": "2 Alumininum Block\n2 Caliper\n5 Milling Bit\n5 Screw\n2 Triggers",
        "Pistol Upper": "4 Alumininum Block\n4 Caliper\n4 Milling Bit\n5 Screw\n4 Spring",
        "Rifle Barrel": "4 Caliper\n4 Lathe Bits\n4 Steel Block",
        "Rifle Lower": "2 Alumininum Block\n2 Caliper\n5 Milling Bit\n5 Screw\n2 Triggers",
        "Rifle Stock": "4 Caliper\n4 Milling Bits\n4 Plastic Block",
        "Rifle Upper": "4 Alumininum Block\n4 Caliper\n4 Milling Bit\n5 Screw\n4 Spring",
        "Shotgun Barrel": "4 Caliper\n4 Lathe Bits\n4 Steel Block",
        "Shotgun Receiver": "4 Aluminum Block\n4 Caliper\n4 Milling Bit\n4 Screw\n5 Trigger",
        "Shotgun Stock": "4 Caliper\n4 Milling Bits\n4 Plastic Block",
    }
}

locations = {
    "electronics bench": "images/gta_loco.png",
    "map": "images/gta_loco.png"
}

# =========================
# HELPERS
# =========================
def build_guide_context() -> str:
    lines = ["GTA crafting and location guide:"]
    for category, items in crafting_data.items():
        lines.append(f"\n[{category}]")
        for item_name, recipe in items.items():
            lines.append(f"- {item_name}: {recipe}")
    lines.append("\n[Locations]")
    for place in locations.keys():
        lines.append(f"- {place}")
    return "\n".join(lines)

def has_fk_role(member: discord.Member) -> bool:
    return any(role.name == ALLOWED_ROLE for role in member.roles)

def find_item_row(item_name: str):
    records = inventory_ws.get_all_values()
    search = item_name.strip().lower()

    for idx, row in enumerate(records[1:], start=2):
        if len(row) >= 2 and row[0].strip().lower() == search:
            return idx, row
    return None, None

# =========================
# VIEWS
# =========================
class ItemSelect(discord.ui.Select):
    def __init__(self, category_name: str):
        self.category_name = category_name
        options = [
            discord.SelectOption(label=item, value=item)
            for item in crafting_data[category_name].keys()
        ]

        super().__init__(
            placeholder=f"Choose a {category_name[:-1] if category_name.endswith('s') else category_name} item",
            min_values=1,
            max_values=1,
            options=options
        )

    async def callback(self, interaction: discord.Interaction):
        item_name = self.values[0]
        recipe = crafting_data[self.category_name][item_name]

        embed = discord.Embed(
            title=f"🔧 {item_name}",
            description=recipe,
            color=discord.Color.blue()
        )
        embed.set_footer(text=f"Category: {self.category_name}")

        await interaction.response.send_message(embed=embed, ephemeral=False)

class ItemView(discord.ui.View):
    def __init__(self, category_name: str):
        super().__init__(timeout=120)
        self.add_item(ItemSelect(category_name))

class CategorySelect(discord.ui.Select):
    def __init__(self):
        options = [
            discord.SelectOption(label=category, value=category)
            for category in crafting_data.keys()
        ]

        super().__init__(
            placeholder="Choose a crafting category",
            min_values=1,
            max_values=1,
            options=options
        )

    async def callback(self, interaction: discord.Interaction):
        category_name = self.values[0]
        view = ItemView(category_name)

        await interaction.response.send_message(
            f"Select an item from **{category_name}**:",
            view=view,
            ephemeral=False
        )

class CategoryView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=120)
        self.add_item(CategorySelect())

# =========================
# EVENTS
# =========================
@bot.event
async def on_ready():
    await bot.tree.sync()
    print(f"Logged in as {bot.user}")

# =========================
# COMMANDS
# =========================
@bot.tree.command(name="gta", description="Open the GTA crafting menu")
async def gta(interaction: discord.Interaction):
    view = CategoryView()
    await interaction.response.send_message(
        "Choose a crafting category:",
        view=view,
        ephemeral=False
    )

@bot.tree.command(name="inventoryall", description="Show full inventory list")
async def inventoryall(interaction: discord.Interaction):
    await interaction.response.defer()

    try:
        records = inventory_ws.get_all_values()

        if len(records) <= 1:
            await interaction.followup.send("Inventory is empty, kid.")
            return

        items = records[1:]
        lines = []

        for row in items:
            name = row[0] if len(row) > 0 else "Unknown"
            qty = row[1] if len(row) > 1 else "0"
            lines.append(f"• {name} — {qty}")

        output = "\n".join(lines)

        if len(output) > 1900:
            output = output[:1900] + "\n... (too many items)"

        embed = discord.Embed(
            title="📦 Full Inventory",
            description=output,
            color=discord.Color.gold()
        )

        await interaction.followup.send(embed=embed)

    except Exception as e:
        await interaction.followup.send(f"Inventory error: {e}")

@bot.tree.command(name="inventory", description="Check item quantity")
@app_commands.describe(item="Item name")
async def inventory(interaction: discord.Interaction, item: str):
    await interaction.response.defer()

    try:
        row_num, row = find_item_row(item)

        if not row:
            await interaction.followup.send("Item not found, guy.")
            return

        qty = row[1] if len(row) > 1 else "0"

        await interaction.followup.send(f"📦 {row[0]}: {qty}")

    except Exception as e:
        await interaction.followup.send(f"Inventory error: {e}")

@bot.tree.command(name="additem", description="Add items to inventory")
@app_commands.describe(item="Item name", amount="Amount to add")
async def additem(interaction: discord.Interaction, item: str, amount: int):
    await interaction.response.defer()

    if not has_fk_role(interaction.user):
        await interaction.followup.send("You ain't FK, kid. No touching inventory.")
        return

    if amount <= 0:
        await interaction.followup.send("Use a number bigger than 0.")
        return

    try:
        row_num, row = find_item_row(item)

        if not row:
            inventory_ws.append_row([item, amount])
            await interaction.followup.send(f"🆕 Added new item **{item}** ({amount})")
            return

        current = int(row[1]) if len(row) > 1 and row[1].isdigit() else 0
        new_total = current + amount

        inventory_ws.update_cell(row_num, 2, new_total)

        await interaction.followup.send(
            f"➕ Added {amount} to **{row[0]}** (Now: {new_total})"
        )

    except Exception as e:
        await interaction.followup.send(f"Inventory error: {e}")

@bot.tree.command(name="removeitem", description="Remove items from inventory")
@app_commands.describe(item="Item name", amount="Amount to remove")
async def removeitem(interaction: discord.Interaction, item: str, amount: int):
    await interaction.response.defer()

    if not has_fk_role(interaction.user):
        await interaction.followup.send("You ain't FK, kid. No touching inventory.")
        return

    if amount <= 0:
        await interaction.followup.send("Use a number bigger than 0.")
        return

    try:
        row_num, row = find_item_row(item)

        if not row:
            await interaction.followup.send("Item not found.")
            return

        current = int(row[1]) if len(row) > 1 and row[1].isdigit() else 0
        new_total = max(0, current - amount)

        inventory_ws.update_cell(row_num, 2, new_total)

        await interaction.followup.send(
            f"➖ Removed {amount} from **{row[0]}** (Now: {new_total})"
        )

    except Exception as e:
        await interaction.followup.send(f"Inventory error: {e}")

@bot.tree.command(name="location", description="Show server map location")
@app_commands.describe(place="Location to show")
async def location(interaction: discord.Interaction, place: str):
    place = place.lower().strip()

    if place in locations:
        file = discord.File(locations[place], filename="map.png")
        embed = discord.Embed(
            title=f"📍 {place.title()} Location",
            color=discord.Color.green()
        )
        embed.set_image(url="attachment://map.png")
        await interaction.response.send_message(embed=embed, file=file)
    else:
        await interaction.response.send_message("Location not found.")

@bot.tree.command(name="ask", description="Ask the bot anything")
@app_commands.describe(question="Ask a question about the server, crafting, or locations")
async def ask(interaction: discord.Interaction, question: str):
    await interaction.response.defer()

    if not OPENAI_API_KEY:
        await interaction.followup.send("OPENAI_API_KEY is not set in Railway Variables.")
        return

    guide_context = build_guide_context()
    user_id = str(interaction.user.id)

    if user_id not in user_memory:
        user_memory[user_id] = []

    user_memory[user_id].append({
        "role": "user",
        "content": question
    })

    user_memory[user_id] = user_memory[user_id][-6:]

    system_prompt = (
        "You are JSlice Crafting Guide, an in-character GTA RP server assistant with a Rhode Island attitude. "
        "You are street-smart, sarcastic, and confident. You speak like a local who knows the city and the hustle. "
        "You are helpful first, but you do not act like customer support.\n\n"

        "Personality rules:\n"
        "- Keep answers clear and useful.\n"
        "- Use light Rhode Island flavor like kid, guy, c'mon now.\n"
        "- Sound natural, not robotic.\n"
        "- Do not overdo slang.\n\n"

        "Behavior rules:\n"
        "- Answer crafting questions directly.\n"
        "- Answer location questions like a local.\n"
        "- Use the provided guide when relevant.\n"
        "- If info is not in the guide, say so and then give a general answer.\n\n"

        "Toxic users:\n"
        "- If the user is rude, respond with a short sarcastic clapback.\n"
        "- Do not use slurs, threats, or extreme harassment.\n"
        "- Stay in control.\n\n"

        "Examples:\n"
        "- Yeah yeah, ask it right and I'll help you.\n"
        "- You good or you just talkin'?\n"
        "- Don't make it harder than it needs to be."
    )

    try:
        response = client_ai.responses.create(
            model="gpt-5.4-mini",
            input=[
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "system",
                    "content": (
                        f"Here is the server crafting and location guide:\n\n{guide_context}\n\n"
                        "Use this guide when relevant."
                    )
                },
                *user_memory[user_id]
            ]
        )

        answer = response.output_text.strip()

        if not answer:
            answer = "I couldn't generate an answer."

        user_memory[user_id].append({
            "role": "assistant",
            "content": answer
        })

        user_memory[user_id] = user_memory[user_id][-6:]

        if len(answer) > 1900:
            answer = answer[:1900] + "..."

        await interaction.followup.send(answer)

    except Exception as e:
        await interaction.followup.send(f"AI error: {e}")

bot.run(TOKEN)
